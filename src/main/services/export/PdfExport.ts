import { BrowserWindow } from 'electron';
import { writeFile } from 'node:fs/promises';
import type { ExportOptions, ExportResult } from '@shared/models/Ipc';
import type { Project } from '@shared/models/Project';
import { renderReportHtml } from './HtmlExport';

export async function exportPdf(project: Project, options: ExportOptions): Promise<ExportResult> {
  const html = await renderReportHtml(project, options);
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdf = await window.webContents.printToPDF({ printBackground: true, pageSize: 'Letter' });
    await writeFile(options.outputPath, pdf);
    return { outputPath: options.outputPath, sizeBytes: pdf.byteLength };
  } finally {
    window.destroy();
  }
}