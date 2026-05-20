import type { InputEvent } from '../hooks/InputHookService';

export function describeInput(event: InputEvent): string {
  if (event.kind === 'mouse') {
    if (event.doubleClick) return 'Double-clicked';
    const label = event.button === 'left' ? 'Clicked' : event.button === 'right' ? 'Right-clicked' : 'Middle-clicked';
    return label;
  }
  if (event.kind === 'wheel') {
    return event.delta < 0 ? 'Scrolled down' : 'Scrolled up';
  }
  if (event.shortcut) return `Pressed ${event.keys}`;
  return event.text ? `Typed "${event.text}"` : `Pressed ${event.keys}`;
}