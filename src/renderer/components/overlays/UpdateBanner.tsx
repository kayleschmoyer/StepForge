import { useEffect, useState } from 'react';
import { Download, ArrowDown, RefreshCw, CheckCircle2, RotateCcw } from 'lucide-react';
import { useProjectStore } from '@renderer/state/projectStore';

const ACCENT = 'var(--ksr-acc)';

export function UpdateBanner() {
  const status = useProjectStore((s) => s.updateStatus);
  const setStatus = useProjectStore((s) => s.setUpdateStatus);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const off = window.stepForge.update.onStatus(setStatus);
    return () => off();
  }, [setStatus]);

  if (status.status === 'idle') {
    return null;
  }

  const handleClick = () => {
    if (status.status === 'downloaded') {
      window.stepForge.update.install();
    } else if (status.status === 'error') {
      void window.stepForge.update.check();
    } else {
      setOpen((o) => !o);
    }
  };

  let label = 'Update';
  let Icon = ArrowDown;
  let progress = 0;
  if (status.status === 'checking') {
    label = 'Checking for updates';
    Icon = RefreshCw;
    progress = 12;
  } else if (status.status === 'available') {
    label = `Preparing v${status.version}`;
    Icon = ArrowDown;
  } else if (status.status === 'not-available') {
    label = 'Up to date';
    Icon = CheckCircle2;
  } else if (status.status === 'downloading') {
    progress = Math.max(2, Math.min(100, Math.round(status.percent)));
    label = `Updating silently · ${progress}%`;
    Icon = RefreshCw;
  } else if (status.status === 'downloaded') {
    progress = 100;
    label = `Restart to apply v${status.version}`;
    Icon = RotateCcw;
  } else if (status.status === 'installing') {
    progress = 100;
    label = 'Launching installer';
    Icon = RefreshCw;
  } else if (status.status === 'error') {
    label = 'Update failed — retry';
    Icon = RefreshCw;
  }

  const active = status.status === 'checking' || status.status === 'available' || status.status === 'downloading' || status.status === 'installing';
  const error = status.status === 'error';

  return (
    <button
      className="app-no-drag"
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 10px',
        borderRadius: 999,
        background: error ? 'var(--ksr-bug-bg)' : 'linear-gradient(135deg, var(--ksr-acc-soft), var(--ksr-surf-1))',
        color: error ? 'var(--ksr-bug-text)' : ACCENT,
        border: `1px solid ${error ? 'var(--ksr-bug-border)' : 'var(--ksr-acc-border)'}`,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'var(--ksr-font-sans)',
        cursor: 'pointer',
        marginRight: 4,
        position: 'relative',
        overflow: 'hidden',
        minWidth: status.status === 'downloading' ? 170 : undefined,
        boxShadow: error ? 'none' : 'var(--ksr-acc-shadow-sm)'
      }}
    >
      {progress > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            right: `${100 - progress}%`,
            background: error ? 'transparent' : 'rgba(var(--ksr-acc-rgb),0.18)',
            transition: 'right 0.24s ease',
            pointerEvents: 'none'
          }}
        />
      )}
      <Icon size={11} style={{ position: 'relative', animation: active ? 'spin 1s linear infinite' : 'none' }} />
      <span style={{ position: 'relative' }}>{label}</span>
    </button>
  );
}
