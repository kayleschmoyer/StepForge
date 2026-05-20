import { readFile, stat, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { Document, HeadingLevel, ImageRun, Packer, Paragraph, TextRun } from 'docx';
import sharp from 'sharp';
import type { ExportOptions, ExportResult } from '@shared/models/Ipc';
import type { Project } from '@shared/models/Project';

export async function exportDocx(project: Project, options: ExportOptions): Promise<ExportResult> {
  const children: Paragraph[] = [
    new Paragraph({ text: project.metadata.jiraKey || 'QA Report', heading: HeadingLevel.HEADING_3 }),
    new Paragraph({ text: project.metadata.title || 'QA Session Report', heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun(`Application: ${project.metadata.app || '-'}`)] }),
    new Paragraph({ children: [new TextRun(`Tester: ${project.metadata.tester || '-'}`)] }),
    new Paragraph({ children: [new TextRun(`Environment: ${project.metadata.env || '-'}`)] }),
    new Paragraph({ children: [new TextRun(`Build: ${project.metadata.build || '-'}`)] }),
    new Paragraph({ children: [new TextRun(`Priority: ${project.metadata.priority || '-'}`)] })
  ];

  if (project.metadata.expected || project.metadata.actual) {
    children.push(new Paragraph({ text: 'Expected Result', heading: HeadingLevel.HEADING_1 }));
    children.push(new Paragraph({ children: [new TextRun(project.metadata.expected || '-')] }));
    children.push(new Paragraph({ text: 'Actual Result', heading: HeadingLevel.HEADING_1 }));
    children.push(new Paragraph({ children: [new TextRun(project.metadata.actual || '-')] }));
  }

  children.push(
    new Paragraph({ text: 'Reproduction Steps', heading: HeadingLevel.HEADING_1 })
  );

  for (const step of project.steps.filter((candidate) => options.includeDeletedSteps || !candidate.isDeleted)) {
    children.push(new Paragraph({ text: `${step.stepNumber}. ${step.description}`, heading: HeadingLevel.HEADING_2 }));
    if (options.includeTimestamps) children.push(new Paragraph({ children: [new TextRun(`Captured: ${new Date(step.timestamp).toLocaleString()}`)] }));
    if (step.warnings?.length) {
      step.warnings.forEach((warning) => {
        children.push(new Paragraph({ children: [new TextRun({ text: `Warning: ${warning.message}`, bold: true })] }));
      });
    }
    if (options.includeNotes && step.userNote) children.push(new Paragraph({ children: [new TextRun(step.userNote)] }));
    if (options.includeScreenshots && step.screenshotPath) {
      try {
        const imageBytes = await readFile(step.screenshotPath);
        const size = await imageSize(step.screenshotPath);
        children.push(new Paragraph({
          children: [new ImageRun({
            type: imageType(step.screenshotPath),
            data: imageBytes,
            transformation: size,
            altText: { title: step.description, description: `Screenshot for step ${step.stepNumber}`, name: `step-${step.stepNumber}` }
          })]
        }));
      } catch {
        children.push(new Paragraph({ children: [new TextRun(`Screenshot unavailable: ${step.screenshotPath}`)] }));
      }
    }
  }
  const document = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBuffer(document);
  await writeFile(options.outputPath, buffer);
  const outputStat = await stat(options.outputPath);
  return { outputPath: options.outputPath, sizeBytes: outputStat.size };
}

async function imageSize(path: string): Promise<{ width: number; height: number }> {
  const metadata = await sharp(path).metadata();
  const nativeWidth = metadata.width || 1200;
  const nativeHeight = metadata.height || 750;
  const width = Math.min(620, nativeWidth);
  return { width, height: Math.max(1, Math.round(width * (nativeHeight / nativeWidth))) };
}

function imageType(path: string): 'jpg' | 'png' | 'gif' | 'bmp' {
  const extension = extname(path).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'jpg';
  if (extension === '.gif') return 'gif';
  if (extension === '.bmp') return 'bmp';
  return 'png';
}