import { app } from 'electron';
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import nodemailer from 'nodemailer';
import type { AppSettings } from '@shared/models/AppSettings';
import type { EmailSettingsTestResult, ExportOptions, ExportSharePayload, ExportShareResult } from '@shared/models/Ipc';
import type { Project } from '@shared/models/Project';
import type { SettingsStore } from '../settings/SettingsStore';
import { diagnostics } from '../diagnostics/DiagnosticsStore';
import { ExportService } from './ExportService';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class EmailShareService {
  constructor(
    private settings: SettingsStore,
    private exporter: ExportService
  ) {}

  async testSettings(): Promise<EmailSettingsTestResult> {
    const settings = await this.settings.load();
    const password = await this.settings.getEmailSmtpPassword();
    this.validateSettings(settings, password);
    const transporter = this.createTransporter(settings, password);
    try {
      await transporter.verify();
    } catch (error) {
      throw this.friendlySendError(error, settings);
    }
    return {
      ok: true,
      message: `SMTP login verified for ${settings.emailSmtpUser.trim()} using ${settings.emailSmtpHost.trim()}:${settings.emailSmtpPort}.`
    };
  }

  async share(project: Project, payload: ExportSharePayload): Promise<ExportShareResult> {
    const recipientEmail = payload.recipientEmail.trim();
    if (!EMAIL_PATTERN.test(recipientEmail)) throw new Error('Enter a valid recipient email address.');

    const settings = await this.settings.load();
    const password = await this.settings.getEmailSmtpPassword();
    this.validateSettings(settings, password);

    const transporter = this.createTransporter(settings, password);

    try {
      await transporter.verify();
    } catch (error) {
      throw this.friendlySendError(error, settings);
    }

    const outputPath = await this.buildSharePath(project, payload.options.format);
    const exportOptions: ExportOptions = {
      ...payload.options,
      outputPath,
      includeScreenshots: payload.options.format === 'Markdown' ? false : payload.options.includeScreenshots,
      embedImagesAsBase64: payload.options.format === 'HtmlFull' || payload.options.format === 'HtmlCompact'
        ? true
        : payload.options.embedImagesAsBase64
    };
    const result = await this.exporter.run(project, exportOptions);

    diagnostics.record('info', 'email', `Email share started: ${payload.options.format} to ${recipientEmail}`);
    const fromAddress = settings.emailFromAddress.trim() || settings.emailSmtpUser.trim();
    const fromName = settings.emailFromName.trim() || 'StepForge';
    const attachmentName = result.outputPath.split(/[\\/]/).pop() || 'StepForge-export';
    const htmlBody = isHtmlFormat(payload.options.format)
      ? await readFile(result.outputPath, 'utf-8')
      : this.bodyHtml(project);
    try {
      await transporter.sendMail({
        from: `${quoteAddressName(fromName)} <${fromAddress}>`,
        to: recipientEmail,
        subject: this.subject(project),
        text: this.body(project),
        html: htmlBody,
        attachments: [
          {
            filename: attachmentName,
            path: result.outputPath,
            contentType: contentTypeFor(payload.options.format),
            contentDisposition: 'attachment'
          }
        ]
      });
    } catch (error) {
      throw this.friendlySendError(error, settings);
    }
    diagnostics.record('info', 'email', `Email share completed: ${result.outputPath}`);
    return { ...result, recipientEmail };
  }

  private validateSettings(settings: AppSettings, password: string): void {
    if (!settings.emailSharingEnabled) throw new Error('Email sharing is disabled in Settings.');
    if (!settings.emailSmtpHost.trim()) throw new Error('SMTP host is required in Email settings.');
    if (!settings.emailSmtpPort || settings.emailSmtpPort < 1) throw new Error('SMTP port is required in Email settings.');
    if (!settings.emailSmtpUser.trim()) throw new Error('SMTP username is required in Email settings.');
    if (!password) throw new Error('SMTP app password is required in Email settings.');
    const fromAddress = settings.emailFromAddress.trim() || settings.emailSmtpUser.trim();
    if (!EMAIL_PATTERN.test(fromAddress)) throw new Error('From address must be a valid email address.');
    if (isGmailHost(settings.emailSmtpHost) && fromAddress.toLowerCase() !== settings.emailSmtpUser.trim().toLowerCase()) {
      throw new Error('For Gmail, From address and SMTP username must be the same Gmail account unless that sender alias is configured in Gmail.');
    }
  }

  private createTransporter(settings: AppSettings, password: string) {
    return nodemailer.createTransport({
      host: settings.emailSmtpHost.trim(),
      port: settings.emailSmtpPort,
      secure: settings.emailSmtpSecure,
      auth: {
        user: settings.emailSmtpUser.trim(),
        pass: password
      }
    });
  }

  private async buildSharePath(project: Project, format: ExportOptions['format']): Promise<string> {
    const directory = join(app.getPath('temp'), 'StepForge', 'shares', project.sessionId);
    await mkdir(directory, { recursive: true });
    const baseName = slugify(project.metadata.jiraKey || project.metadata.title || 'report');
    return join(directory, `${baseName}-${Date.now()}.${extensionFor(format)}`);
  }

  private subject(project: Project): string {
    const prefix = project.metadata.jiraKey ? `${project.metadata.jiraKey} - ` : '';
    return `${prefix}${project.metadata.title || 'StepForge Report'}`;
  }

  private body(project: Project): string {
    return [
      'Attached is the StepForge export.',
      '',
      `JIRA: ${project.metadata.jiraKey || '-'}`,
      `Description: ${project.metadata.title || '-'}`,
      `Machine tested on: ${project.metadata.machineTestedOn || '-'}`,
      `Version: ${project.metadata.build || '-'}`
    ].join('\n');
  }

  private bodyHtml(project: Project): string {
    return `<!doctype html><html><body style="margin:0;padding:24px;background:#f8fafc;color:#172033;font-family:Segoe UI,Arial,sans-serif"><div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #dbe3ef;border-radius:10px;padding:22px"><div style="font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#0ea5e9">StepForge export attached</div><h1 style="margin:8px 0 14px;font-size:22px;color:#0f172a">${escapeHtml(project.metadata.title || 'QA Session Report')}</h1><p style="margin:0 0 16px;color:#475569;font-size:13px;line-height:1.5">The selected StepForge export is attached to this email.</p><table style="width:100%;border-collapse:collapse;font-size:13px"><tr><td style="padding:8px;border-top:1px solid #e2e8f0;color:#64748b;font-weight:700">JIRA</td><td style="padding:8px;border-top:1px solid #e2e8f0">${escapeHtml(project.metadata.jiraKey || '-')}</td></tr><tr><td style="padding:8px;border-top:1px solid #e2e8f0;color:#64748b;font-weight:700">Machine tested on</td><td style="padding:8px;border-top:1px solid #e2e8f0">${escapeHtml(project.metadata.machineTestedOn || '-')}</td></tr><tr><td style="padding:8px;border-top:1px solid #e2e8f0;color:#64748b;font-weight:700">Version</td><td style="padding:8px;border-top:1px solid #e2e8f0">${escapeHtml(project.metadata.build || '-')}</td></tr></table></div></body></html>`;
  }

  private friendlySendError(error: unknown, settings: AppSettings): Error {
    const message = error instanceof Error ? error.message : String(error);
    const smtpUser = settings.emailSmtpUser.trim();
    const host = settings.emailSmtpHost.trim();
    const hostPort = `${host}:${settings.emailSmtpPort}`;
    if (/535|BadCredentials|Username and Password not accepted/i.test(message)) {
      return new Error(
        `Gmail rejected the SMTP login for ${smtpUser}. Fix: open the same Google account, confirm 2-Step Verification is on, delete the old app password, create a new Mail app password, paste it into StepForge, and save it again. Do not use the normal Gmail password.`
      );
    }
    if (/EAUTH|Invalid login|authentication failed/i.test(message)) {
      return new Error(`SMTP authentication failed for ${smtpUser}. Fix: confirm the SMTP username is the account that owns the password, re-save the app password, then run Test settings again.`);
    }
    if (/ENOTFOUND|getaddrinfo|Name or service not known/i.test(message)) {
      return new Error(`StepForge could not find SMTP host ${host}. Fix: check the SMTP host spelling. Gmail should use smtp.gmail.com.`);
    }
    if (/ECONNREFUSED|ECONNECTION|connect ECONNREFUSED/i.test(message)) {
      return new Error(`StepForge could not connect to ${hostPort}. Fix: check the host, port, network, VPN, firewall, or antivirus rules. Gmail usually uses smtp.gmail.com port 465 with SSL/TLS on.`);
    }
    if (/ETIMEDOUT|timeout|Greeting never received/i.test(message)) {
      return new Error(`The SMTP connection to ${hostPort} timed out. Fix: check network/firewall access. For Gmail, use port 465 with SSL/TLS on, or port 587 with SSL/TLS off so STARTTLS can be used.`);
    }
    if (/certificate|self-signed|unable to verify/i.test(message)) {
      return new Error(`The SMTP server certificate could not be verified for ${hostPort}. Fix: check SSL/TLS settings and any antivirus mail scanning. Gmail should use SSL/TLS on port 465.`);
    }
    return error instanceof Error ? error : new Error(message);
  }
}

function extensionFor(format: ExportOptions['format']): string {
  if (format === 'Docx') return 'docx';
  if (format === 'Pdf') return 'pdf';
  if (format === 'Markdown') return 'md';
  return 'html';
}

function contentTypeFor(format: ExportOptions['format']): string {
  if (format === 'Docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (format === 'Pdf') return 'application/pdf';
  if (format === 'Markdown') return 'text/markdown; charset=utf-8';
  return 'text/html; charset=utf-8';
}

function isHtmlFormat(format: ExportOptions['format']): boolean {
  return format === 'HtmlFull' || format === 'HtmlCompact';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'report';
}

function quoteAddressName(value: string): string {
  return `"${value.replace(/["\\]/g, '')}"`;
}

function isGmailHost(value: string): boolean {
  return value.trim().toLowerCase() === 'smtp.gmail.com';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);
}
