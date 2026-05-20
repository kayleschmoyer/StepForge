import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import type { ExportOptions, ExportResult } from '@shared/models/Ipc';
import type { Project } from '@shared/models/Project';

export async function exportMarkdown(project: Project, options: ExportOptions): Promise<ExportResult> {
  const imageDirectory = join(dirname(options.outputPath), `${basename(options.outputPath, '.md')}-images`);
  if (options.includeScreenshots) await mkdir(imageDirectory, { recursive: true });
  const lines: string[] = [`# ${project.metadata.title}`, ''];
  if (options.includeMetadata) {
    lines.push(`- Version: ${project.metadata.build || '-'}`);
    lines.push(`- Environment: ${project.metadata.env || '-'}`);
    lines.push(`- Priority: ${project.metadata.priority || '-'}`, '');
  }
  if (project.metadata.expected) lines.push('## Expected', project.metadata.expected, '');
  if (project.metadata.actual) lines.push('## Actual', project.metadata.actual, '');
  lines.push('## Steps', '');
  for (const step of project.steps.filter((candidate) => options.includeDeletedSteps || !candidate.isDeleted)) {
    lines.push(`### ${step.stepNumber}. ${step.description}`, '');
    if (options.includeScreenshots && step.screenshotPath) {
      const imageName = `${step.stepNumber}-${basename(step.screenshotPath)}`;
      await copyFile(step.screenshotPath, join(imageDirectory, imageName));
      lines.push(`![Step ${step.stepNumber}](${basename(imageDirectory)}/${imageName})`, '');
    }
    if (options.includeNotes && step.userNote) lines.push(`> ${step.userNote}`, '');
  }
  await writeFile(options.outputPath, lines.join('\n'), 'utf-8');
  return { outputPath: options.outputPath, sizeBytes: Buffer.byteLength(lines.join('\n')) };
}