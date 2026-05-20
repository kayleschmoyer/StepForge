import { useEffect, useRef, useState } from 'react';
import { CircleDot, X } from 'lucide-react';
import { useProjectStore } from '@renderer/state/projectStore';
import { beginRecordingWithDetails, normalizeJiraKey } from '@renderer/services/startRecordingWithDetails';

const ACCENT = '#00c4ff';

export function RecordingSetupOverlay() {
  const open = useProjectStore((state) => state.recordingSetupOpen);
  const setOpen = useProjectStore((state) => state.setRecordingSetupOpen);
  const [jiraNumber, setJiraNumber] = useState('');
  const [description, setDescription] = useState('');
  const [starting, setStarting] = useState(false);
  const jiraRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setJiraNumber('');
    setDescription('');
    setStarting(false);
    const timer = window.setTimeout(() => jiraRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !starting) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen, starting]);

  if (!open) return null;

  const jiraKey = normalizeJiraKey(jiraNumber);
  const canStart = Boolean(jiraKey) && !starting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canStart) return;
    setStarting(true);
    try {
      await beginRecordingWithDetails(jiraNumber, description);
      setOpen(false);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      className="app-no-drag"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(3,7,18,0.66)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !starting) setOpen(false);
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 440,
          maxWidth: '100%',
          borderRadius: 8,
          background: 'var(--ksr-surf-0)',
          border: '1px solid var(--ksr-border-1)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '16px 18px',
            borderBottom: '1px solid var(--ksr-border-0)'
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 7,
              background: 'var(--ksr-acc-soft)',
              color: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CircleDot size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ksr-text-0)' }}>
              New recording
            </div>
            <div style={{ marginTop: 2, fontSize: 11.5, color: 'var(--ksr-text-3)' }}>
              Set up the report before capture starts.
            </div>
          </div>
          <button
            type="button"
            disabled={starting}
            onClick={() => setOpen(false)}
            style={{
              width: 28,
              height: 28,
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: 'var(--ksr-text-3)',
              cursor: starting ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          <FieldLabel>What is the Jira number being worked on?</FieldLabel>
          <div
            style={{
              display: 'flex',
              height: 36,
              borderRadius: 7,
              overflow: 'hidden',
              border: '1px solid var(--ksr-border-1)',
              background: 'var(--ksr-surf-1)',
              marginBottom: 14
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 11px',
                borderRight: '1px solid var(--ksr-border-1)',
                color: ACCENT,
                fontSize: 12,
                fontWeight: 800
              }}
            >
              VAST-
            </div>
            <input
              ref={jiraRef}
              value={jiraNumber}
              onChange={(event) => setJiraNumber(event.target.value.replace(/\D/g, ''))}
              placeholder="1234"
              disabled={starting}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--ksr-text-0)',
                fontFamily: 'var(--ksr-font-sans)',
                fontSize: 13,
                fontWeight: 700,
                padding: '0 11px'
              }}
            />
          </div>

          <FieldLabel>What is the description of this Xray test?</FieldLabel>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Example: Verify user can upload evidence to a completed inspection"
            disabled={starting}
            style={{
              width: '100%',
              minHeight: 92,
              resize: 'vertical',
              borderRadius: 7,
              border: '1px solid var(--ksr-border-1)',
              background: 'var(--ksr-surf-1)',
              color: 'var(--ksr-text-0)',
              fontFamily: 'var(--ksr-font-sans)',
              fontSize: 13,
              lineHeight: 1.5,
              outline: 'none',
              padding: '10px 11px'
            }}
          />
        </div>

        <div
          style={{
            padding: '13px 18px',
            borderTop: '1px solid var(--ksr-border-0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--ksr-text-3)', fontWeight: 600 }}>
            {jiraKey || 'VAST-'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={starting} onClick={() => setOpen(false)} style={secondaryButtonStyle}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canStart}
              style={{
                ...primaryButtonStyle,
                opacity: canStart ? 1 : 0.55,
                cursor: canStart ? 'pointer' : 'default'
              }}
            >
              {starting ? 'Starting...' : 'Start recording'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--ksr-text-3)',
        marginBottom: 7
      }}
    >
      {children}
    </div>
  );
}

const secondaryButtonStyle: React.CSSProperties = {
  padding: '7px 12px',
  borderRadius: 7,
  border: '1px solid var(--ksr-border-1)',
  background: 'transparent',
  color: 'var(--ksr-text-2)',
  cursor: 'pointer',
  fontFamily: 'var(--ksr-font-sans)',
  fontSize: 12,
  fontWeight: 700
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '7px 13px',
  borderRadius: 7,
  border: 'none',
  background: ACCENT,
  color: 'var(--ksr-text-inverse)',
  cursor: 'pointer',
  fontFamily: 'var(--ksr-font-sans)',
  fontSize: 12,
  fontWeight: 800
};