import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC, type UpdateStatus } from '@shared/models/Ipc';
import { diagnostics } from '../services/diagnostics/DiagnosticsStore';

export class AutoUpdaterBridge {
  private interval: NodeJS.Timeout | null = null;
  private installResetTimer: NodeJS.Timeout | null = null;
  private checking = false;
  private downloading = false;

  private pendingInstall = false;

  constructor(
    private editorProvider: () => BrowserWindow | null,
    private prepareForInstall: () => Promise<void> | void = () => undefined,
    private isBusy: () => boolean = () => false
  ) {
    autoUpdater.autoDownload = false;
    autoUpdater.logger = null;
  }

  start(): void {
    autoUpdater.on('checking-for-update', () => this.send({ status: 'checking' }));
    autoUpdater.on('update-available', (info) => {
      this.send({ status: 'available', version: info.version, releaseNotes: String(info.releaseNotes ?? '') });
      void this.download();
    });
    autoUpdater.on('update-not-available', () => this.send({ status: 'not-available' }));
    autoUpdater.on('download-progress', (progress) => this.send({ status: 'downloading', percent: progress.percent, bytesPerSecond: progress.bytesPerSecond }));
    autoUpdater.on('update-downloaded', (info) => {
      this.send({ status: 'downloaded', version: info.version });
      this.pendingInstall = true;
      this.tryAutoInstall();
    });
    autoUpdater.on('error', (error) => this.handleError(error));
    const updaterEvents = autoUpdater as unknown as { on: (eventName: 'before-quit-for-update', listener: () => void) => void };
    updaterEvents.on('before-quit-for-update', () => {
      this.clearInstallResetTimer();
      diagnostics.record('info', 'updater', 'Quitting StepForge to install update.');
      void this.prepareForInstall();
    });
    void this.check();
    // Poll more often so an already-open app picks up new releases quickly.
    this.interval = setInterval(() => void this.check(), 10 * 60 * 1000);
  }

  /** Try to silently install a pending downloaded update if the app is idle. */
  tryAutoInstall(): void {
    if (!this.pendingInstall) return;
    if (this.isBusy()) return;
    this.pendingInstall = false;
    void this.install();
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async check(): Promise<void> {
    if (this.checking || this.downloading) return;
    if (!app.isPackaged) {
      this.send({ status: 'not-available' });
      return;
    }
    this.checking = true;
    this.send({ status: 'checking' });
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      this.handleError(toError(error));
    } finally {
      this.checking = false;
    }
  }

  async download(): Promise<void> {
    if (this.downloading) return;
    this.downloading = true;
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      this.handleError(toError(error));
    } finally {
      this.downloading = false;
    }
  }

  async install(): Promise<void> {
    if (!app.isPackaged) {
      this.send({ status: 'not-available' });
      return;
    }
    this.send({ status: 'installing' });
    diagnostics.record('info', 'updater', 'Preparing to install downloaded update.');
    try {
      this.clearInstallResetTimer();
      this.installResetTimer = setTimeout(() => {
        diagnostics.record('warning', 'updater', 'Update installer did not start before the timeout.');
        this.installResetTimer = null;
        this.send({ status: 'error', message: 'The update installer did not start. You can keep working and retry the update.' });
      }, 25000);
      this.installResetTimer.unref?.();
      setImmediate(() => autoUpdater.quitAndInstall(true, true));
    } catch (error) {
      this.clearInstallResetTimer();
      this.handleError(toError(error));
    }
  }

  private send(status: UpdateStatus): void {
    const editor = this.editorProvider();
    if (!editor || editor.isDestroyed() || editor.webContents.isDestroyed()) return;
    editor.webContents.send(IPC.UpdateStatus, status);
  }

  private handleError(error: Error): void {
    this.clearInstallResetTimer();
    this.checking = false;
    this.downloading = false;
    if (isNoPublishedUpdateError(error)) {
      this.send({ status: 'not-available' });
      return;
    }
    this.send({ status: 'error', message: error.message });
  }

  private clearInstallResetTimer(): void {
    if (!this.installResetTimer) return;
    clearTimeout(this.installResetTimer);
    this.installResetTimer = null;
  }
}

function isNoPublishedUpdateError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('404') ||
    message.includes('latest.yml') ||
    message.includes('latest-mac.yml') ||
    message.includes('no published versions') ||
    message.includes('cannot find')
  );
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}