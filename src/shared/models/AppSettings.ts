/**
 * AppSettings — mirrors KaylesStepsRecorder.Core's AppSettings exactly.
 * Persisted as JSON in the userData directory.
 */

export type Theme = 'dark' | 'light';

export interface AccentColorPreset {
  id: string;
  name: string;
  value: string;
}

export const accentColorPresets: AccentColorPreset[] = [
  { id: 'electric-cyan', name: 'Electric Cyan', value: '#00c4ff' },
  { id: 'ocean-blue', name: 'Ocean Blue', value: '#0ea5e9' },
  { id: 'modern-indigo', name: 'Modern Indigo', value: '#6366f1' },
  { id: 'soft-violet', name: 'Soft Violet', value: '#8b5cf6' },
  { id: 'fresh-teal', name: 'Fresh Teal', value: '#14b8a6' },
  { id: 'emerald', name: 'Emerald', value: '#10b981' },
  { id: 'citrus', name: 'Citrus', value: '#84cc16' },
  { id: 'warm-amber', name: 'Warm Amber', value: '#f59e0b' },
  { id: 'coral', name: 'Coral', value: '#f97316' },
  { id: 'rose', name: 'Rose', value: '#f43f5e' }
];

export interface AppSettings {
  // Capture
  captureDelayMs: number;
  debounceIntervalMs: number;
  doubleClickThresholdMs: number;
  captureScrollEvents: boolean;
  captureKeyboardShortcuts: boolean;
  captureTextEntry: boolean;
  screenshotQuality: number;
  windowOnlyCapture: boolean;

  // App
  darkMode: boolean;
  theme: Theme;
  accentColor: string;
  minimizeOnRecord: boolean;
  minimizeToTrayDuringRecording: boolean;
  showInTrayOnStartup: boolean;
  autoSaveEnabled: boolean;
  autoSaveIntervalSeconds: number;
  pauseOnExcludedApp: boolean;

  // Defaults
  firstRunSetupComplete: boolean;
  defaultTesterName: string;
  defaultEnvironment: string;
  defaultPriority: string;
  sessionStoragePath: string;
  excludedProcesses: string[];
  excludedWindowTitles: string[];

  // Hotkeys (Electron Accelerator strings)
  hotkeyStartStop: string;
  hotkeyPauseResume: string;
  hotkeyCancel: string;
  hotkeyFlagBug: string;
  hotkeyFlagImportant: string;
  hotkeyAddManualStep: string;
}

export const defaultAppSettings: AppSettings = {
  captureDelayMs: 25,
  debounceIntervalMs: 200,
  doubleClickThresholdMs: 350,
  captureScrollEvents: true,
  captureKeyboardShortcuts: true,
  captureTextEntry: true,
  screenshotQuality: 90,
  windowOnlyCapture: true,

  darkMode: true,
  theme: 'dark',
  accentColor: accentColorPresets[0].value,
  minimizeOnRecord: true,
  minimizeToTrayDuringRecording: false,
  showInTrayOnStartup: true,
  autoSaveEnabled: true,
  autoSaveIntervalSeconds: 30,
  pauseOnExcludedApp: true,

  firstRunSetupComplete: false,
  defaultTesterName: '',
  defaultEnvironment: 'Production',
  defaultPriority: 'Medium',
  sessionStoragePath: '',
  excludedProcesses: ['StepForge.exe', 'KaylesStepsRecorder.exe', '1Password.exe', 'KeePass.exe', 'LastPass.exe'],
  excludedWindowTitles: [],

  hotkeyStartStop: 'CommandOrControl+Shift+F9',
  hotkeyPauseResume: 'CommandOrControl+Shift+F10',
  hotkeyCancel: 'CommandOrControl+Shift+F11',
  hotkeyFlagBug: 'CommandOrControl+Shift+B',
  hotkeyFlagImportant: 'CommandOrControl+Shift+I',
  hotkeyAddManualStep: 'CommandOrControl+Shift+M'
};
