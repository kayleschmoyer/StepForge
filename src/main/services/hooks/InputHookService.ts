import { EventEmitter } from 'node:events';
import type { AppSettings } from '@shared/models/AppSettings';
import { EventDebouncer } from './EventDebouncer';
import { formatKeyEvent, isShortcut, textFromKeyEvent } from './KeyMapper';

export type InputEvent =
  | { kind: 'mouse'; button: 'left' | 'right' | 'middle'; x: number; y: number; doubleClick?: boolean; timestamp: string }
  | { kind: 'wheel'; x: number; y: number; delta: number; timestamp: string }
  | { kind: 'key'; keys: string; text: string; shortcut: boolean; timestamp: string };

interface UiohookApi {
  uIOhook?: {
    on: (eventName: string, listener: (event: Record<string, unknown>) => void) => void;
    removeAllListeners: () => void;
    start: () => void;
    stop: () => void;
  };
}

export class InputHookService extends EventEmitter {
  private hook: UiohookApi['uIOhook'];
  private running = false;
  private debouncer: EventDebouncer | null = null;

  async start(settings: AppSettings): Promise<void> {
    if (this.running) return;
    this.debouncer = new EventDebouncer(settings.debounceIntervalMs, settings.doubleClickThresholdMs);
    try {
      const module = (await import('uiohook-napi')) as unknown as UiohookApi;
      this.hook = module.uIOhook;
      if (!this.hook) throw new Error('uiohook-napi did not expose uIOhook');
      this.hook.on('mousedown', (event) => this.emitNormalized(this.mouseEvent(event)));
      this.hook.on('wheel', (event) => {
        if (settings.captureScrollEvents) this.emitNormalized(this.wheelEvent(event));
      });
      this.hook.on('keydown', (event) => {
        const shortcut = isShortcut(event);
        if ((shortcut && settings.captureKeyboardShortcuts) || (!shortcut && settings.captureTextEntry)) {
          this.emitNormalized(this.keyEvent(event));
        }
      });
      this.hook.start();
      this.running = true;
    } catch (error) {
      console.warn('[input-hook] native hook unavailable; recording can still add manual steps', error);
      this.running = true;
    }
  }

  stop(): void {
    if (!this.running) return;
    this.hook?.stop();
    this.hook?.removeAllListeners();
    this.hook = undefined;
    this.running = false;
  }

  private emitNormalized(event: InputEvent): void {
    const normalized = this.debouncer?.normalize(event) ?? event;
    if (normalized) this.emit('input', normalized);
  }

  private mouseEvent(event: Record<string, unknown>): InputEvent {
    const buttonNumber = Number(event.button ?? 1);
    const button = buttonNumber === 2 ? 'right' : buttonNumber === 3 ? 'middle' : 'left';
    return { kind: 'mouse', button, x: Number(event.x ?? 0), y: Number(event.y ?? 0), timestamp: new Date().toISOString() };
  }

  private wheelEvent(event: Record<string, unknown>): InputEvent {
    return { kind: 'wheel', x: Number(event.x ?? 0), y: Number(event.y ?? 0), delta: Number(event.rotation ?? event.amount ?? 0), timestamp: new Date().toISOString() };
  }

  private keyEvent(event: Record<string, unknown>): InputEvent {
    const shortcut = isShortcut(event);
    return { kind: 'key', keys: formatKeyEvent(event), text: textFromKeyEvent(event), shortcut, timestamp: new Date().toISOString() };
  }
}