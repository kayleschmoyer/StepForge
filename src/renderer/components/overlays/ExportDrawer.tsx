import { useEffect, useState } from 'react';
import { Copy, Download, ExternalLink, FolderOpen, X, Check, FileText, Printer } from 'lucide-react';
import type { ComponentType } from 'react';
import { useProjectStore } from '@renderer/state/projectStore';
import { defaultExportOptions, type ExportFormat } from '@shared/models/Ipc';
import type { Project } from '@shared/models/Project';
import { ReportPreview } from '../editor/ReportPreview';

const ACCENT = '#00c4ff';

interface FormatDef {
  id: ExportFormat;
  label: string;
  Icon: ComponentType<{ size?: number }>;
  sub: string;
  extension: string;
}

const FORMATS: FormatDef[] = [
  { id: 'HtmlFull', label: 'HTML — Full', Icon: FileText, sub: 'Cover page, metadata, gallery', extension: 'html' },
  {
    id: 'HtmlCompact',
    label: 'HTML — Compact',
    Icon: FileText,
    sub: 'Single-page, share-friendly',
    extension: 'html'
  },
  { id: 'Markdown', label: 'Markdown', Icon: FileText, sub: 'Paste into GitHub / Jira', extension: 'md' },
  { id: 'Pdf', label: 'PDF', Icon: Printer, sub: 'Print-ready layout', extension: 'pdf' },
  { id: 'Docx', label: 'DOCX', Icon: FileText, sub: 'Editable Word document', extension: 'docx' }
];

type Phase = 'idle' | 'exporting' | 'done' | 'error';

