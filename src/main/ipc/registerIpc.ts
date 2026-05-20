import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell
} from 'electron';
import { join } from 'node:path';
import { stat } from 'node:fs/promises';
import {
  IPC,
  type DiagnosticEntry,
  type ExportOptions,
  type ExportResult,
  type ProjectCreatePayload,
  type ProjectUpdateMetadataPayload,
  type RecoveryInfo,
  type StepReorderPayload,
  type StepSetAnnotationsPayload,
  type StepToggleFlagPayload,
  type StepUpdatePayload
} from '@shared/models/Ipc';
import type { AppSettings } from '@shared/models/AppSettings';
import type { Project, RecentProject } from '@shared/models/Project';
import type { SettingsStore } from '../services/settings/SettingsStore';
import type { SessionStorage } from '../services/storage/SessionStorage';
import type { RecordingEngine } from '../services/engine/RecordingEngine';
import type { ExportService } from '../services/export/ExportService';
import type { AutoUpdaterBridge } from '../updater/AutoUpdater';
import { diagnostics } from '../services/diagnostics/DiagnosticsStore';

interface IpcContext {
  getEditorWindow: () => BrowserWindow | null;
  settings: SettingsStore;
  storage: SessionStorage;
  engine: RecordingEngine;
  exporter: ExportService;
  updater: AutoUpdaterBridge;
}

