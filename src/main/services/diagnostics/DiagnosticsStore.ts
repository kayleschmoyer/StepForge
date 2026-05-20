import { EventEmitter } from 'node:events';
import type { DiagnosticEntry, DiagnosticLevel } from '@shared/models/Ipc';

interface DiagnosticsEvents {
  changed: [DiagnosticEntry[]];
}

class DiagnosticsStore extends EventEmitter {
  private entries: DiagnosticEntry[] = [];
  private maxEntries = 250;

  list(): DiagnosticEntry[] {
    return [...this.entries];
  }

  record(level: DiagnosticLevel, source: string, message: string, detail?: unknown): void {
    const entry: DiagnosticEntry = {
      id: `diag-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      detail: detail == null ? undefined : detail instanceof Error ? detail.message : String(detail)
    };
    this.entries = [entry, ...this.entries].slice(0, this.maxEntries);
    this.emit('changed', this.list());
  }

  on<T extends keyof DiagnosticsEvents>(eventName: T, listener: (...args: DiagnosticsEvents[T]) => void): this {
    return super.on(eventName, listener);
  }
}

export const diagnostics = new DiagnosticsStore();
