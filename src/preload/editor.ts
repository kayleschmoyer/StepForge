import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type StepForgeBridge } from '@shared/models/Ipc';

type Unsubscribe = () => void;

function subscribe<T>(channel: string, cb: (payload: T) => void): Unsubscribe {
  const listener = (_: Electron.IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const api: StepForgeBridge = {
  window: {
    minimize: () => ipcRenderer.send(IPC.WindowMinimize),
    maximize: () => ipcRenderer.send(IPC.WindowMaximize),
    close: () => ipcRenderer.send(IPC.WindowClose)
  },
  recording: {
    start: () => ipcRenderer.invoke(IPC.RecordingStart),
    pause: () => ipcRenderer.invoke(IPC.RecordingPause),
    resume: () => ipcRenderer.invoke(IPC.RecordingResume),
    stop: () => ipcRenderer.invoke(IPC.RecordingStop),
    cancel: () => ipcRenderer.invoke(IPC.RecordingCancel),
    onStateChanged: (cb) => subscribe(IPC.RecordingStateChanged, cb)
  },
  project: {
    open: () => ipcRenderer.invoke(IPC.ProjectOpen),
    save: () => ipcRenderer.invoke(IPC.ProjectSave),
    create: (payload) => ipcRenderer.invoke(IPC.ProjectCreate, payload),
    openRecent: (sessionDirectory) => ipcRenderer.invoke(IPC.ProjectOpenRecent, sessionDirectory),
    updateMetadata: (payload) => ipcRenderer.invoke(IPC.ProjectUpdateMetadata, payload),
    listRecent: () => ipcRenderer.invoke(IPC.ProjectListRecent),
    onChanged: (cb) => subscribe(IPC.ProjectChanged, cb)
  },
  step: {
    update: (payload) => ipcRenderer.invoke(IPC.StepUpdate, payload),
    reorder: (payload) => ipcRenderer.invoke(IPC.StepReorder, payload),
    duplicate: (id) => ipcRenderer.invoke(IPC.StepDuplicate, id),
    delete: (id) => ipcRenderer.invoke(IPC.StepDelete, id),
    addManual: () => ipcRenderer.invoke(IPC.StepAddManual),
    toggleFlag: (payload) => ipcRenderer.invoke(IPC.StepToggleFlag, payload),
    setAnnotations: (payload) => ipcRenderer.invoke(IPC.StepSetAnnotations, payload),
    onAdded: (cb) => subscribe(IPC.StepAdded, cb)
  },
  export: {
    run: (options) => ipcRenderer.invoke(IPC.ExportRun, options),
    print: () => ipcRenderer.invoke(IPC.ExportPrint),
    onProgress: (cb) => subscribe(IPC.ExportProgress, cb)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.SettingsGet),
    set: (patch) => ipcRenderer.invoke(IPC.SettingsSet, patch),
    onChanged: (cb) => subscribe(IPC.SettingsChanged, cb)
  },
  dialog: {
    openFile: (opts) => ipcRenderer.invoke(IPC.AppOpenFileDialog, opts),
    openSave: (opts) => ipcRenderer.invoke(IPC.AppOpenSaveDialog, opts)
  },
  app: {
    openPath: (path) => ipcRenderer.invoke(IPC.AppOpenPath, path),
    showItemInFolder: (path) => ipcRenderer.send(IPC.AppShowItemInFolder, path)
  },
  diagnostics: {
    list: () => ipcRenderer.invoke(IPC.DiagnosticsList),
    onChanged: (cb) => subscribe(IPC.DiagnosticsChanged, cb)
  },
  recovery: {
    check: () => ipcRenderer.invoke(IPC.RecoveryCheck),
    restore: () => ipcRenderer.invoke(IPC.RecoveryRestore),
    dismiss: () => ipcRenderer.invoke(IPC.RecoveryDismiss)
  },
  update: {
    check: () => ipcRenderer.invoke(IPC.UpdateCheck),
    download: () => ipcRenderer.invoke(IPC.UpdateDownload),
    install: () => ipcRenderer.invoke(IPC.UpdateInstall),
    onStatus: (cb) => subscribe(IPC.UpdateStatus, cb)
  },
  capture: {
    onToast: (cb) => subscribe(IPC.CaptureToast, cb)
  }
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('stepForge', api);
} else {
  // @ts-expect-error fallback when contextIsolation is off
  window.stepForge = api;
}
