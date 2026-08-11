import type { AppContext } from '../models/Step';

export interface AppContextRow {
  label: string;
  value: string;
}

/** Why the App Context block is left out of an exported report. */
export type AppContextSuppression = 'remote-session' | 'low-confidence' | 'no-details';

export interface AppContextSummary {
  rows: AppContextRow[];
  suppression?: AppContextSuppression;
}

/**
 * Remote-session clients host another machine's desktop. The probe only ever
 * sees the viewer window, so every step recorded through one reports the same
 * client process and connection title instead of the app under test.
 */
const REMOTE_SESSION_PROCESSES = new Set([
  'mstsc',
  'msrdc',
  'msrdcw',
  'rdcman',
  'remotedesktopmanager',
  'wfica32',
  'cdviewer',
  'citrixreceiver',
  'vmware-view',
  'vncviewer',
  'tvnviewer',
  'winvnc',
  'teamviewer',
  'anydesk',
  'splashtop',
  'dwrcc'
]);

/** Detected app names that carry no more information than an empty cell. */
const PLACEHOLDER_APP_NAMES = new Set(['unknown app', 'unknown', '-']);

function normalize(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

export function isRemoteSessionContext(context: AppContext): boolean {
  const process = normalize(context.processName || context.appName).replace(/\.exe$/, '');
  return REMOTE_SESSION_PROCESSES.has(process);
}

/**
 * Build the App Context rows worth printing in a report, or explain why there
 * are none. Shared by every exporter so HTML, PDF, Markdown, and DOCX agree.
 */
export function summarizeAppContext(context: AppContext | undefined): AppContextSummary {
  if (!context) return { rows: [] };
  if (isRemoteSessionContext(context)) return { rows: [], suppression: 'remote-session' };
  if (context.confidence === 'low') return { rows: [], suppression: 'low-confidence' };

  const appName = PLACEHOLDER_APP_NAMES.has(normalize(context.appName)) ? '' : context.appName.trim();
  const pageTitle = context.pageTitle?.trim() ?? '';
  // Reports already print the window title above this block, and browsers are
  // the only apps whose page title is trimmed to something different. Anywhere
  // else the row is a verbatim repeat, so drop it.
  const isDistinctPage =
    Boolean(pageTitle) &&
    normalize(pageTitle) !== normalize(context.windowTitle) &&
    normalize(pageTitle) !== normalize(appName);

  const rows = [
    { label: 'App', value: appName },
    { label: 'Page', value: isDistinctPage ? pageTitle : '' },
    { label: 'URL', value: context.url?.trim() ?? '' },
    { label: 'Host', value: context.host?.trim() ?? '' }
  ].filter((row) => Boolean(row.value));

  return rows.length ? { rows } : { rows: [], suppression: 'no-details' };
}

export function appContextSuppressionLabel(suppression: AppContextSuppression): string {
  if (suppression === 'remote-session') {
    return 'Left out of exports — this is a remote-session client, so the detected app is the viewer rather than the app under test.';
  }
  if (suppression === 'low-confidence') {
    return 'Left out of exports — detection confidence is low.';
  }
  return 'Left out of exports — nothing detected beyond the window title already shown on the step.';
}
