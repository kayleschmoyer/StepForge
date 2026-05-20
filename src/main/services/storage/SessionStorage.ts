import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import writeFileAtomic from 'write-file-atomic';
import type { AppSettings } from '@shared/models/AppSettings';
import type { Project, RecentProject } from '@shared/models/Project';
import type { ProjectCreatePayload } from '@shared/models/Ipc';

const SESSION_FILE = 'session.json';
const LOCK_FILE = '.lock';

export class SessionStorage {
  constructor(private settingsProvider: () => Promise<AppSettings>) {}

  async getSessionsRoot(): Promise<string> {
    const settings = await this.settingsProvider();
    return settings.sessionStoragePath || join(app.getPath('documents'), 'StepForge', 'sessions');
  }

  async createProject(input: string | ProjectCreatePayload = 'Untitled recording'): Promise<Project> {
    const title = typeof input === 'string' ? input : input.title;
    const jiraKey = typeof input === 'string' ? undefined : input.jiraKey;
    const now = new Date().toISOString();
    const sessionId = `session-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const sessionDirectory = await this.createSessionDirectory(sessionId, title, jiraKey);
    const settings = await this.settingsProvider();
    const project: Project = {
      sessionId,
      sessionDirectory,
      createdAt: now,
      lastSavedAt: now,
      state: 'IDLE',
      isDirty: false,
      isRecovered: false,
      steps: [],
      metadata: {
        title,
        jiraKey: '',
        app: '',
        build: '',
        tester: settings.defaultTesterName,
        env: settings.defaultEnvironment,
        priority: settings.defaultPriority,
        expected: '',
        actual: '',
        company: '',
        startedAt: now,
        duration: 0
      },
      nextStepNumber: 1
    };
    await this.saveProject(project, true);
    return project;
  }

  async saveProject(project: Project, keepLock = project.state === 'RECORDING' || project.state === 'PAUSED'): Promise<Project> {
    await mkdir(project.sessionDirectory, { recursive: true });
    const nextProject: Project = {
      ...project,
      lastSavedAt: new Date().toISOString(),
      isDirty: false
    };
    await writeFileAtomic(this.sessionPath(project.sessionDirectory), JSON.stringify(nextProject, null, 2), 'utf-8');
    if (keepLock) await this.writeLock(nextProject);
    else await this.clearLock(nextProject.sessionDirectory);
    return nextProject;
  }

  async loadProject(sessionDirectory: string): Promise<Project> {
    const raw = await readFile(this.sessionPath(sessionDirectory), 'utf-8');
    return JSON.parse(raw) as Project;
  }

  async listRecent(limit = 8): Promise<RecentProject[]> {
    const root = await this.getSessionsRoot();
    if (!existsSync(root)) return [];
    const entries = await readdir(root, { withFileTypes: true });
    const projects: Project[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sessionDirectory = join(root, entry.name);
      if (!existsSync(this.sessionPath(sessionDirectory))) continue;
      try {
        projects.push(await this.loadProject(sessionDirectory));
      } catch {
        // Ignore partially written or incompatible sessions.
      }
    }
    return projects
      .sort((left, right) => right.lastSavedAt.localeCompare(left.lastSavedAt))
      .slice(0, limit)
      .map((project) => ({
        sessionId: project.sessionId,
        sessionDirectory: project.sessionDirectory,
        title: project.metadata.title,
        app: project.metadata.app,
        stepCount: project.steps.filter((step) => !step.isDeleted).length,
        lastSavedAt: project.lastSavedAt
      }));
  }

  async findRecoverableSession(): Promise<Project | null> {
    const root = await this.getSessionsRoot();
    if (!existsSync(root)) return null;
    const entries = await readdir(root, { withFileTypes: true });
    const candidates: Array<{ directory: string; mtimeMs: number }> = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const directory = join(root, entry.name);
      const lockPath = join(directory, LOCK_FILE);
      if (!existsSync(lockPath) || !existsSync(this.sessionPath(directory))) continue;
      try {
        const lockStat = await stat(lockPath);
        candidates.push({ directory, mtimeMs: lockStat.mtimeMs });
      } catch {
        // Ignore stale paths that vanished during scanning.
      }
    }
    candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
    for (const candidate of candidates) {
      try {
        const project = await this.loadProject(candidate.directory);
        if (project.state !== 'STOPPED') return project;
      } catch {
        // Keep scanning; one bad session should not block recovery.
      }
    }
    return null;
  }

  async dismissRecovery(sessionDirectory?: string): Promise<void> {
    if (sessionDirectory) {
      await this.clearLock(sessionDirectory);
      return;
    }
    const project = await this.findRecoverableSession();
    if (project) await this.clearLock(project.sessionDirectory);
  }

  private async writeLock(project: Project): Promise<void> {
    await writeFile(join(project.sessionDirectory, LOCK_FILE), JSON.stringify({
      sessionId: project.sessionId,
      startedAt: project.metadata.startedAt,
      updatedAt: new Date().toISOString()
    }), 'utf-8');
  }

  private async clearLock(sessionDirectory: string): Promise<void> {
    await rm(join(sessionDirectory, LOCK_FILE), { force: true });
  }

  private sessionPath(sessionDirectory: string): string {
    return join(sessionDirectory, SESSION_FILE);
  }

  private async createSessionDirectory(sessionId: string, title: string, jiraKey?: string): Promise<string> {
    const root = await this.getSessionsRoot();
    const baseName = this.buildSessionFolderName(sessionId, title, jiraKey);
    for (let index = 0; index < 100; index += 1) {
      const name = index === 0 ? baseName : `${baseName} (${index + 1})`;
      const directory = join(root, name);
      if (!existsSync(directory)) return directory;
    }
    return join(root, `${baseName} - ${randomUUID().slice(0, 8)}`);
  }

  private buildSessionFolderName(sessionId: string, title: string, jiraKey?: string): string {
    if (!jiraKey) return sessionId;
    const cleanTitle = sanitizePathPart(title).replace(/^xray test for vast-?\d+$/i, '');
    const cleanJira = sanitizePathPart(jiraKey.toUpperCase());
    const folderName = cleanTitle ? `${cleanJira} - ${cleanTitle}` : cleanJira;
    return folderName.slice(0, 140).trim() || sessionId;
  }
}

function sanitizePathPart(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();
}