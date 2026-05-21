import type { AppSettings } from './AppSettings';
import type { Annotation } from './Annotation';
import type { Project, RecentProject, SessionMetadata } from './Project';
import type { RecordedStep, StepFlag } from './Step';

/** All IPC channel names — single source of truth. */
export const IPC = {
  // Window controls
  WindowMinimize: 'window:minimize',
  WindowMaximize: 'window:maximize',
  WindowClose: 'window:close',

  // Recording lifecycle
  RecordingStart: 'recording:start',
  RecordingPause: 'recording:pause',
  RecordingResume: 'recording:resume',
  RecordingStop: 'recording:stop',
  RecordingCancel: 'recording:cancel',
  RecordingStateChanged: 'recording:stateChanged',

  // Project
  ProjectOpen: 'project:open',
  ProjectSave: 'project:save',
  ProjectCreate: 'project:create',
  ProjectOpenRecent: 'project:openRecent',
  ProjectDeleteRecent: 'project:deleteRecent',
  ProjectUpdateMetadata: 'project:updateMetadata',
  ProjectListRecent: 'project:listRecent',
  ProjectChanged: 'project:changed',

  // Steps
  StepUpdate: 'step:update',
  StepReorder: 'step:reorder',
  StepDuplicate: 'step:duplicate',
  StepDelete: 'step:delete',
  StepAddManual: 'step:addManual',
  StepAddScreenshot: 'step:addScreenshot',
  StepToggleFlag: 'step:toggleFlag',
  StepSetAnnotations: 'step:setAnnotations',
  StepAdded: 'step:added',

  // Export
  ExportRun: 'export:run',
  ExportPrint: 'export:print',
  ExportProgress: 'export:progress',

  // Settings
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
  SettingsChanged: 'settings:changed',

  // Dialogs
  AppOpenFileDialog: 'app:openFileDialog',
  AppOpenSaveDialog: 'app:openSaveDialog',
  AppOpenPath: 'app:openPath',
  AppShowItemInFolder: 'app:showItemInFolder',
  AppOpenExternal: 'app:openExternal',
  AppInfo: 'app:info',

  // Diagnostics
  DiagnosticsList: 'diagnostics:list',
  DiagnosticsChanged: 'diagnostics:changed',

  // HUD
  HudShow: 'hud:show',
  HudHide: 'hud:hide',
  HudUpdateTimer: 'hud:updateTimer',
  HudUpdateStepCount: 'hud:updateStepCount',
  HudUpdateState: 'hud:updateState',

  // Capture toast (main → renderer)
  CaptureToast: 'capture:capturedToast',

  // Recovery
  RecoveryCheck: 'recovery:check',
  RecoveryRestore: 'recovery:restore',
  RecoveryDismiss: 'recovery:dismiss',

  // Auto-update
  UpdateCheck: 'update:check',
  UpdateDownload: 'update:download',
  UpdateInstall: 'update:install',
  UpdateStatus: 'update:status',

  // App utility
  AppPing: 'app:ping'
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];

// ── Payload types ─────────────────────────────────────────

export type ExportFormat = 'HtmlFull' | 'HtmlCompact' | 'Markdown' | 'Pdf' | 'Docx';

export interface ExportOptions {
  format: ExportFormat;
  outputPath: string;
  includeScreenshots: boolean;
  includeTimestamps: boolean;
  includeMetadata: boolean;
  includeNotes: boolean;
  includeCompanyBranding: boolean;
  embedImagesAsBase64: boolean;
  maxImageWidth: number;
  includeDeletedSteps: boolean;
}

export const defaultExportOptions: ExportOptions = {
  format: 'HtmlFull',
  outputPath: '',
  includeScreenshots: true,
  includeTimestamps: true,
  includeMetadata: true,
  includeNotes: true,
  includeCompanyBranding: true,
  embedImagesAsBase64: true,
  maxImageWidth: 1200,
  includeDeletedSteps: false
};

export interface ExportResult {
  outputPath: string;
  sizeBytes: number;
}

export interface ExportProgress {
  phase: 'starting' | 'rendering' | 'writing' | 'done';
  percent: number;
  message?: string;
}

export interface CaptureToastPayload {
  stepNumber: number;
  description: string;
}

export interface RecoveryInfo {
  sessionId: string;
  sessionDirectory: string;
  steps: number;
  startedAt: string;
}

