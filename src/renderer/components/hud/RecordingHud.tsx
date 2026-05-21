import { useEffect, useState } from 'react';
import { Pause, Play, Square, X, MousePointerClick } from 'lucide-react';
import { formatElapsed } from '@shared/util/time';

const ACCENT = 'var(--ksr-acc)';

type RecState = 'IDLE' | 'RECORDING' | 'PAUSED' | 'STOPPED';

export function RecordingHud() {
  const [state, setState] = useState<RecState>('RECORDING');
  const [elapsed, setElapsed] = useState(0);
  const [steps, setSteps] = useState(0);

  useEffect(() => {
    const offTimer = window.stepForgeHud?.onTimer(setElapsed);
    const offStep = window.stepForgeHud?.onStepCount(setSteps);
    const offState = window.stepForgeHud?.onState(setState);
    return () => {
      offTimer?.();
      offStep?.();
      offState?.();
    };
  }, []);

  const dotColor =
    state === 'RECORDING' ? 'var(--ksr-bug)' : state === 'PAUSED' ? 'var(--ksr-imp)' : 'var(--ksr-text-3)';

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        WebkitAppRegion: 'drag'
      } as React.CSSProperties}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          background: 'rgba(10,13,20,0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--ksr-border-1)',
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          padding: 6
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px 6px 10px',
            borderRight: '1px solid var(--ksr-border-1)'
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: dotColor,
              boxShadow: state === 'RECORDING' ? `0 0 10px ${dotColor}` : 'none',
              animation: state === 'RECORDING' ? 'rec-pulse 1.2s ease-in-out infinite' : 'none'
            }}
          />
          <span
            style={{
              fontFamily: 'var(--ksr-font-mono)',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--ksr-text-0)',
              letterSpacing: '0.02em',
              minWidth: 50
            }}
          >
            {formatElapsed(elapsed)}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: dotColor,
              letterSpacing: '0.18em',
              textTransform: 'uppercase'
            }}
          >
            {state}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            gap: 4,
            WebkitAppRegion: 'no-drag'
          } as React.CSSProperties}
        >
          {state === 'RECORDING' ? (
            <HudBtn Icon={Pause} title="Pause" onClick={() => window.stepForgeHud?.pause()} />
          ) : (
            <HudBtn
              Icon={Play}
              title="Resume"
              onClick={() => window.stepForgeHud?.resume()}
              accent={ACCENT}
            />
          )}
          <HudBtn Icon={Square} title="Stop" primary onClick={() => window.stepForgeHud?.stop()} />
          <HudBtn Icon={X} title="Cancel" danger onClick={() => window.stepForgeHud?.cancel()} />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderLeft: '1px solid var(--ksr-border-1)'
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 9px',
              borderRadius: 999,
              background: 'var(--ksr-acc-soft)',
              border: '1px solid var(--ksr-acc-border)',
              fontSize: 11,
              fontWeight: 700,
              color: ACCENT,
              fontFamily: 'var(--ksr-font-sans)'
            }}
          >
            <MousePointerClick size={11} />
            {steps} step{steps !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

function HudBtn({
  Icon,
  title,
  onClick,
  accent,
  danger,
  primary
}: {
  Icon: React.ComponentType<{ size?: number; fill?: string }>;
  title: string;
  onClick: () => void;
  accent?: string;
  danger?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 34,
        height: 34,
        padding: 0,
        borderRadius: 8,
        cursor: 'pointer',
        background: primary ? accent || ACCENT : 'transparent',
        color: primary
          ? 'var(--ksr-text-inverse)'
          : danger
            ? 'var(--ksr-bug-text)'
            : 'var(--ksr-text-1)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: primary ? 'var(--ksr-acc-shadow-sm)' : 'none'
      }}
    >
      <Icon size={14} fill={primary ? 'currentColor' : 'none'} />
    </button>
  );
}
