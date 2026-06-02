import type { InputEvent } from '../hooks/InputHookService';
import type { WindowInfo } from '@shared/models/Step';

export function describeInput(event: InputEvent, windowInfo?: WindowInfo): string {
  const context = contextLabel(windowInfo);
  if (event.kind === 'mouse') {
    if (event.doubleClick) return context ? `Double-clicked in ${context}` : 'Double-clicked';
    const label = event.button === 'left' ? 'Clicked' : event.button === 'right' ? 'Right-clicked' : 'Middle-clicked';
    return context ? `${label} in ${context}` : label;
  }
  if (event.kind === 'wheel') {
    const label = event.delta < 0 ? 'Scrolled down' : 'Scrolled up';
    return context ? `${label} in ${context}` : label;
  }
  if (event.shortcut) return context ? `Pressed ${event.keys} in ${context}` : `Pressed ${event.keys}`;
  const label = event.text ? `Typed "${event.text}"` : `Pressed ${event.keys}`;
  return context ? `${label} in ${context}` : label;
}

function contextLabel(windowInfo?: WindowInfo): string {
  const page = windowInfo?.pageTitle?.trim();
  if (page) return page.length > 70 ? `${page.slice(0, 67)}...` : page;
  const app = windowInfo?.appName?.trim();
  if (app) return app;
  const process = windowInfo?.processName?.replace(/\.exe$/i, '').trim();
  return process || '';
}