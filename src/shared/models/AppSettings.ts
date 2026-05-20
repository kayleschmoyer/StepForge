/**
 * AppSettings — mirrors KaylesStepsRecorder.Core's AppSettings exactly.
 * Persisted as JSON in the userData directory.
 */

export type Theme = 'dark' | 'light';

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
  accentColor: '#00c4ff',
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
