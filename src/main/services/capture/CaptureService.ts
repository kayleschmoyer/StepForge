import { app, desktopCapturer, screen } from 'electron';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import type { CaptureWarning } from '@shared/models/Step';
import { diagnostics } from '../diagnostics/DiagnosticsStore';

const execFileAsync = promisify(execFile);

export interface CaptureResult {
  png: Buffer;
  dpiScale: { x: number; y: number };
  bounds?: { x: number; y: number; width: number; height: number };
  warnings?: CaptureWarning[];
}

export type CaptureBounds = NonNullable<CaptureResult['bounds']>;

export class CaptureService {
  async captureWindow(handle?: string, fallbackBounds?: CaptureBounds): Promise<CaptureResult> {
    if (process.platform === 'win32' && handle) {
      try {
        const { stdout } = await execFileAsync('powershell.exe', [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          this.scriptPath('capture-window.ps1'),
          '-Handle',
          handle
        ], { windowsHide: true, maxBuffer: 80 * 1024 * 1024, timeout: 12000 });
        const parsed = JSON.parse(stdout.trim()) as { pngBase64: string; dpiScale?: { x: number; y: number }; bounds?: CaptureResult['bounds']; captureMethod?: string };
        if (parsed.captureMethod && parsed.captureMethod !== 'print-window') {
          diagnostics.record('info', 'capture', `Used ${parsed.captureMethod} capture for window screenshot.`);
        }
        return {
          png: Buffer.from(parsed.pngBase64, 'base64'),
          dpiScale: parsed.dpiScale ?? { x: 1, y: 1 },
          bounds: parsed.bounds,
          warnings: parsed.captureMethod === 'visible-region-remote'
            ? [{ kind: 'remote-session', message: 'Remote Desktop capture used the visible window region for this step.' }]
            : undefined
        };
      } catch (error) {
        console.warn('[capture] window capture failed; falling back to window bounds crop', error);
        diagnostics.record('warning', 'capture', 'Window capture failed; used bounds crop fallback.', error);
        if (fallbackBounds) {
          const fallback = await this.captureDisplayRegion(fallbackBounds);
          return {
            ...fallback,
            warnings: [...(fallback.warnings ?? []), {
              kind: 'elevated',
              message: 'Window capture failed; StepForge used a visible-region fallback.'
            }]
          };
        }
      }
    }
    if (fallbackBounds) return this.captureDisplayRegion(fallbackBounds);
    return this.capturePrimaryDisplay();
  }

  async captureDisplayRegion(bounds: CaptureBounds): Promise<CaptureResult> {
    const display = screen.getDisplayMatching(bounds);
    const fullDisplay = await this.capturePrimaryDisplay(display.id);
    if (!fullDisplay.bounds) return fullDisplay;

    const scale = display.scaleFactor || 1;
    const left = Math.max(0, Math.round((bounds.x - fullDisplay.bounds.x) * scale));
    const top = Math.max(0, Math.round((bounds.y - fullDisplay.bounds.y) * scale));
    const width = Math.max(1, Math.round(bounds.width * scale));
    const height = Math.max(1, Math.round(bounds.height * scale));
    const metadata = await sharp(fullDisplay.png).metadata();
    const extractWidth = Math.min(width, Math.max(1, (metadata.width ?? width) - left));
    const extractHeight = Math.min(height, Math.max(1, (metadata.height ?? height) - top));
    return {
      png: await sharp(fullDisplay.png).extract({ left, top, width: extractWidth, height: extractHeight }).png().toBuffer(),
      dpiScale: fullDisplay.dpiScale,
      bounds
    };
  }

  async capturePrimaryDisplay(displayId?: number): Promise<CaptureResult> {
    try {
      const display = displayId
        ? screen.getAllDisplays().find((candidate) => candidate.id === displayId) ?? screen.getPrimaryDisplay()
        : screen.getPrimaryDisplay();
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: display.size
      });
      const primary = sources.find((source) => source.display_id === String(display.id)) ?? sources[0];
      if (primary && !primary.thumbnail.isEmpty()) {
        return {
          png: primary.thumbnail.toPNG(),
          dpiScale: { x: display.scaleFactor, y: display.scaleFactor },
          bounds: display.bounds
        };
      }
    } catch (error) {
      console.warn('[capture] desktop capture failed; using placeholder', error);
      diagnostics.record('error', 'capture', 'Desktop capture failed; using placeholder image.', error);
    }

    return {
      png: await sharp({
        create: {
          width: 1280,
          height: 800,
          channels: 4,
          background: '#0f172a'
        }
      }).png().toBuffer(),
      dpiScale: { x: 1, y: 1 },
      bounds: { x: 0, y: 0, width: 1280, height: 800 },
      warnings: [{ kind: 'offscreen', message: 'Capture failed; placeholder image was used.' }]
    };
  }

  private scriptPath(scriptName: string): string {
    if (app.isPackaged) {
      const direct = join(process.resourcesPath, 'scripts', scriptName);
      if (existsSync(direct)) return direct;
      return join(process.resourcesPath, 'resources', 'scripts', scriptName);
    }
    return join(app.getAppPath(), 'resources', 'scripts', scriptName);
  }
}