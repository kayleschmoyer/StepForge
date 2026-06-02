import { app, safeStorage } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defaultAppSettings, type AppSettings, type AppSettingsPatch } from '@shared/models/AppSettings';

type StoredAppSettings = Omit<AppSettings, 'emailPasswordSet'> & {
  defaultEnvironment?: string;
  emailPasswordSet?: boolean;
  emailSmtpPasswordEncrypted?: string;
};

export class SettingsStore {
  async load(): Promise<AppSettings> {
    return this.toAppSettings(await this.loadStored());
  }

  async save(settings: AppSettings): Promise<void> {
    const current = await this.loadStored();
    await this.saveStored({ ...settings, emailSmtpPasswordEncrypted: current.emailSmtpPasswordEncrypted });
  }

  async patch(patch: AppSettingsPatch): Promise<AppSettings> {
    const current = await this.loadStored();
    const { emailSmtpPassword, clearEmailSmtpPassword, emailPasswordSet, ...settingsPatch } = patch;
    const next: StoredAppSettings = { ...current, ...settingsPatch };

    if (clearEmailSmtpPassword) {
      delete next.emailSmtpPasswordEncrypted;
    } else if (emailSmtpPassword !== undefined) {
      const trimmed = emailSmtpPassword.replace(/\s+/g, '');
      if (trimmed) next.emailSmtpPasswordEncrypted = this.encrypt(trimmed);
    }

    void emailPasswordSet;
    await this.saveStored(next);
    return this.toAppSettings(next);
  }

  async getEmailSmtpPassword(): Promise<string> {
    const stored = await this.loadStored();
    return stored.emailSmtpPasswordEncrypted ? this.decrypt(stored.emailSmtpPasswordEncrypted) : '';
  }

  private async loadStored(): Promise<StoredAppSettings> {
    try {
      const raw = await readFile(this.path(), 'utf-8');
      const stored = JSON.parse(raw) as Partial<StoredAppSettings>;
      delete stored.defaultEnvironment;
      const settings = { ...defaultAppSettings, ...stored };
      if (!settings.emailSmtpUser?.trim()) settings.emailSmtpUser = defaultAppSettings.emailSmtpUser;
      if (!settings.emailFromAddress?.trim()) settings.emailFromAddress = defaultAppSettings.emailFromAddress;
      if (!settings.emailSmtpHost?.trim()) settings.emailSmtpHost = defaultAppSettings.emailSmtpHost;
      if (!settings.emailSmtpPort) settings.emailSmtpPort = defaultAppSettings.emailSmtpPort;
      return { ...settings, captureDelayMs: Math.min(settings.captureDelayMs, defaultAppSettings.captureDelayMs) } as StoredAppSettings;
    } catch {
      return { ...defaultAppSettings };
    }
  }

  private async saveStored(settings: StoredAppSettings): Promise<void> {
    const { emailPasswordSet, ...stored } = settings;
    void emailPasswordSet;
    await mkdir(app.getPath('userData'), { recursive: true });
    await writeFile(this.path(), JSON.stringify(stored, null, 2), 'utf-8');
  }

  private toAppSettings(settings: StoredAppSettings): AppSettings {
    const { emailSmtpPasswordEncrypted, ...safeSettings } = settings;
    return { ...safeSettings, emailPasswordSet: Boolean(emailSmtpPasswordEncrypted) };
  }

  private encrypt(value: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Email password storage is not available on this device.');
    }
    return `safe:${safeStorage.encryptString(value).toString('base64')}`;
  }

  private decrypt(value: string): string {
    if (!value.startsWith('safe:') || !safeStorage.isEncryptionAvailable()) return '';
    return safeStorage.decryptString(Buffer.from(value.slice(5), 'base64'));
  }

  private path(): string {
    return join(app.getPath('userData'), 'settings.json');
  }
}