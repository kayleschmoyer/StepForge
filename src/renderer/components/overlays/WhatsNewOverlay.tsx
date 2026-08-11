import { useEffect, useState } from 'react';
import { AppWindow, CheckCircle2, FileText, Globe2, Mail, Send, Sparkles, X } from 'lucide-react';
import type { ComponentType } from 'react';
import type { AppInfo } from '@shared/models/Ipc';
import { useProjectStore } from '@renderer/state/projectStore';

const ACCENT = 'var(--ksr-acc)';

interface ReleaseNote {
  title: string;
  description: string;
  detail: string;
  demo: DemoKind;
  Icon: ComponentType<{ size?: number }>;
}

type DemoKind = 'context' | 'reports' | 'formats' | 'gmail' | 'html' | 'updates';

const RELEASE_NOTES: Record<string, { headline: string; intro: string; notes: ReleaseNote[]; tips: string[] }> = {
  '1.0.22': {
    headline: 'StepForge knows where steps happened',
    intro: 'Reports now include app, page, URL, and window context, plus the full email-sharing workflow from the last release.',
    notes: [
      {
        title: 'App Context Detection',
        description: 'Captured steps now record the app, window title, browser page, URL, host, and confidence when available.',
        detail: 'When you click or type, StepForge stores richer context beside the screenshot so a reviewer knows exactly where the action happened.',
        demo: 'context',
        Icon: Globe2
      },
      {
        title: 'Context in reports',
        description: 'HTML, PDF, Markdown, and DOCX exports can show detected app/page context for each step.',
        detail: 'Tick App context in the export drawer to print App, Page, URL, and Host under each step. StepForge skips the block when it would only repeat the window title or when the recording ran through a remote-session client.',
        demo: 'reports',
        Icon: AppWindow
      },
      {
        title: 'Share any export type',
        description: 'Send full HTML, compact HTML, Markdown, PDF, or DOCX from the export workflow.',
        detail: 'Pick the export format first, then StepForge sends that exact report type through the Share panel.',
        demo: 'formats',
        Icon: Send
      },
      {
        title: 'Gmail defaults',
        description: 'SMTP host, port, sender account, and From address are prefilled for the StepForge Gmail account.',
        detail: 'The Email tab now opens with Gmail host, SSL port, sender, and From address already filled in.',
        demo: 'gmail',
        Icon: Mail
      },
      {
        title: 'Better HTML email',
        description: 'HTML shares now render the report in the email body and attach the HTML file with the right MIME type.',
        detail: 'When HTML is selected, recipients see the report in the message body instead of only a raw attachment preview.',
        demo: 'html',
        Icon: FileText
      },
      {
        title: 'Interactive update demos',
        description: 'Feature cards now open animated examples and shortcuts into the workflows that changed.',
        detail: 'The update screen is now a launchpad: cards explain the new feature, Email settings opens the Email tab, and Try Share Export opens a guided export flow.',
        demo: 'updates',
        Icon: Sparkles
      }
    ],
    tips: [
      'Record a browser workflow, then select a step to see App Context in the inspector.',
      'Open Settings, go to Email, paste the Gmail app password, and press Test settings.',
      'Open Export Report, pick HTML, Markdown, PDF, or DOCX, enter a recipient, and press Share.'
    ]
  }
};

