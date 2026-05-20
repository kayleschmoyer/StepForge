/** Format a number of seconds as MM:SS. */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

/** Format a Date or ISO string as a short "HH:MM AM/PM" local time. */
export function formatClock(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Format a Date or ISO string as "Mon, Jan 5 · 3:47 PM" local. */
export function formatTimestampLong(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const date = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

/** Greet by time-of-day. */
export function timeOfDayGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function nowIso(): string {
  return new Date().toISOString();
}
