import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Project } from '@shared/models/Project';

export class ImageStorage {
  async saveScreenshot(project: Project, stepId: string, png: Buffer): Promise<string> {
    const directory = join(project.sessionDirectory, 'screenshots');
    await mkdir(directory, { recursive: true });
    const outputPath = join(directory, `${stepId}.png`);
    await writeFile(outputPath, png);
    return outputPath;
  }

  async saveThumbnail(project: Project, stepId: string, png: Buffer): Promise<string> {
    const directory = join(project.sessionDirectory, 'thumbnails');
    await mkdir(directory, { recursive: true });
    const outputPath = join(directory, `${stepId}.png`);
    await writeFile(outputPath, png);
    return outputPath;
  }
}