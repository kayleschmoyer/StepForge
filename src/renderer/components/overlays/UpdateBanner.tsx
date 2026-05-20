import { useEffect, useState } from 'react';
import { Download, ArrowDown, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useProjectStore } from '@renderer/state/projectStore';

const ACCENT = '#00c4ff';

export function UpdateBanner() {
  const status = useProjectStore((s) => s.updateStatus);
  const setStatus = useProjectStore((s) => s.setUpdateStatus);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const off = window.stepForge.update.onStatus(setStatus);
    return () => off();
  }, [setStatus]);

  if (status.status === 'idle' || status.status === 'checking') {
    return null;
  }

  const handleClick = () => {
    if (status.status === 'available') {
      void window.stepForge.update.download();
    } else if (status.status === 'downloaded') {
      window.stepForge.update.install();
    } else if (status.status === 'error') {
      void window.stepForge.update.check();
    } else {
      setOpen((o) => !o);
    }
  };

  let label = 'Update';
  let Icon = ArrowDown;
  if (status.status === 'available') {
    label = `Update available · v${status.version}`;
    Icon = ArrowDown;
  } else if (status.status === 'not-available') {
    label = 'Up to date';
    Icon = CheckCircle2;
  } else if (status.status === 'downloading') {
    label = `Downloading… ${Math.round(status.percent)}%`;
    Icon = RefreshCw;
  } else if (status.status === 'downloaded') {
    label = `Restart to install v${status.version}`;
    Icon = Download;
  } else if (status.status === 'installing') {
    label = 'Installing update…';
    Icon = RefreshCw;
  } else if (status.status === 'error') {
    label = 'Update failed — retry';
    Icon = RefreshCw;
  }

  return (
    <button
      className="app-no-drag"
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: status.status === 'error' ? 'var(--ksr-bug-bg)' : 'var(--ksr-acc-soft)',
        color: status.status === 'error' ? 'var(--ksr-bug-text)' : ACCENT,
        border: `1px solid ${status.status === 'error' ? 'var(--ksr-bug-border)' : 'var(--ksr-acc-border)'}`,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'var(--ksr-font-sans)',
        cursor: 'pointer',
        marginRight: 4
      }}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}
