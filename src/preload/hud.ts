import { contextBridge, ipcRenderer } from 'electron';

const hudApi = {
  pause: () => ipcRenderer.invoke('recording:pause'),
  resume: () => ipcRenderer.invoke('recording:resume'),
  stop: () => ipcRenderer.invoke('recording:stop'),
  cancel: () => ipcRenderer.invoke('recording:cancel'),
  onTimer: (cb: (seconds: number) => void) => {
    const listener = (_: unknown, seconds: number) => cb(seconds);
    ipcRenderer.on('hud:updateTimer', listener);
    return () => ipcRenderer.removeListener('hud:updateTimer', listener);
  },
  onStepCount: (cb: (count: number) => void) => {
    const listener = (_: unknown, count: number) => cb(count);
    ipcRenderer.on('hud:updateStepCount', listener);
    return () => ipcRenderer.removeListener('hud:updateStepCount', listener);
  },
  onState: (cb: (state: 'IDLE' | 'RECORDING' | 'PAUSED' | 'STOPPED') => void) => {
    const listener = (_: unknown, state: 'IDLE' | 'RECORDING' | 'PAUSED' | 'STOPPED') => cb(state);
    ipcRenderer.on('hud:updateState', listener);
    return () => ipcRenderer.removeListener('hud:updateState', listener);
  }
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('stepForgeHud', hudApi);
} else {
  // @ts-expect-error fallback
  window.stepForgeHud = hudApi;
}

export type StepForgeHudApi = typeof hudApi;