export function ExportDrawer() {
  const open = useProjectStore((s) => s.exportOpen);
  const setOpen = useProjectStore((s) => s.setExportOpen);
  const project = useProjectStore((s) => s.project);

  const [format, setFormat] = useState<ExportFormat>('HtmlFull');
  const [opts, setOpts] = useState({
    screenshots: true,
    timestamps: true,
    notes: true,
    branding: true,
    embed: true
  });
  const [outputPath, setOutputPath] = useState('');
  const [exportedPath, setExportedPath] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy');

  useEffect(() => {
    if (!open) {
      setPhase('idle');
      setErrorMsg('');
      setCopyLabel('Copy');
    }
  }, [open]);

  useEffect(() => {
    if (!project) return;
    const slug = slugify(project.metadata.title || project.metadata.jiraKey || 'report');
    const ext = FORMATS.find((f) => f.id === format)?.extension ?? 'html';
    setOutputPath(`${trimTrailingSlash(project.sessionDirectory || '.')}\\${slug}.${ext}`);
  }, [format, project]);

  if (!project) return null;

  const resetExportState = () => {
    if (phase === 'exporting') return;
    setPhase('idle');
    setErrorMsg('');
    setExportedPath('');
  };

  const handleFormatChange = (nextFormat: ExportFormat) => {
    setFormat(nextFormat);
    resetExportState();
  };

  const toggle = (k: keyof typeof opts) => {
    setOpts((o) => ({ ...o, [k]: !o[k] }));
    resetExportState();
  };
  const xrayText = buildXrayText(project);

  const handleCopyXray = async () => {
    await copyText(xrayText);
    setCopyLabel('Copied');
    window.setTimeout(() => setCopyLabel('Copy'), 1200);
  };

  const handleBrowse = async () => {
    const ext = FORMATS.find((f) => f.id === format)?.extension ?? 'html';
    const chosen = await window.stepForge.dialog.openSave({
      defaultPath: outputPath,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }]
    });
    if (chosen) {
      setOutputPath(chosen);
      resetExportState();
    }
  };

  const handleExport = async () => {
    setPhase('exporting');
    setErrorMsg('');
    try {
      const result = await window.stepForge.export.run({
        ...defaultExportOptions,
        format,
        outputPath,
        includeScreenshots: opts.screenshots,
        includeTimestamps: opts.timestamps,
        includeNotes: opts.notes,
        includeCompanyBranding: opts.branding,
        embedImagesAsBase64: opts.embed
      });
      setExportedPath(result.outputPath);
      setPhase('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 40,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.18s'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 520,
          zIndex: 41,
          background: 'var(--ksr-surf-0)',
          borderLeft: '1px solid var(--ksr-border-1)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(540px)',
          transition: 'transform 0.24s cubic-bezier(0.32, 0.72, 0, 1)'
        }}
      >
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--ksr-border-0)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <Download size={16} color={ACCENT} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--ksr-text-0)',
                letterSpacing: '-0.02em'
              }}
            >
              Export Report
            </div>
            <div style={{ fontSize: 11, color: 'var(--ksr-text-3)', marginTop: 2 }}>
              {project.steps.length} steps ready · {project.metadata.app || '—'}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              width: 28,
              height: 28,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--ksr-text-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}
        >
          <div>
            <Label>Format</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {FORMATS.map((f) => {
                const active = format === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleFormatChange(f.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      background: active ? 'var(--ksr-acc-soft)' : 'var(--ksr-surf-1)',
                      border: `1px solid ${active ? 'var(--ksr-acc-border)' : 'var(--ksr-border-0)'}`,
                      color: active ? 'var(--ksr-text-0)' : 'var(--ksr-text-1)'
                    }}
                  >
                    <f.Icon size={15} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          letterSpacing: '-0.01em'
                        }}
                      >
                        {f.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: 'var(--ksr-text-3)',
                          marginTop: 2
                        }}
                      >
                        {f.sub}
                      </div>
                    </div>
                    {active && <Check size={14} color={ACCENT} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Include</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <CheckRow label="Screenshots" on={opts.screenshots} onToggle={() => toggle('screenshots')} />
              <CheckRow label="Timestamps" on={opts.timestamps} onToggle={() => toggle('timestamps')} />
              <CheckRow label="Notes" on={opts.notes} onToggle={() => toggle('notes')} />
              <CheckRow
                label="Company branding"
                on={opts.branding}
                onToggle={() => toggle('branding')}
              />
              <CheckRow
                label="Embed images (Base64)"
                on={opts.embed}
                onToggle={() => toggle('embed')}
              />
            </div>
          </div>

          <div>
            <Label>Destination</Label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={outputPath}
                onChange={(e) => {
                  setOutputPath(e.target.value);
                  resetExportState();
                }}
                style={{
                  flex: 1,
                  padding: '8px 11px',
                  borderRadius: 7,
                  background: 'var(--ksr-surf-1)',
                  color: 'var(--ksr-text-1)',
                  border: '1px solid var(--ksr-border-1)',
                  fontFamily: 'var(--ksr-font-mono)',
                  fontSize: 11,
                  outline: 'none'
                }}
              />
              <button
                onClick={handleBrowse}
                style={{
                  padding: '8px 14px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  background: 'var(--ksr-surf-2)',
                  color: 'var(--ksr-text-1)',
                  border: '1px solid var(--ksr-border-1)',
                  fontSize: 11,
                  fontWeight: 600
                }}
              >
                Browse…
              </button>
            </div>
          </div>

          <div>
            <Label>Xray / Jira</Label>
            <div
              style={{
                borderRadius: 8,
                border: '1px solid var(--ksr-border-1)',
                background: 'var(--ksr-surf-1)',
                overflow: 'hidden'
              }}
            >
              <textarea
                value={xrayText}
                readOnly
                style={{
                  width: '100%',
                  height: 128,
                  resize: 'vertical',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--ksr-text-1)',
                  fontFamily: 'var(--ksr-font-mono)',
                  fontSize: 11,
                  lineHeight: 1.45,
                  padding: 10
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  padding: '8px 10px',
                  borderTop: '1px solid var(--ksr-border-0)'
                }}
              >
                <button onClick={handleCopyXray} style={smallButtonStyle}>
                  <Copy size={12} /> {copyLabel}
                </button>
              </div>
            </div>
          </div>

          <div>
            <Label>Preview</Label>
            <div
              style={{
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid var(--ksr-border-1)',
                background: '#fff',
                height: 220,
                position: 'relative'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  transform: 'scale(0.34)',
                  transformOrigin: 'top left',
                  width: `${100 / 0.34}%`,
                  height: `${100 / 0.34}%`
                }}
              >
                <ReportPreview
                  project={project}
                  mode={format === 'HtmlCompact' ? 'compact' : 'full'}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--ksr-border-0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: 'var(--ksr-surf-0)'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                maxWidth: '100%',
                padding: '7px 10px',
                borderRadius: 7,
                background: phase === 'done'
                  ? 'rgba(52,199,89,0.12)'
                  : phase === 'error'
                    ? 'rgba(255,59,48,0.12)'
                    : 'var(--ksr-surf-1)',
                color: phase === 'done'
                  ? 'var(--ksr-ok-text)'
                  : phase === 'error'
                    ? 'var(--ksr-bug-text)'
                    : 'var(--ksr-text-3)',
                border: phase === 'done'
                  ? '1px solid rgba(52,199,89,0.22)'
                  : phase === 'error'
                    ? '1px solid rgba(255,59,48,0.22)'
                    : '1px solid var(--ksr-border-0)',
                fontSize: 11.5,
                fontWeight: 700
              }}
            >
              {phase === 'done' && <Check size={13} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {phase === 'done'
                  ? `Exported ${fileNameFromPath(exportedPath)}`
                  : phase === 'error'
                    ? `Failed: ${errorMsg}`
                    : phase === 'exporting'
                      ? 'Rendering and saving...'
                      : `Ready to export ${project.steps.length} steps`}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {phase === 'done' && exportedPath && (
              <>
                <button onClick={() => void window.stepForge.app.openPath(exportedPath)} style={smallButtonStyle}>
                  <ExternalLink size={12} /> Open
                </button>
                <button onClick={() => window.stepForge.app.showItemInFolder(exportedPath)} style={smallButtonStyle}>
                  <FolderOpen size={12} /> Folder
                </button>
              </>
            )}
            <button onClick={() => setOpen(false)} style={secondaryFooterButtonStyle}>
              Close
            </button>
            <button
              onClick={handleExport}
              disabled={phase === 'exporting' || !outputPath}
              style={{
                ...primaryFooterButtonStyle,
                cursor: phase === 'exporting' ? 'wait' : 'pointer',
                background: phase === 'exporting' ? 'var(--ksr-surf-2)' : ACCENT,
                color: phase === 'exporting' ? 'var(--ksr-text-2)' : 'var(--ksr-text-inverse)',
                boxShadow: phase === 'exporting' ? 'none' : `0 0 20px ${ACCENT}40`
              }}
            >
              {phase === 'exporting' ? <Spinner /> : <Download size={13} />}
              {phase === 'exporting' ? 'Exporting...' : phase === 'done' ? 'Export again' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        color: 'var(--ksr-text-3)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        marginBottom: 9
      }}
    >
      {children}
    </div>
  );
}

