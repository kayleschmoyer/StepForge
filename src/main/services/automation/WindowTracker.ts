import { app } from 'electron';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { WindowInfo } from '@shared/models/Step';

const execFileAsync = promisify(execFile);

export class WindowTracker {
  async getForegroundWindow(): Promise<WindowInfo | undefined> {
    return this.probeWindow();
  }

  async getWindowAtPoint(x: number, y: number): Promise<WindowInfo | undefined> {
    return this.probeWindow(x, y);
  }

  private async probeWindow(x?: number, y?: number): Promise<WindowInfo | undefined> {
    if (process.platform !== 'win32') return undefined;
    try {
      const args = [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        this.scriptPath()
      ];
      if (typeof x === 'number' && typeof y === 'number') args.push('-X', String(Math.round(x)), '-Y', String(Math.round(y)));
      const { stdout } = await execFileAsync('powershell.exe', args, { windowsHide: true, maxBuffer: 1024 * 1024 });
      const parsed = JSON.parse(stdout.trim()) as WindowInfo;
      return parsed.handle ? parsed : undefined;
    } catch (error) {
      console.warn('[window-tracker] foreground probe failed', error);
      return undefined;
    }
  }

  private scriptPath(): string {
    if (app.isPackaged) {
      const direct = join(process.resourcesPath, 'scripts', 'enum-windows.ps1');
      if (existsSync(direct)) return direct;
      return join(process.resourcesPath, 'resources', 'scripts', 'enum-windows.ps1');
    }
    return join(app.getAppPath(), 'resources', 'scripts', 'enum-windows.ps1');
  }
}