export function WhatsNewOverlay() {
  const settings = useProjectStore((state) => state.settings);
  const setSettings = useProjectStore((state) => state.setSettings);
  const setSettingsOpen = useProjectStore((state) => state.setSettingsOpen);
  const setSettingsSection = useProjectStore((state) => state.setSettingsSection);
  const setExportOpen = useProjectStore((state) => state.setExportOpen);
  const setExportShareTour = useProjectStore((state) => state.setExportShareTour);
  const project = useProjectStore((state) => state.project);
  const setProject = useProjectStore((state) => state.setProject);
  const setRecentProjects = useProjectStore((state) => state.setRecentProjects);
  const setView = useProjectStore((state) => state.setView);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(0);

  useEffect(() => {
    void window.stepForge.app.info().then((info) => {
      setAppInfo(info);
      if (settings.firstRunSetupComplete && settings.lastSeenWhatsNewVersion !== info.version) {
        setOpen(true);
      }
    });
  }, [settings.firstRunSetupComplete, settings.lastSeenWhatsNewVersion]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, appInfo?.version]);

  if (!open || !appInfo) return null;

  const content = RELEASE_NOTES[appInfo.version] ?? fallbackRelease(appInfo.version);
  const activeNote = content.notes[Math.min(selectedNote, content.notes.length - 1)] ?? content.notes[0];

  async function dismiss() {
    if (!appInfo) return;
    const next = await window.stepForge.settings.set({ lastSeenWhatsNewVersion: appInfo.version });
    setSettings(next);
    setOpen(false);
  }

  const openEmailSettings = async () => {
    await dismiss();
    setSettingsSection('email');
    setSettingsOpen(true);
  };

  const openExport = async () => {
    await dismiss();
    let nextProject = project;
    if (!nextProject) {
      const recents = await window.stepForge.project.listRecent();
      setRecentProjects(recents);
      if (recents[0]) nextProject = await window.stepForge.project.openRecent(recents[0].sessionDirectory);
    }
    if (nextProject) {
      setProject(nextProject);
      setView('EDITOR');
      setExportShareTour(true);
    }
    setExportOpen(true);
  };

  return (
    <div
      className="app-no-drag"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        background: 'rgba(3,7,18,0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
    >
      <style>{whatsNewMotionCss}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`StepForge updated to ${appInfo.version}`}
        style={{
          width: 760,
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 48px)',
          overflow: 'hidden',
          borderRadius: 10,
          background: 'var(--ksr-surf-0)',
          border: '1px solid var(--ksr-border-1)',
          boxShadow: '0 28px 90px rgba(0,0,0,0.58)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div
          style={{
            padding: '22px 24px 18px',
            borderBottom: '1px solid var(--ksr-border-0)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 9,
              flexShrink: 0
            }}
          >
            <AnimatedUpdateMark />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: ACCENT, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              Updated to v{appInfo.version}
            </div>
            <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: 'var(--ksr-text-0)', letterSpacing: '-0.02em' }}>
              {content.headline}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ksr-text-2)', lineHeight: 1.55 }}>
              {content.intro}
            </div>
          </div>
          <button
            onClick={() => void dismiss()}
            aria-label="Close what is new"
            style={{
              width: 30,
              height: 30,
              border: 'none',
              borderRadius: 7,
              background: 'transparent',
              color: 'var(--ksr-text-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {content.notes.map(({ title, description, Icon }, index) => {
              const active = index === selectedNote;
              return (
              <button
                key={title}
                onClick={() => setSelectedNote(index)}
                style={{
                  borderRadius: 8,
                  border: active ? '1px solid var(--ksr-acc-border)' : '1px solid var(--ksr-border-0)',
                  background: active ? 'var(--ksr-acc-soft)' : 'var(--ksr-surf-1)',
                  padding: 14,
                  display: 'flex',
                  gap: 11,
                  minWidth: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: active ? 'var(--ksr-acc-shadow-sm)' : 'none'
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    background: active ? 'rgba(14,165,233,0.18)' : 'var(--ksr-surf-2)',
                    color: ACCENT,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Icon size={15} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ksr-text-0)' }}>{title}</div>
                  <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--ksr-text-3)', lineHeight: 1.45 }}>{description}</div>
                </div>
              </button>
            );})}
          </div>

          {activeNote && <FeatureDetail note={activeNote} />}

          <div
            style={{
              marginTop: 16,
              borderRadius: 8,
              border: '1px solid var(--ksr-acc-border)',
              background: 'var(--ksr-acc-soft)',
              padding: 14
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: ACCENT, fontSize: 12, fontWeight: 900 }}>
              <CheckCircle2 size={15} /> Quick tour
            </div>
            <div style={{ display: 'grid', gap: 8, marginTop: 11 }}>
              {content.tips.map((tip, index) => (
                <div key={tip} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: ACCENT,
                      color: 'var(--ksr-text-inverse)',
                      fontSize: 10,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ksr-text-1)', lineHeight: 1.45 }}>{tip}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '14px 18px',
            borderTop: '1px solid var(--ksr-border-0)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            background: 'var(--ksr-surf-0)'
          }}
        >
          <button onClick={() => void dismiss()} style={secondaryButtonStyle}>
            Got it
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => void openEmailSettings()} style={secondaryButtonStyle}>
              Email settings
            </button>
            <button onClick={() => void openExport()} style={primaryButtonStyle}>
              Try Share Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function fallbackRelease(version: string) {
  return {
    headline: 'StepForge is updated',
    intro: `You are now running StepForge v${version}.`,
    notes: [
      {
        title: 'Latest improvements',
        description: 'This update includes the newest fixes and workflow improvements.',
        detail: 'Open the updated workflows to see the latest StepForge improvements in context.',
        demo: 'updates' as DemoKind,
        Icon: Sparkles
      }
    ],
    tips: ['Open Settings or Export Report to explore what changed.']
  };
}

function AnimatedUpdateMark() {
  return (
    <div className="whats-new-mark" aria-hidden="true">
      <div className="whats-new-mark-ring" />
      <Sparkles size={21} className="whats-new-mark-icon" />
    </div>
  );
}

function FeatureDetail({ note }: { note: ReleaseNote }) {
  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: 8,
        border: '1px solid var(--ksr-border-1)',
        background: 'var(--ksr-surf-1)',
        display: 'grid',
        gridTemplateColumns: '1fr 1.1fr',
        overflow: 'hidden'
      }}
    >
      <div style={{ padding: 15, borderRight: '1px solid var(--ksr-border-0)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: ACCENT, fontSize: 12, fontWeight: 900 }}>
          <note.Icon size={15} /> {note.title}
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ksr-text-2)', lineHeight: 1.5 }}>{note.detail}</div>
      </div>
      <DemoStage kind={note.demo} />
    </div>
  );
}

