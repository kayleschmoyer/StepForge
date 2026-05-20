import { Menu, Tray, app, nativeImage } from 'electron';
import { join } from 'node:path';
import type { RecordingState } from '@shared/models/Project';

export interface TrayActions {
  openEditor: () => void;
  start: () => void;
  pauseResume: () => void;
  stop: () => void;
  cancel: () => void;
  settings: () => void;
}

export class TrayMenu {
  private tray: Tray | null = null;
  private state: RecordingState = 'IDLE';

  constructor(private actions: TrayActions) {}

  create(): void {
    if (this.tray) return;
    this.tray = new Tray(this.iconPath(false));
    this.tray.setToolTip('StepForge');
    this.tray.on('double-click', this.actions.openEditor);
    this.rebuild();
  }

  setState(state: RecordingState): void {
    this.state = state;
    this.tray?.setImage(this.iconPath(state === 'RECORDING'));
    this.rebuild();
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }

  private rebuild(): void {
    if (!this.tray) return;
    const recording = this.state === 'RECORDING' || this.state === 'PAUSED';
    this.tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open Editor', click: this.actions.openEditor },
      { type: 'separator' },
      { label: 'Start Recording', accelerator: 'CommandOrControl+Shift+F9', enabled: !recording, click: this.actions.start },
      { label: this.state === 'PAUSED' ? 'Resume Recording' : 'Pause Recording', accelerator: 'CommandOrControl+Shift+F10', enabled: recording, click: this.actions.pauseResume },
      { label: 'Stop Recording', enabled: recording, click: this.actions.stop },
      { label: 'Cancel Recording', accelerator: 'CommandOrControl+Shift+F11', enabled: recording, click: this.actions.cancel },
      { type: 'separator' },
      { label: 'Settings...', click: this.actions.settings },
      { label: 'Quit', click: () => app.quit() }
    ]));
  }

  private iconPath(recording: boolean): Electron.NativeImage | string {
    const name = recording ? 'tray-recording.ico' : 'tray-idle.ico';
    const filePath = app.isPackaged ? join(process.resourcesPath, 'icons', name) : join(app.getAppPath(), 'resources', 'icons', name);
    const image = nativeImage.createFromPath(filePath);
    return image.isEmpty() ? nativeImage.createEmpty() : image;
  }
}