const MODIFIER_NAMES: Record<string, string> = {
  ctrlKey: 'Ctrl',
  shiftKey: 'Shift',
  altKey: 'Alt',
  metaKey: 'Win'
};

const SPECIAL_KEYS: Record<number, string> = {
  8: 'Backspace',
  9: 'Tab',
  13: 'Enter',
  27: 'Esc',
  32: 'Space',
  37: 'Left',
  38: 'Up',
  39: 'Right',
  40: 'Down',
  46: 'Delete'
};

export function formatKeyEvent(event: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [property, label] of Object.entries(MODIFIER_NAMES)) {
    if (Boolean(event[property])) parts.push(label);
  }
  const rawcode = Number(event.rawcode ?? event.keycode ?? event.keyCode ?? 0);
  const key = SPECIAL_KEYS[rawcode] ?? printableFromRawcode(rawcode);
  if (key && !parts.includes(key)) parts.push(key);
  return parts.join('+') || 'Key';
}

export function isShortcut(event: Record<string, unknown>): boolean {
  return Boolean(event.ctrlKey || event.metaKey || event.altKey);
}

export function textFromKeyEvent(event: Record<string, unknown>): string {
  if (isShortcut(event)) return '';
  const rawcode = Number(event.rawcode ?? event.keycode ?? event.keyCode ?? 0);
  if (rawcode >= 48 && rawcode <= 90) return String.fromCharCode(rawcode);
  if (rawcode === 32) return ' ';
  return '';
}

function printableFromRawcode(rawcode: number): string {
  if (rawcode >= 65 && rawcode <= 90) return String.fromCharCode(rawcode);
  if (rawcode >= 48 && rawcode <= 57) return String.fromCharCode(rawcode);
  if (rawcode >= 112 && rawcode <= 123) return `F${rawcode - 111}`;
  return rawcode ? `Key ${rawcode}` : '';
}