function DemoStage({ kind }: { kind: DemoKind }) {
  const labels: Record<DemoKind, string[]> = {
    context: ['Window captured', 'URL detected', 'Context saved'],
    reports: ['App shown', 'Page included', 'Host exported'],
    formats: ['HTML selected', 'Recipient added', 'Share sent'],
    gmail: ['smtp.gmail.com', '465 SSL', 'From prefilled'],
    html: ['Report body', 'HTML attached', 'Delivered cleanly'],
    updates: ['Version detected', 'Notes opened', 'Workflow shortcut']
  };
  return (
    <div className={`whats-new-demo whats-new-demo-${kind}`}>
      <div className="whats-new-demo-top">
        <span />
        <span />
        <span />
      </div>
      <div className="whats-new-demo-body">
        {labels[kind].map((label, index) => (
          <div key={label} className="whats-new-demo-row" style={{ animationDelay: `${index * 0.38}s` }}>
            <div className="whats-new-demo-dot">{index + 1}</div>
            <div className="whats-new-demo-line">{label}</div>
          </div>
        ))}
        <div className="whats-new-demo-cursor" />
      </div>
    </div>
  );
}

const whatsNewMotionCss = `
@keyframes whatsNewSpin { to { transform: rotate(360deg); } }
@keyframes whatsNewPulse { 0%,100% { transform: scale(1); opacity: .92; } 50% { transform: scale(1.08); opacity: 1; } }
@keyframes whatsNewSweep { 0% { transform: translateX(-18%); } 50% { transform: translateX(152%); } 100% { transform: translateX(-18%); } }
@keyframes whatsNewRow { 0%,100% { opacity: .58; transform: translateX(0); } 35%,65% { opacity: 1; transform: translateX(6px); } }
.whats-new-mark { position: relative; width: 44px; height: 44px; border-radius: 10px; display: grid; place-items: center; background: #0b1220; overflow: hidden; box-shadow: 0 0 0 1px rgba(56,189,248,.32), 0 12px 34px rgba(14,165,233,.25); }
.whats-new-mark-ring { position: absolute; inset: -12px; background: conic-gradient(#4285f4, #34a853, #fbbc05, #ea4335, #4285f4); animation: whatsNewSpin 1.35s linear infinite; }
.whats-new-mark::after { content: ''; position: absolute; inset: 2px; border-radius: 8px; background: var(--ksr-surf-1); }
.whats-new-mark-icon { position: relative; z-index: 1; color: #7dd3fc; animation: whatsNewPulse 1.1s ease-in-out infinite; }
.whats-new-demo { min-height: 152px; background: #07111f; position: relative; overflow: hidden; }
.whats-new-demo::before { content: ''; position: absolute; top: 0; bottom: 0; width: 42%; background: linear-gradient(90deg, transparent, rgba(125,211,252,.18), transparent); animation: whatsNewSweep 2.4s ease-in-out infinite; }
.whats-new-demo-top { height: 30px; display: flex; gap: 6px; align-items: center; padding: 0 12px; border-bottom: 1px solid rgba(148,163,184,.16); position: relative; z-index: 1; }
.whats-new-demo-top span { width: 7px; height: 7px; border-radius: 999px; background: rgba(125,211,252,.72); }
.whats-new-demo-body { position: relative; z-index: 1; padding: 14px; display: grid; gap: 10px; }
.whats-new-demo-row { display: flex; align-items: center; gap: 9px; animation: whatsNewRow 2.6s ease-in-out infinite; }
.whats-new-demo-dot { width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center; background: rgba(56,189,248,.18); color: #7dd3fc; font-size: 10px; font-weight: 900; border: 1px solid rgba(56,189,248,.32); }
.whats-new-demo-line { height: 26px; flex: 1; border-radius: 7px; background: rgba(15,23,42,.9); border: 1px solid rgba(148,163,184,.14); color: #cbd5e1; display: flex; align-items: center; padding: 0 10px; font-size: 11px; font-weight: 800; }
.whats-new-demo-cursor { position: absolute; width: 14px; height: 14px; right: 42px; bottom: 30px; border-radius: 999px; background: #38bdf8; box-shadow: 0 0 0 6px rgba(56,189,248,.18); animation: whatsNewPulse 1.2s ease-in-out infinite; }
`;

const secondaryButtonStyle: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 7,
  border: '1px solid var(--ksr-border-1)',
  background: 'var(--ksr-surf-2)',
  color: 'var(--ksr-text-1)',
  cursor: 'pointer',
  fontFamily: 'var(--ksr-font-sans)',
  fontSize: 12,
  fontWeight: 800
};

const primaryButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  border: 'none',
  background: ACCENT,
  color: 'var(--ksr-text-inverse)',
  boxShadow: 'var(--ksr-acc-shadow-md)'
};
