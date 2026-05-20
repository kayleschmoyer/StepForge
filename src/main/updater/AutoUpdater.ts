import { app, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { IPC, type UpdateStatus } from '@shared/models/Ipc';
import { diagnostics } from '../services/diagnostics/DiagnosticsStore';

export class AutoUpdaterBridge {
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private editorProvider: () => BrowserWindow | null,
    private prepareForInstall: () => Promise<void> | void = () => undefined
  ) {
    autoUpdater.autoDownload = false;
    autoUpdater.logger = null;
  }

  start(): void {
    autoUpdater.on('checking-for-update', () => this.send({ status: 'checking' }));
    autoUpdater.on('update-available', (info) => this.send({ status: 'available', version: info.version, releaseNotes: String(info.releaseNotes ?? '') }));
    autoUpdater.on('update-not-available', () => this.send({ status: 'not-available' }));
    autoUpdater.on('download-progress', (progress) => this.send({ status: 'downloading', percent: progress.percent, bytesPerSecond: progress.bytesPerSecond }));
    autoUpdater.on('update-downloaded', (info) => this.send({ status: 'downloaded', version: info.version }));
    autoUpdater.on('error', (error) => this.handleError(error));
    const updaterEvents = autoUpdater as unknown as { on: (eventName: 'before-quit-for-update', listener: () => void) => void };
    updaterEvents.on('before-quit-for-update', () => diagnostics.record('info', 'updater', 'Quitting StepForge to install update.'));
    setTimeout(() => void this.check(), 5000);
    this.interval = setInterval(() => void this.check(), 4 * 60 * 60 * 1000);
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async check(): Promise<void> {
    if (!app.isPackaged) {
      this.send({ status: 'not-available' });
      return;
    }
    this.send({ status: 'checking' });
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      this.handleError(toError(error));
    }
  }

  async download(): Promise<void> {
    await autoUpdater.downloadUpdate();
  }

  async install(): Promise<void> {
    if (!app.isPackaged) {
      this.send({ status: 'not-available' });
      return;
    }
    this.send({ status: 'installing' });
    diagnostics.record('info', 'updater', 'Preparing to install downloaded update.');
    try {
      await this.prepareForInstall();
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
    } catch (error) {
      this.handleError(toError(error));
    }
  }

  private send(status: UpdateStatus): void {
    const editor = this.editorProvider();
    if (!editor || editor.isDestroyed() || editor.webContents.isDestroyed()) return;
    editor.webContents.send(IPC.UpdateStatus, status);
  }

  private handleError(error: Error): void {
    if (isNoPublishedUpdateError(error)) {
      this.send({ status: 'not-available' });
      return;
    }
    this.send({ status: 'error', message: error.message });
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