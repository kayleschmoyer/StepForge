import type { RecordedStep } from './Step';

export type RecordingState = 'IDLE' | 'RECORDING' | 'PAUSED' | 'STOPPED';

export interface SessionMetadata {
  title: string;
  jiraKey?: string;
  app: string;
  build: string;
  tester: string;
  env: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  expected: string;
  actual: string;
  company: string;
  /** Path relative to sessionDirectory, e.g. assets/logo.png. */
  logoPath?: string;
  /** ISO timestamp the recording started (UTC). */
  startedAt: string;
  /** Seconds. */
  duration: number;
  notes?: string;
}

export interface Project {
  sessionId: string;
  sessionDirectory: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp, set when recording finalizes. */
  completedAt?: string;
  /** ISO timestamp of last successful disk write. */
  lastSavedAt: string;
  state: RecordingState;
  isDirty: boolean;
  isRecovered: boolean;
  steps: RecordedStep[];
  metadata: SessionMetadata;
  nextStepNumber: number;
}

export interface RecentProject {
  sessionId: string;
  sessionDirectory: string;
  title: string;
  app: string;
  stepCount: number;
  /** ISO timestamp of last save. */
  lastSavedAt: string;
}
