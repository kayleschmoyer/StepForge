import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defaultAppSettings, type AppSettings } from '@shared/models/AppSettings';

export class SettingsStore {
  async load(): Promise<AppSettings> {
    try {
      const raw = await readFile(this.path(), 'utf-8');
      return { ...defaultAppSettings, ...JSON.parse(raw) };
    } catch {
      return { ...defaultAppSettings };
    }
  }

  async save(settings: AppSettings): Promise<void> {
    await mkdir(app.getPath('userData'), { recursive: true });
    await writeFile(this.path(), JSON.stringify(settings, null, 2), 'utf-8');
  }

  async patch(patch: Partial<AppSettings>): Promise<AppSettings> {
    const next = { ...(await this.load()), ...patch };
    await this.save(next);
    return next;
  }

  private path(): string {
    return join(app.getPath('userData'), 'settings.json');
  }
}