export function registerIpc(context: IpcContext): void {
  const getEditorWindow = context.getEditorWindow;

  // ── Window controls ─────────────────────────────────────
  ipcMain.on(IPC.WindowMinimize, () => getEditorWindow()?.minimize());
  ipcMain.on(IPC.WindowMaximize, () => {
    const w = getEditorWindow();
    if (!w) return;
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
  });
  ipcMain.on(IPC.WindowClose, () => app.quit());

  ipcMain.handle(IPC.RecordingStart, async () => {
    await context.engine.start();
  });
  ipcMain.handle(IPC.RecordingPause, async () => {
    await context.engine.pause();
  });
  ipcMain.handle(IPC.RecordingResume, async () => {
    await context.engine.resume();
  });
  ipcMain.handle(IPC.RecordingStop, async () => {
    await context.engine.stop();
  });
  ipcMain.handle(IPC.RecordingCancel, async () => {
    await context.engine.cancel();
  });

  ipcMain.handle(IPC.ProjectOpen, async (): Promise<Project | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Open StepForge session',
      properties: ['openFile'],
      filters: [{ name: 'StepForge session', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths[0]) return null;
    const project = await context.storage.loadProject(join(result.filePaths[0], '..'));
    context.engine.setProject(project);
    return project;
  });
  ipcMain.handle(IPC.ProjectSave, async () => {
    await context.engine.save();
  });
  ipcMain.handle(IPC.ProjectCreate, async (_, payload: string | ProjectCreatePayload): Promise<Project> => {
    const project = await context.storage.createProject(payload);
    context.engine.setProject(project);
    return project;
  });
  ipcMain.handle(IPC.ProjectOpenRecent, async (_, sessionDirectory: string): Promise<Project> => {
    const project = await context.storage.loadProject(sessionDirectory);
    context.engine.setProject(project);
    return project;
  });
  ipcMain.handle(IPC.ProjectUpdateMetadata, async (_, payload: ProjectUpdateMetadataPayload) => {
    await context.engine.updateMetadata(payload.patch);
  });
  ipcMain.handle(IPC.ProjectListRecent, async (): Promise<RecentProject[]> => {
    return context.storage.listRecent(8);
  });

  ipcMain.handle(IPC.StepUpdate, async (_, payload: StepUpdatePayload) => context.engine.updateStep(payload.id, payload.patch));
  ipcMain.handle(IPC.StepReorder, async (_, payload: StepReorderPayload) => context.engine.reorderStep(payload.id, payload.direction));
  ipcMain.handle(IPC.StepDuplicate, async (_, id: string) => context.engine.duplicateStep(id));
  ipcMain.handle(IPC.StepDelete, async (_, id: string) => context.engine.deleteStep(id));
  ipcMain.handle(IPC.StepAddManual, async () => context.engine.addManualStep());
  ipcMain.handle(IPC.StepToggleFlag, async (_, payload: StepToggleFlagPayload) => context.engine.toggleFlag(payload.id, payload.flag));
  ipcMain.handle(
    IPC.StepSetAnnotations,
    async (_, payload: StepSetAnnotationsPayload) => context.engine.setAnnotations(payload.id, payload.annotations)
  );

  ipcMain.handle(IPC.ExportRun, async (_, options: ExportOptions): Promise<ExportResult> => {
    const project = context.engine.project;
    if (!project) throw new Error('No active project to export');
    const result = await context.exporter.run(project, options);
    getEditorWindow()?.webContents.send(IPC.ExportProgress, { phase: 'done', percent: 100 });
    return result;
  });
  ipcMain.handle(IPC.ExportPrint, async () => {});

  // ── Settings ────────────────────────────────────────────
  ipcMain.handle(IPC.SettingsGet, async () => context.settings.load());
  ipcMain.handle(IPC.SettingsSet, async (_, patch: Partial<AppSettings>) => {
    const next = await context.settings.patch(patch);
    const w = getEditorWindow();
    w?.webContents.send(IPC.SettingsChanged, next);
    return next;
  });

  // ── Dialogs ─────────────────────────────────────────────
  ipcMain.handle(
    IPC.AppOpenFileDialog,
    async (
      _,
      opts?: {
        filters?: Electron.FileFilter[];
        properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'createDirectory'>;
      }
    ) => {
      const r = await dialog.showOpenDialog({
        properties: opts?.properties ?? ['openFile'],
        filters: opts?.filters
      });
      return r.canceled ? null : r.filePaths[0];
    }
  );
  ipcMain.handle(
    IPC.AppOpenSaveDialog,
    async (_, opts?: { defaultPath?: string; filters?: Electron.FileFilter[] }) => {
      const r = await dialog.showSaveDialog({
        defaultPath: opts?.defaultPath,
        filters: opts?.filters
      });
      return r.canceled ? null : r.filePath ?? null;
    }
  );
  ipcMain.handle(IPC.AppOpenPath, async (_, path: string) => shell.openPath(path));
  ipcMain.on(IPC.AppShowItemInFolder, (_, path: string) => shell.showItemInFolder(path));

  // ── Diagnostics ────────────────────────────────────────
  ipcMain.handle(IPC.DiagnosticsList, async (): Promise<DiagnosticEntry[]> => diagnostics.list());
  diagnostics.on('changed', (entries) => getEditorWindow()?.webContents.send(IPC.DiagnosticsChanged, entries));

  ipcMain.handle(IPC.RecoveryCheck, async (): Promise<RecoveryInfo | null> => {
    const project = await context.storage.findRecoverableSession();
    if (!project) return null;
    return {
      sessionId: project.sessionId,
      sessionDirectory: project.sessionDirectory,
      steps: project.steps.length,
      startedAt: project.metadata.startedAt
    };
  });
  ipcMain.handle(IPC.RecoveryRestore, async (): Promise<Project> => {
    const project = await context.storage.findRecoverableSession();
    if (!project) throw new Error('No recoverable session found');
    const restored = { ...project, isRecovered: true };
    context.engine.setProject(restored);
    return restored;
  });
  ipcMain.handle(IPC.RecoveryDismiss, async () => context.storage.dismissRecovery());

  ipcMain.handle(IPC.UpdateCheck, async () => context.updater.check());
  ipcMain.handle(IPC.UpdateDownload, async () => context.updater.download());
  ipcMain.on(IPC.UpdateInstall, () => context.updater.install());

  // ── App ─────────────────────────────────────────────────
  ipcMain.handle(IPC.AppPing, async () => 'pong');

  void stat;
}
