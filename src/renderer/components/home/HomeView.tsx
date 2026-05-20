import { useEffect, useState } from 'react';
import {
  CircleDot,
  Folder,
  Upload,
  FileText,
  History
} from 'lucide-react';
import { useProjectStore } from '@renderer/state/projectStore';
import type { AppInfo } from '@shared/models/Ipc';
import type { RecentProject } from '@shared/models/Project';
import { timeOfDayGreeting, formatTimestampLong } from '@shared/util/time';
import { startRecordingWithDetails } from '@renderer/services/startRecordingWithDetails';

const ACCENT = '#00c4ff';

export function HomeView() {
  const recovery = useProjectStore((s) => s.unsavedRecovery);
  const setUnsavedRecovery = useProjectStore((s) => s.setUnsavedRecovery);
  const setProject = useProjectStore((s) => s.setProject);
  const setView = useProjectStore((s) => s.setView);
  const recentProjects = useProjectStore((s) => s.recentProjects);
  const setRecentProjects = useProjectStore((s) => s.setRecentProjects);

  useEffect(() => {
    void window.stepForge.recovery.check().then(setUnsavedRecovery);
    void window.stepForge.project.listRecent().then(setRecentProjects);
  }, [setUnsavedRecovery, setRecentProjects]);

  const greeting = `${timeOfDayGreeting()}, ${getFirstName(useProjectStore.getState().settings.defaultTesterName)}.`;

  const handleStartRecording = async () => {
    await startRecordingWithDetails();
  };

  const handleOpenSession = async () => {
    const project = await window.stepForge.project.open();
    if (project) {
      setProject(project);
      setView('EDITOR');
    }
  };

  const handleImportScreenshots = async () => {
    const path = await window.stepForge.dialog.openFile({
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }],
      properties: ['openFile', 'multiSelections']
    });
    if (path) {
      console.log('Import (not yet implemented):', path);
    }
  };

  const handleRestore = async () => {
    const project = await window.stepForge.recovery.restore();
    setUnsavedRecovery(null);
    setProject(project);
    setView('EDITOR');
  };

  const handleDismissRecovery = async () => {
    await window.stepForge.recovery.dismiss();
    setUnsavedRecovery(null);
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        overflow: 'auto',
        background: 'var(--ksr-bg)',
        position: 'relative'
      }}
    >
      {/* Ambient glows */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${ACCENT}22, transparent 70%)`,
          pointerEvents: 'none',
          filter: 'blur(40px)'
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: -120,
          left: -120,
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.18), transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(50px)'
        }}
      />

      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 56px 32px',
          maxWidth: 1080,
          margin: '0 auto',
          width: '100%'
        }}
      >
        {/* Greeting */}
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: ACCENT,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: ACCENT,
                boxShadow: `0 0 8px ${ACCENT}`
              }}
            />
            Ready to record
          </div>
          <h1
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: 'var(--ksr-text-0)',
              letterSpacing: '-0.04em',
              marginTop: 12,
              fontFamily: 'var(--ksr-font-sans)',
              lineHeight: 1.05
            }}
          >
            {greeting}
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'var(--ksr-text-2)',
              marginTop: 10,
              maxWidth: 520,
              lineHeight: 1.55
            }}
          >
            Capture clicks, keystrokes and scrolls. Annotate the screenshots. Export a polished,
            self-contained bug report.
          </p>
        </div>

        {/* Recovery banner */}
        {recovery && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 18px',
              borderRadius: 12,
              background: 'var(--ksr-imp-bg)',
              border: '1px solid var(--ksr-imp-border)',
              marginBottom: 28
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(245,158,11,0.18)',
                color: 'var(--ksr-imp-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <History size={17} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--ksr-imp-text)',
                  fontWeight: 700,
                  letterSpacing: '-0.01em'
                }}
              >
                Restore unsaved session?
              </div>
              <div style={{ fontSize: 12, color: 'var(--ksr-text-2)', marginTop: 2 }}>
                A previous session with {recovery.steps} steps was not closed cleanly (
                {formatTimestampLong(recovery.startedAt)}).
              </div>
            </div>
            <PillButton variant="ghost" onClick={handleDismissRecovery}>
              Dismiss
            </PillButton>
            <PillButton variant="primary" onClick={handleRestore}>
              Restore
            </PillButton>
          </div>
        )}

        {/* Primary action grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr',
            gap: 14,
            marginBottom: 36
          }}
        >
          <PrimaryCard onClick={handleStartRecording} />
          <SecondaryCard
            icon={<Folder size={17} />}
            title="Open session"
            sub="Resume a saved .ksr project"
            onClick={handleOpenSession}
          />
          <SecondaryCard
            icon={<Upload size={17} />}
            title="Import screenshots"
            sub="Build a manual report from images"
            onClick={handleImportScreenshots}
          />
        </div>

        {/* Recent */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 12
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--ksr-text-3)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase'
            }}
          >
            Recent Sessions
          </div>
          <div style={{ height: 1, flex: 1, background: 'var(--ksr-border-0)' }} />
          <button
            style={{
              fontSize: 11,
              color: 'var(--ksr-text-2)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            View all →
          </button>
        </div>

        {recentProjects.length === 0 ? (
          <div
            style={{
              padding: '32px 20px',
              borderRadius: 10,
              border: '1px dashed var(--ksr-border-1)',
              background: 'var(--ksr-surf-0)',
              color: 'var(--ksr-text-3)',
              fontSize: 12,
              textAlign: 'center'
            }}
          >
            No recent sessions yet. Start your first recording when you are ready.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {recentProjects.slice(0, 8).map((r) => (
              <RecentRow
                key={r.sessionId}
                project={r}
                onClick={async () => {
                  const project = await window.stepForge.project.openRecent(r.sessionDirectory);
                  setProject(project);
                  setView('EDITOR');
                }}
              />
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        <FooterHints />
      </div>
    </div>
  );
}

function getFirstName(full: string): string {
  if (!full) return 'there';
  return full.split(' ')[0] ?? 'there';
}

function PrimaryCard({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '22px 24px',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        background: 'linear-gradient(135deg, var(--ksr-surf-1) 0%, var(--ksr-surf-0) 100%)',
        border: `1px solid ${hover ? 'var(--ksr-acc-border)' : 'var(--ksr-border-0)'}`,
        boxShadow: hover
          ? `0 12px 36px ${ACCENT}22, 0 0 0 4px ${ACCENT}10`
          : '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'border-color 0.18s, box-shadow 0.18s',
        position: 'relative',
        overflow: 'hidden',
        color: 'inherit'
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${ACCENT}30, transparent 70%)`,
          filter: 'blur(20px)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          flexShrink: 0,
          background: ACCENT,
          color: 'var(--ksr-text-inverse)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 32px ${ACCENT}60`,
          position: 'relative'
        }}
      >
        <CircleDot size={28} />
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--ksr-bug)',
            boxShadow: '0 0 8px var(--ksr-bug)'
          }}
        />
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <div
          style={{
            fontSize: 19,
            fontWeight: 800,
            color: 'var(--ksr-text-0)',
            letterSpacing: '-0.025em'
          }}
        >
          Start new recording
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--ksr-text-2)',
            marginTop: 4,
            lineHeight: 1.5
          }}
        >
          The app will minimize. A floating HUD lets you pause, stop, or cancel.
        </div>
      </div>
    </button>
  );
}

