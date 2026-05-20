import type { StepForgeBridge } from '@shared/models/Ipc';

declare global {
  interface Window {
    stepForge: StepForgeBridge;
    stepForgeHud?: {
      pause: () => void;
      resume: () => void;
      stop: () => void;
      cancel: () => void;
      onTimer: (cb: (seconds: number) => void) => () => void;
      onStepCount: (cb: (count: number) => void) => () => void;
      onState: (cb: (state: 'IDLE' | 'RECORDING' | 'PAUSED' | 'STOPPED') => void) => () => void;
    };
  }
}

export {};
