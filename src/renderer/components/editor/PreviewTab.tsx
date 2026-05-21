import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '@renderer/state/projectStore';
import { ReportPreview } from './ReportPreview';

const ACCENT = 'var(--ksr-acc)';

export function PreviewTab() {
  const project = useProjectStore((s) => s.project);
  const updateMetadata = useProjectStore((s) => s.updateMetadata);
  const [mode, setMode] = useState<'full' | 'compact'>('full');
  const jiraKey = project?.metadata.jiraKey ?? project?.metadata.title ?? '';
  const initialVastNumber = useMemo(() => parseVastNumber(jiraKey), [jiraKey]);
  const [vastNumber, setVastNumber] = useState(initialVastNumber);

  useEffect(() => {
    setVastNumber(initialVastNumber);
  }, [initialVastNumber]);

  useEffect(() => {
    if (!project) return;
    const nextJiraKey = vastNumber ? `VAST-${vastNumber}` : '';
    if (nextJiraKey === (project.metadata.jiraKey ?? '')) return;
    const timer = setTimeout(() => {
      updateMetadata({ jiraKey: nextJiraKey });
      void window.stepForge.project.updateMetadata({ patch: { jiraKey: nextJiraKey } });
    }, 350);
    return () => clearTimeout(timer);
  }, [project, updateMetadata, vastNumber]);

  if (!project) return null;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        background: 'var(--ksr-bg)'
      }}
    >
      <div
        style={{
          height: 44,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 20px',
          borderBottom: '1px solid var(--ksr-border-0)',
          background: 'var(--ksr-surf-0)'
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--ksr-text-1)', fontWeight: 700 }}>
          Report Preview
        </div>
        <div style={{ fontSize: 11, color: 'var(--ksr-text-3)', fontWeight: 600 }}>
          {project.steps.filter((step) => !step.isDeleted).length} steps
        </div>
        <label
          style={{
            marginLeft: 18,
            display: 'inline-flex',
            alignItems: 'center',
            height: 28,
            borderRadius: 7,
            overflow: 'hidden',
            border: '1px solid var(--ksr-border-1)',
            background: 'var(--ksr-surf-1)'
          }}
        >
          <span
            style={{
              padding: '0 9px',
              color: ACCENT,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.04em',
              borderRight: '1px solid var(--ksr-border-1)'
            }}
          >
            VAST-
          </span>
          <input
            value={vastNumber}
            onChange={(event) => setVastNumber(event.target.value.replace(/\D/g, ''))}
            placeholder="1234"
            style={{
              width: 96,
              height: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--ksr-text-0)',
              fontFamily: 'var(--ksr-font-sans)',
              fontSize: 12,
              fontWeight: 700,
              padding: '0 9px'
            }}
          />
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {(['full', 'compact'] as const).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '4px 11px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? 'var(--ksr-acc-soft)' : 'transparent',
                  color: active ? ACCENT : 'var(--ksr-text-2)',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: 'var(--ksr-font-sans)',
                  textTransform: 'capitalize',
                  boxShadow: active ? 'inset 0 0 0 1px var(--ksr-acc-border)' : 'none'
                }}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: '24px 24px 96px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: '#0b0f17'
        }}
      >
        <ReportPreview project={project} mode={mode} />
      </div>
    </div>
  );
}

function parseVastNumber(title: string): string {
  const match = title.trim().match(/^VAST-?(\d+)$/i);
  return match?.[1] ?? '';
}
