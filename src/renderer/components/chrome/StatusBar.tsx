import { useProjectStore } from '@renderer/state/projectStore';
import { formatClock, formatElapsed } from '@shared/util/time';

const VERSION = 'v1.0.0 · win-x64';

export function StatusBar() {
  const project = useProjectStore((s) => s.project);
  const recState = useProjectStore((s) => s.recState);
  const setDiagnosticsOpen = useProjectStore((s) => s.setDiagnosticsOpen);

  const saved = !project?.isDirty;
  const stepCount = project?.steps.length ?? 0;
  const started = project?.metadata.startedAt
    ? formatClock(project.metadata.startedAt)
    : '—';
  const duration = formatElapsed(project?.metadata.duration ?? 0);

  let savedLabel = 'Auto-save on';
  let savedColor = 'var(--ksr-ok-text)';
  if (recState === 'RECORDING') {
    savedLabel = 'Recording · saving';
  } else if (!saved) {
    savedLabel = 'Saving…';
    savedColor = 'var(--ksr-imp-text)';
  } else if (project) {
    savedLabel = 'Saved · auto-save on';
  } else {
    savedLabel = 'Ready';
    savedColor = 'var(--ksr-text-3)';
  }

  return (
    <div
      style={{
        height: 'var(--ksr-statusbar-h)',
        flexShrink: 0,
        background: 'var(--ksr-surf-0)',
        borderTop: '1px solid var(--ksr-border-0)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 12,
        fontSize: 10.5,
        color: 'var(--ksr-text-3)',
        fontFamily: 'var(--ksr-font-sans)'
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: savedColor }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'currentColor',
            boxShadow: '0 0 6px currentColor'
          }}
        />
        {savedLabel}
      </span>

      {project && (
        <>
          <Dot />
          <span>{stepCount} steps</span>
          <Dot />
          <span>
            {started} · {duration}
          </span>
          <Dot />
          <span>Window-only capture</span>
        </>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => setDiagnosticsOpen(true)}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--ksr-text-3)',
            cursor: 'pointer',
            fontSize: 10.5,
            fontFamily: 'var(--ksr-font-sans)',
            padding: 0
          }}
        >
          Diagnostics
        </button>
        <span style={{ fontFamily: 'var(--ksr-font-mono)' }}>{VERSION}</span>
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span
      style={{
        width: 3,
        height: 3,
        borderRadius: '50%',
        background: 'var(--ksr-text-4)'
      }}
    />
  );
}
