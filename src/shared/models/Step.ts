/**
 * Step model — mirrors KaylesStepsRecorder.Core's RecordedStep,
 * with an added `annotations` field for the redesign.
 */

import type { Annotation } from './Annotation';

export type ActionType =
  | 'LeftClick'
  | 'RightClick'
  | 'DoubleClick'
  | 'MiddleClick'
  | 'KeyboardInput'
  | 'KeyboardShortcut'
  | 'TextEntry'
  | 'Scroll'
  | 'WindowActivated'
  | 'WindowClosed'
  | 'MenuItemSelected'
  | 'DragAndDrop'
  | 'ManualNote';

export type StepFlag = 'Important' | 'Bug' | 'ExpectedResult' | 'ActualResult';

export interface WindowInfo {
  /** Win32 HWND as a base-10 string (IntPtr → string for JSON safety). */
  handle: string;
  title: string;
  processName?: string;
  processId?: number;
  className?: string;
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface ElementInfo {
  name: string;
  controlType: string;
  automationId?: string;
  className?: string;
  isEnabled: boolean;
  boundingRect?: { x: number; y: number; width: number; height: number };
  value?: string;
}

export interface CaptureWarning {
  kind: 'offscreen' | 'minimized' | 'elevated' | 'multi-monitor' | 'dpi-mismatch';
  message: string;
}

export interface RecordedStep {
  id: string;
  stepNumber: number;
  /** ISO timestamp (UTC). */
  timestamp: string;
  actionType: ActionType;
  description: string;
  userNote?: string;
  flags: StepFlag[];
  window?: WindowInfo;
  element?: ElementInfo;
  /** File path under the session directory, e.g. screenshots/{id}.png. */
  screenshotPath: string;
  thumbnailPath: string;
  keysPressed: string;
  textEntered: string;
  scrollDelta: number;
  scrolledDown: boolean;
  isRedacted: boolean;
  isDeleted: boolean;
  /** Annotations layered on top of the screenshot. */
  annotations: Annotation[];
  warnings?: CaptureWarning[];
}