function SecondaryCard({
  icon,
  title,
  sub,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '20px 18px',
        background: 'var(--ksr-surf-0)',
        border: '1px solid var(--ksr-border-0)',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        alignItems: 'flex-start',
        color: 'inherit',
        transition: 'border-color 0.18s'
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ksr-border-2)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ksr-border-0)')
      }
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 9,
          background: 'var(--ksr-surf-2)',
          color: 'var(--ksr-text-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--ksr-text-0)',
            letterSpacing: '-0.02em'
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--ksr-text-2)',
            marginTop: 4,
            lineHeight: 1.45
          }}
        >
          {sub}
        </div>
      </div>
    </button>
  );
}

function RecentRow({ project, onClick }: { project: RecentProject; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--ksr-surf-0)',
        border: '1px solid var(--ksr-border-0)',
        borderRadius: 10,
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        transition: 'border-color 0.18s'
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ksr-border-2)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ksr-border-0)')
      }
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          background: 'var(--ksr-surf-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--ksr-text-2)'
        }}
      >
        <FileText size={16} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: 'var(--ksr-text-1)',
            letterSpacing: '-0.01em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {project.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ksr-text-3)', marginTop: 2 }}>
          {project.app || '—'} · {formatTimestampLong(project.lastSavedAt)}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: ACCENT,
          padding: '3px 8px',
          borderRadius: 6,
          background: 'var(--ksr-acc-soft)',
          border: '1px solid var(--ksr-acc-border)'
        }}
      >
        {project.stepCount} steps
      </div>
    </button>
  );
}

function PillButton({
  variant,
  children,
  onClick
}: {
  variant: 'primary' | 'ghost';
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const isPrimary = variant === 'primary';
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'var(--ksr-font-sans)',
        background: isPrimary ? ACCENT : 'transparent',
        color: isPrimary ? 'var(--ksr-text-inverse)' : 'var(--ksr-imp-text)',
        border: isPrimary ? 'none' : '1px solid var(--ksr-imp-border)',
        boxShadow: isPrimary ? `0 0 16px ${ACCENT}40` : 'none'
      }}
    >
      {children}
    </button>
  );
}

function FooterHints() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    void window.stepForge.app.info().then(setAppInfo);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 0',
        marginTop: 32,
        borderTop: '1px solid var(--ksr-border-0)',
        fontSize: 11,
        color: 'var(--ksr-text-3)'
      }}
    >
      <span>{appInfo ? `v${appInfo.version} · ${appInfo.platform}-${appInfo.arch}` : 'StepForge'}</span>
    </div>
  );
}
