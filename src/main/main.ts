import { app, BrowserWindow, globalShortcut, Menu, MenuItem, shell } from 'electron';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { registerIpc } from './ipc/registerIpc';
import { createHudWindow, type HudHandle } from './windows/hudWindow';
import { SettingsStore } from './services/settings/SettingsStore';
import { SessionStorage } from './services/storage/SessionStorage';
import { ImageStorage } from './services/storage/ImageStorage';
import { CaptureService } from './services/capture/CaptureService';
import { ImageOps } from './services/capture/ImageOps';
import { WindowTracker } from './services/automation/WindowTracker';
import { InputHookService } from './services/hooks/InputHookService';
import { StepProcessor } from './services/engine/StepProcessor';
import { RecordingEngine } from './services/engine/RecordingEngine';
import { ExportService } from './services/export/ExportService';
import { TrayMenu } from './tray/trayMenu';
import { AutoUpdaterBridge } from './updater/AutoUpdater';
import { IPC } from '@shared/models/Ipc';
import type { Project } from '@shared/models/Project';
import type { RecordedStep } from '@shared/models/Step';

const isDev = !app.isPackaged;

let editorWindow: BrowserWindow | null = null;
let hudWindow: HudHandle | null = null;
let isQuitting = false;

const settings = new SettingsStore();
const storage = new SessionStorage(() => settings.load());
const imageStorage = new ImageStorage();
const captureService = new CaptureService();
const imageOps = new ImageOps();
const windowTracker = new WindowTracker();
const hooks = new InputHookService();
const processor = new StepProcessor(captureService, imageOps, imageStorage, windowTracker);
const engine = new RecordingEngine(storage, hooks, processor, () => settings.load(), () => editorWindow, stepForgeWindowBounds);
const exporter = new ExportService();
const updater = new AutoUpdaterBridge(
  () => editorWindow,
  prepareForUpdateInstall,
  () => engine.project?.state === 'RECORDING' || engine.project?.state === 'PAUSED'
);
let trayMenu: TrayMenu | null = null;

function prepareForUpdateInstall(): void {
  isQuitting = true;
  globalShortcut.unregisterAll();
  hooks.stop();
  hudWindow?.hide();
  trayMenu?.destroy();
  trayMenu = null;
}

function stepForgeWindowBounds(): Electron.Rectangle[] {
  return [editorWindow, hudWindow?.win]
    .filter((win): win is BrowserWindow => Boolean(win && !win.isDestroyed() && win.isVisible() && !win.isMinimized()))
    .map((win) => win.getBounds());
}

function createEditorWindow(): void {
  editorWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#06080c',
    icon: join(__dirname, '../../resources/icons/app.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/editor.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  editorWindow.on('ready-to-show', () => {
    editorWindow?.show();
    if (process.env['STEPFORGE_SCREENSHOT']) {
      setTimeout(async () => {
        if (!editorWindow) return;
        const img = await editorWindow.webContents.capturePage();
        const out = process.env['STEPFORGE_SCREENSHOT'] as string;
        writeFileSync(out, img.toPNG());
        console.log('[stepforge] screenshot saved →', out);
        app.quit();
      }, parseInt(process.env['STEPFORGE_SCREENSHOT_DELAY'] || '800', 10));
    }
  });

  editorWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  editorWindow.on('close', () => {
    if (!isQuitting) {
      isQuitting = true;
      app.quit();
    }
  });

  editorWindow.on('closed', () => {
    editorWindow = null;
  });

  editorWindow.on('focus', () => {
    void updater.check();
  });

  editorWindow.webContents.on('context-menu', (_event, params) => {
    if (!editorWindow) return;
    const menu = new Menu();
    if (params.misspelledWord) {
      for (const suggestion of params.dictionarySuggestions.slice(0, 6)) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => editorWindow?.webContents.replaceMisspelling(suggestion)
        }));
      }
      if (params.dictionarySuggestions.length === 0) {
        menu.append(new MenuItem({ label: 'No suggestions', enabled: false }));
      }
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: `Add "${params.misspelledWord}" to dictionary`,
        click: () => editorWindow?.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }
    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'cut' }));
      menu.append(new MenuItem({ role: 'copy' }));
      menu.append(new MenuItem({ role: 'paste' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
      menu.popup({ window: editorWindow });
    } else if (params.misspelledWord) {
      menu.popup({ window: editorWindow });
    }
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    editorWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/index.html');
  } else {
    editorWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) app.quit();

app.whenReady().then(() => {
  registerIpc({ getEditorWindow: () => editorWindow, settings, storage, engine, exporter, updater });
  createEditorWindow();
  hudWindow = createHudWindow();
  wireEngineEvents();
  createTray();
  registerGlobalShortcuts();
  updater.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createEditorWindow();
  });
});