export type UpdateStatus =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'not-available' }
  | { status: 'available'; version: string; releaseNotes?: string }
  | { status: 'downloading'; percent: number; bytesPerSecond: number }
  | { status: 'downloaded'; version: string }
  | { status: 'installing' }
  | { status: 'error'; message: string };

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  arch: string;
  releaseNotesUrl: string;
}

export interface StepUpdatePayload {
  id: string;
  patch: Partial<RecordedStep>;
}

export interface StepAddScreenshotPayload {
  sourcePath?: string;
  imageBytes?: ArrayBuffer;
  description?: string;
}

export interface StepReorderPayload {
  id: string;
  direction: 'up' | 'down';
}

export interface StepToggleFlagPayload {
  id: string;
  flag: StepFlag;
}

export interface StepSetAnnotationsPayload {
  id: string;
  annotations: Annotation[];
}

export interface ProjectUpdateMetadataPayload {
  patch: Partial<SessionMetadata>;
}

export interface ProjectCreatePayload {
  title: string;
  jiraKey?: string;
}

export type DiagnosticLevel = 'info' | 'warning' | 'error';

export interface DiagnosticEntry {
  id: string;
  timestamp: string;
  level: DiagnosticLevel;
  source: string;
  message: string;
  detail?: string;
}

/** Shape of the typed bridge exposed on window.stepForge in the editor renderer. */
export interface StepForgeBridge {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  recording: {
    start: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    stop: () => Promise<void>;
    cancel: () => Promise<void>;
    onStateChanged: (cb: (state: import('./Project').RecordingState) => void) => () => void;
  };
  project: {
    open: () => Promise<Project | null>;
    save: () => Promise<void>;
    create: (payload: string | ProjectCreatePayload) => Promise<Project>;
    openRecent: (sessionDirectory: string) => Promise<Project>;
    deleteRecent: (sessionDirectory: string) => Promise<void>;
    updateMetadata: (payload: ProjectUpdateMetadataPayload) => Promise<void>;
    listRecent: () => Promise<RecentProject[]>;
    onChanged: (cb: (project: Project) => void) => () => void;
  };
  step: {
    update: (payload: StepUpdatePayload) => Promise<void>;
    reorder: (payload: StepReorderPayload) => Promise<void>;
    duplicate: (id: string) => Promise<void>;
    delete: (id: string) => Promise<void>;
    addManual: () => Promise<void>;
    addScreenshot: (payload: StepAddScreenshotPayload) => Promise<void>;
    toggleFlag: (payload: StepToggleFlagPayload) => Promise<void>;
    setAnnotations: (payload: StepSetAnnotationsPayload) => Promise<void>;
    onAdded: (cb: (step: RecordedStep) => void) => () => void;
  };
  export: {
    run: (options: ExportOptions) => Promise<ExportResult>;
    print: () => Promise<void>;
    onProgress: (cb: (progress: ExportProgress) => void) => () => void;
  };
  settings: {
    get: () => Promise<AppSettings>;
    set: (patch: Partial<AppSettings>) => Promise<AppSettings>;
    onChanged: (cb: (settings: AppSettings) => void) => () => void;
  };
  dialog: {
    openFile: (opts?: {
      filters?: { name: string; extensions: string[] }[];
      properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'createDirectory'>;
    }) => Promise<string | null>;
    openSave: (opts?: {
      defaultPath?: string;
      filters?: { name: string; extensions: string[] }[];
    }) => Promise<string | null>;
  };
  app: {
    openPath: (path: string) => Promise<string>;
    showItemInFolder: (path: string) => void;
    openExternal: (url: string) => Promise<void>;
    info: () => Promise<AppInfo>;
  };
  diagnostics: {
    list: () => Promise<DiagnosticEntry[]>;
    onChanged: (cb: (entries: DiagnosticEntry[]) => void) => () => void;
  };
  recovery: {
    check: () => Promise<RecoveryInfo | null>;
    restore: () => Promise<Project>;
    dismiss: () => Promise<void>;
  };
  update: {
    check: () => Promise<void>;
    download: () => Promise<void>;
    install: () => Promise<void>;
    onStatus: (cb: (status: UpdateStatus) => void) => () => void;
  };
  capture: {
    onToast: (cb: (payload: CaptureToastPayload) => void) => () => void;
  };
}
