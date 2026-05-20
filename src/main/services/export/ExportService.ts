import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { ExportOptions, ExportResult } from '@shared/models/Ipc';
import type { Project } from '@shared/models/Project';
import { exportDocx } from './DocxExport';
import { renderReportHtml } from './HtmlExport';
import { exportMarkdown } from './MarkdownExport';
import { exportPdf } from './PdfExport';
import { diagnostics } from '../diagnostics/DiagnosticsStore';

export class ExportService {
  async run(project: Project, options: ExportOptions): Promise<ExportResult> {
    await mkdir(dirname(options.outputPath), { recursive: true });
    diagnostics.record('info', 'export', `Export started: ${options.format}`);
    let result: ExportResult;
    if (options.format === 'Markdown') result = await exportMarkdown(project, options);
    else if (options.format === 'Pdf') result = await exportPdf(project, options);
    else if (options.format === 'Docx') result = await exportDocx(project, options);
    else {
      const html = await renderReportHtml(project, options);
      await writeFile(options.outputPath, html, 'utf-8');
      const outputStat = await stat(options.outputPath);
      result = { outputPath: options.outputPath, sizeBytes: outputStat.size };
    }
    diagnostics.record('info', 'export', `Export completed: ${result.outputPath}`);
    return result;
  }
}