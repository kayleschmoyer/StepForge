/**
 * Mock project seed for development-only rendering before the real
 * recording engine writes data. Loaded via the Tweaks panel or auto-load
 * when the app is in dev mode and no recovery is found.
 */

import type { Project } from '@shared/models/Project';
import type { RecordedStep } from '@shared/models/Step';

const now = new Date('2026-05-18T17:23:00');

function step(
  id: string,
  n: number,
  partial: Partial<RecordedStep> & {
    actionType: RecordedStep['actionType'];
    description: string;
  }
): RecordedStep {
  return {
    id,
    stepNumber: n,
    timestamp: new Date(now.getTime() + n * 12_000).toISOString(),
    actionType: partial.actionType,
    description: partial.description,
    userNote: partial.userNote,
    flags: partial.flags ?? [],
    window: partial.window ?? {
      handle: '0',
      title: 'Chrome — Sign-in',
      processName: 'chrome.exe',
      processId: 12104
    },
    element: partial.element,
    screenshotPath: '',
    thumbnailPath: '',
    keysPressed: partial.keysPressed ?? '',
    textEntered: partial.textEntered ?? '',
    scrollDelta: partial.scrollDelta ?? 0,
    scrolledDown: partial.scrolledDown ?? false,
    isRedacted: false,
    isDeleted: false,
    annotations: partial.annotations ?? [],
    warnings: partial.warnings
  };
}

export const MOCK_PROJECT: Project = {
  sessionId: 'mock-2026-05-18',
  sessionDirectory: '',
  createdAt: now.toISOString(),
  lastSavedAt: now.toISOString(),
  state: 'STOPPED',
  isDirty: false,
  isRecovered: false,
  metadata: {
    title: 'Login times out on long usernames',
    jiraKey: 'VAST-1234',
    app: 'Acme Portal',
    build: '2026.05-rc.3 / 8.4.1',
    tester: 'Kayle Schmoyer',
    env: 'Staging — us-east-1',
    priority: 'High',
    expected: 'Submitting the sign-in form with a 64-character username should authenticate and route to the dashboard within 2 seconds.',
    actual:
      'After ~6 seconds the page reloads with no error message and the form is cleared. No request appears in the network tab beyond the initial submit.',
    company: 'Acme Corp',
    startedAt: now.toISOString(),
    duration: 162,
    notes: ''
  },
  nextStepNumber: 6,
  steps: [
    step('s-1', 1, {
      actionType: 'LeftClick',
      description: 'Clicked the sign-in tab'
    }),
    step('s-2', 2, {
      actionType: 'TextEntry',
      description: 'Typed the test username',
      textEntered: 'kayle.schmoyer+pentest@acme.example.com'
    }),
    step('s-3', 3, {
      actionType: 'KeyboardShortcut',
      description: 'Pressed Tab to focus the next field',
      keysPressed: 'Tab'
    }),
    step('s-4', 4, {
      actionType: 'LeftClick',
      description: 'Clicked the "Sign in" button',
      flags: ['Important']
    }),
    step('s-5', 5, {
      actionType: 'WindowActivated',
      description: 'Form reloaded — request never landed',
      flags: ['Bug'],
      userNote:
        'Network panel shows no POST to /auth/login. Looks like client-side guard rejected the long username before submission.',
      warnings: [
        { kind: 'multi-monitor', message: 'Window spans two monitors — screenshot covers the primary only.' }
      ]
    })
  ]
};
