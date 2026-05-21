import type { AppSettings } from '@shared/models/AppSettings';

export function applySettingsAppearance(settings: Pick<AppSettings, 'theme' | 'accentColor'>): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', settings.theme);
  setAccentColor(settings.accentColor);
}

export function setAccentColor(color: string): void {
  const rgb = hexToRgb(color) ?? hexToRgb('#00c4ff')!;
  const hover = mix(rgb, { r: 255, g: 255, b: 255 }, 0.22);
  const root = document.documentElement;
  root.style.setProperty('--ksr-acc', rgbToHex(rgb));
  root.style.setProperty('--ksr-acc-hover', rgbToHex(hover));
  root.style.setProperty('--ksr-acc-soft', `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`);
  root.style.setProperty('--ksr-acc-border', `rgba(${rgb.r},${rgb.g},${rgb.b},0.30)`);
  root.style.setProperty('--ksr-acc-glow', `0 0 32px rgba(${rgb.r},${rgb.g},${rgb.b},0.28)`);
  root.style.setProperty('--ksr-acc-shadow-sm', `0 0 12px rgba(${rgb.r},${rgb.g},${rgb.b},0.40)`);
  root.style.setProperty('--ksr-acc-shadow-md', `0 0 20px rgba(${rgb.r},${rgb.g},${rgb.b},0.40)`);
  root.style.setProperty('--ksr-acc-shadow-lg', `0 12px 36px rgba(${rgb.r},${rgb.g},${rgb.b},0.14), 0 0 0 4px rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`);
  root.style.setProperty('--ksr-acc-rgb', `${rgb.r},${rgb.g},${rgb.b}`);
}

type Rgb = { r: number; g: number; b: number };

function hexToRgb(hex: string): Rgb | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return null;
  return {
    r: Number.parseInt(match[1], 16),
    g: Number.parseInt(match[2], 16),
    b: Number.parseInt(match[3], 16)
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

function mix(a: Rgb, b: Rgb, weight: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * weight,
    g: a.g + (b.g - a.g) * weight,
    b: a.b + (b.b - a.b) * weight
  };
}