app.on('second-instance', () => {
  if (!editorWindow || editorWindow.isDestroyed()) {
    createEditorWindow();
    return;
  }
  if (editorWindow.isMinimized()) editorWindow.restore();
  editorWindow.show();
  editorWindow.focus();
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  hooks.stop();
  hudWindow?.hide();
  trayMenu?.destroy();
  updater.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function wireEngineEvents(): void {
  engine.on('projectChanged', (project: Project | null) => {
    editorWindow?.webContents.send(IPC.ProjectChanged, project);
    hudWindow?.updateStepCount(project?.steps.filter((step) => !step.isDeleted).length ?? 0);
  });
  engine.on('stepAdded', (step: RecordedStep) => {
    editorWindow?.webContents.send(IPC.StepAdded, step);
    editorWindow?.webContents.send(IPC.CaptureToast, { stepNumber: step.stepNumber, description: step.description });
  });
  engine.on('stateChanged', (state) => {
    editorWindow?.webContents.send(IPC.RecordingStateChanged, state);
    hudWindow?.updateState(state);
    trayMenu?.setState(state);
    if (state === 'RECORDING' || state === 'PAUSED') hudWindow?.show();
    else hudWindow?.hide();
    if (state === 'STOPPED' || state === 'IDLE') updater.tryAutoInstall();
  });
  engine.on('tick', (seconds) => hudWindow?.updateTimer(seconds));
}

function createTray(): void {
  trayMenu = new TrayMenu({
    openEditor: () => {
      editorWindow?.show();
      editorWindow?.focus();
    },
    start: () => void engine.start(),
    pauseResume: () => {
      if (engine.project?.state === 'PAUSED') void engine.resume();
      else void engine.pause();
    },
    stop: () => void engine.stop(),
    cancel: () => void engine.cancel(),
    settings: () => {
      editorWindow?.show();
      editorWindow?.webContents.send(IPC.SettingsChanged, null);
    }
  });
  trayMenu.create();
}

async function registerGlobalShortcuts(): Promise<void> {
  const currentSettings = await settings.load();
  globalShortcut.register(currentSettings.hotkeyStartStop, () => {
    if (engine.project?.state === 'RECORDING' || engine.project?.state === 'PAUSED') void engine.stop();
    else void engine.start();
  });
  globalShortcut.register(currentSettings.hotkeyPauseResume, () => {
    if (engine.project?.state === 'PAUSED') void engine.resume();
    else void engine.pause();
  });
  globalShortcut.register(currentSettings.hotkeyCancel, () => void engine.cancel());
  globalShortcut.register(currentSettings.hotkeyFlagBug, () => flagLatest('Bug'));
  globalShortcut.register(currentSettings.hotkeyFlagImportant, () => flagLatest('Important'));
  globalShortcut.register(currentSettings.hotkeyAddManualStep, () => void engine.addManualStep());
}

function flagLatest(flag: 'Bug' | 'Important'): void {
  const latest = engine.project?.steps.at(-1);
  if (latest) void engine.toggleFlag(latest.id, flag);
}
