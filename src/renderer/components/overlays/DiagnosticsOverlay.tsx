import { useEffect, useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import type { DiagnosticEntry } from '@shared/models/Ipc';
import { formatClock } from '@shared/util/time';
import { useProjectStore } from '@renderer/state/projectStore';

const ACCENT = '#00c4ff';

export function DiagnosticsOverlay() {
  const open = useProjectStore((state) => state.diagnosticsOpen);
  const setOpen = useProjectStore((state) => state.setDiagnosticsOpen);
  const [entries, setEntries] = useState<DiagnosticEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    void window.stepForge.diagnostics.list().then(setEntries);
    const off = window.stepForge.diagnostics.onChanged(setEntries);
    return off;
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 55,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)'
        }}
      />
      <div
        className="app-no-drag"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 760,
          maxWidth: 'calc(100% - 48px)',
          height: 520,
          maxHeight: 'calc(100% - 80px)',
          transform: 'translate(-50%, -50%)',
          zIndex: 56,
          background: 'var(--ksr-surf-0)',
          borderRadius: 8,
          border: '1px solid var(--ksr-border-1)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            height: 52,
            padding: '0 18px',
            borderBottom: '1px solid var(--ksr-border-0)',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <Info size={16} color={ACCENT} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ksr-text-0)' }}>
              Diagnostics
            </div>
            <div style={{ fontSize: 11, color: 'var(--ksr-text-3)', marginTop: 2 }}>
              Capture, recording, export, and updater events.
            </div>
          </div>
          <button onClick={() => setOpen(false)} style={iconButtonStyle}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
          {entries.length === 0 ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ksr-text-3)',
                fontSize: 12
              }}
            >
              No diagnostics recorded yet.
            </div>
          ) : (
            entries.map((entry) => <DiagnosticRow key={entry.id} entry={entry} />)
          )}
        </div>
      </div>
    </>
  );
}

function DiagnosticRow({ entry }: { entry: DiagnosticEntry }) {
  const tone = entry.level === 'error'
    ? 'var(--ksr-bug-text)'
    : entry.level === 'warning'
      ? 'var(--ksr-imp-text)'
      : ACCENT;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '18px 84px 92px 1fr',
        gap: 10,
        alignItems: 'start',
        padding: '10px 12px',
        borderRadius: 7,
        border: '1px solid var(--ksr-border-0)',
        background: 'var(--ksr-surf-1)',
        marginBottom: 8
      }}
    >
      <AlertTriangle size={14} color={tone} style={{ marginTop: 1 }} />
      <div style={{ fontFamily: 'var(--ksr-font-mono)', fontSize: 10.5, color: 'var(--ksr-text-3)' }}>
        {formatClock(entry.timestamp)}
      </div>
      <div style={{ fontSize: 10.5, color: tone, fontWeight: 800, textTransform: 'uppercase' }}>
        {entry.source}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--ksr-text-1)', fontWeight: 700 }}>
          {entry.message}
        </div>
        {entry.detail && (
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ksr-text-3)', lineHeight: 1.45 }}>
            {entry.detail}
          </div>
        )}
      </div>
    </div>
  );
}

const iconButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  border: 'none',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--ksr-text-2)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