function CheckRow({
  label,
  on,
  onToggle
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 7,
        cursor: 'pointer',
        textAlign: 'left',
        background: on ? 'var(--ksr-surf-1)' : 'transparent',
        border: `1px solid ${on ? 'var(--ksr-border-1)' : 'transparent'}`
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: on ? ACCENT : 'transparent',
          border: `1px solid ${on ? ACCENT : 'var(--ksr-border-2)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: on ? `0 0 10px ${ACCENT}50` : 'none'
        }}
      >
        {on && <Check size={11} color="var(--ksr-text-inverse)" strokeWidth={3} />}
      </div>
      <span style={{ fontSize: 12, color: 'var(--ksr-text-1)' }}>{label}</span>
    </button>
  );
}

function Spinner() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      style={{ animation: 'spin 0.8s linear infinite' }}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" fill="none" />
      <path
        d="M 12 3 A 9 9 0 0 1 21 12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'report';
}

function trimTrailingSlash(value: string): string {
  return value.replace(/[\\/]+$/g, '');
}

function fileNameFromPath(value: string): string {
  return value.split(/[\\/]/).filter(Boolean).pop() || 'report';
}

function buildXrayText(project: Project): string {
  const meta = project.metadata;
  const visibleSteps = project.steps.filter((step) => !step.isDeleted);
  const lines = [
    `Title: ${meta.jiraKey ? `${meta.jiraKey} - ` : ''}${meta.title || 'QA Session Report'}`,
    `Tester: ${meta.tester || '-'}`,
    `Environment: ${meta.env || '-'}`,
    `Build: ${meta.build || '-'}`,
    '',
    'Expected:',
    meta.expected || '-',
    '',
    'Actual:',
    meta.actual || '-',
    '',
    'Steps:'
  ];
  visibleSteps.forEach((step) => {
    lines.push(`${step.stepNumber}. ${step.description}`);
    if (step.userNote) lines.push(`   Note: ${step.userNote}`);
  });
  lines.push('', `Attachments: ${visibleSteps.filter((step) => step.screenshotPath).length} screenshot(s)`);
  return lines.join('\n');
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

const smallButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 7,
  border: '1px solid var(--ksr-border-1)',
  background: 'var(--ksr-surf-2)',
  color: 'var(--ksr-text-1)',
  cursor: 'pointer',
  fontFamily: 'var(--ksr-font-sans)',
  fontSize: 11,
  fontWeight: 700
};

const secondaryFooterButtonStyle: React.CSSProperties = {
  padding: '8px 13px',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  background: 'transparent',
  color: 'var(--ksr-text-2)',
  border: '1px solid var(--ksr-border-1)',
  fontFamily: 'var(--ksr-font-sans)'
};

const primaryFooterButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  minWidth: 112,
  padding: '9px 16px',
  borderRadius: 8,
  border: 'none',
  fontSize: 13,
  fontWeight: 800,
  fontFamily: 'var(--ksr-font-sans)'
};
