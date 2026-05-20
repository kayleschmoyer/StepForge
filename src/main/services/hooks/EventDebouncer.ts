import type { InputEvent } from './InputHookService';

export class EventDebouncer {
  private lastMouseAt = 0;
  private lastMouseButton = '';
  private lastWheelAt = 0;

  constructor(private debounceMs: number, private doubleClickMs: number) {}

  normalize(event: InputEvent): InputEvent | null {
    const now = Date.now();
    if (event.kind === 'mouse') {
      if (now - this.lastMouseAt < this.debounceMs && this.lastMouseButton === event.button) return null;
      const isDouble = now - this.lastMouseAt <= this.doubleClickMs && this.lastMouseButton === event.button;
      this.lastMouseAt = now;
      this.lastMouseButton = event.button;
      return isDouble ? { ...event, doubleClick: true } : event;
    }
    if (event.kind === 'wheel') {
      if (now - this.lastWheelAt < 300) return null;
      this.lastWheelAt = now;
    }
    return event;
  }
}