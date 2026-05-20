import { BrowserWindow, app, screen } from 'electron';
import { join } from 'node:path';

const isDev = !app.isPackaged;
const HUD_WIDTH = 420;
const HUD_HEIGHT = 56;

export interface HudHandle {
  win: BrowserWindow;
  show: () => void;
  hide: () => void;
  updateTimer: (seconds: number) => void;
  updateStepCount: (count: number) => void;
  updateState: (state: 'IDLE' | 'RECORDING' | 'PAUSED' | 'STOPPED') => void;
  destroy: () => void;
}

let hud: HudHandle | null = null;

export function getHudWindow(): HudHandle | null {
  return hud;
}

export function createHudWindow(): HudHandle {
  if (hud) return hud;

  const display = screen.getPrimaryDisplay();
  const { workArea } = display;
  const x = Math.round(workArea.x + workArea.width / 2 - HUD_WIDTH / 2);
  const y = Math.round(workArea.y + workArea.height - HUD_HEIGHT - 30);

  const win = new BrowserWindow({
    width: HUD_WIDTH,
    height: HUD_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    show: false,
    focusable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/hud.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/hud.html');
  } else {
    win.loadFile(join(__dirname, '../renderer/hud.html'));
  }

  hud = {
    win,
    show: () => {
      if (!win.isDestroyed()) win.show();
    },
    hide: () => {
      if (!win.isDestroyed()) win.hide();
    },
    updateTimer: (seconds: number) => {
      if (!win.isDestroyed()) win.webContents.send('hud:updateTimer', seconds);
    },
    updateStepCount: (count: number) => {
      if (!win.isDestroyed()) win.webContents.send('hud:updateStepCount', count);
    },
    updateState: (state) => {
      if (!win.isDestroyed()) win.webContents.send('hud:updateState', state);
    },
    destroy: () => {
      if (!win.isDestroyed()) win.destroy();
      hud = null;
    }
  };

  win.on('closed', () => {
    hud = null;
  });

  return hud;
}
