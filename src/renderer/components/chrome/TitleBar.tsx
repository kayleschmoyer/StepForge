import { Search, Settings as SettingsIcon, CircleHelp, Minus, Square, X, CircleDot, Play } from 'lucide-react';
import { BrandMark } from '../ui/BrandMark';
import { IconButton } from '../ui/IconButton';
import { UpdateBanner } from '../overlays/UpdateBanner';
import { useProjectStore } from '@renderer/state/projectStore';
import { startRecordingWithDetails } from '@renderer/services/startRecordingWithDetails';

const ACCENT = '#00c4ff';

export function TitleBar() {
  const project = useProjectStore((s) => s.project);
  const recState = useProjectStore((s) => s.recState);
  const setPaletteOpen = useProjectStore((s) => s.setPaletteOpen);
  const setSettingsOpen = useProjectStore((s) => s.setSettingsOpen);

  const sessionTitle = project?.metadata.title ?? 'New Session';

  const handleRecord = () => {
    if (recState === 'IDLE') void startRecordingWithDetails();
    else if (recState === 'RECORDING') void window.stepForge.recording.stop();
    else if (recState === 'PAUSED') void window.stepForge.recording.resume();
  };

  const recBadgeColor =
    recState === 'RECORDING' ? 'var(--ksr-bug)' : recState === 'PAUSED' ? 'var(--ksr-imp)' : ACCENT;
  const recBadgeBg =
    recState === 'RECORDING'
      ? 'var(--ksr-bug-bg)'
      : recState === 'PAUSED'
        ? 'var(--ksr-imp-bg)'
        : 'var(--ksr-surf-2)';
  const recBadgeBorder =
    recState === 'RECORDING'
      ? 'var(--ksr-bug-border)'
      : recState === 'PAUSED'
        ? 'var(--ksr-imp-border)'
        : 'var(--ksr-border-1)';
  const recBadgeText =
    recState === 'RECORDING'
      ? 'var(--ksr-bug-text)'
      : recState === 'PAUSED'
        ? 'var(--ksr-imp-text)'
        : 'var(--ksr-text-2)';

  const recLabel = recState === 'RECORDING' ? 'Stop' : recState === 'PAUSED' ? 'Resume' : 'Record';
  const RecIcon = recState === 'RECORDING' ? Square : recState === 'PAUSED' ? Play : CircleDot;

  return (
    <div
      className="app-drag"
      style={{
        height: 'var(--ksr-titlebar-h)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        background: 'var(--ksr-bg)',
        borderBottom: '1px solid var(--ksr-border-0)',
        padding: '0 0 0 12px',
        gap: 8
      }}
    >
      {/* Logo lockup */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingRight: 12,
          borderRight: '1px solid var(--ksr-border-0)',
          marginRight: 4,
          height: '100%'
        }}
      >
        <BrandMark size={22} accent={ACCENT} />
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--ksr-text-0)',
            letterSpacing: 'var(--ksr-track-tight)',
            fontFamily: 'var(--ksr-font-sans)',
            whiteSpace: 'nowrap'
          }}
        >
          Kayle&apos;s Steps<span style={{ color: ACCENT, marginLeft: 5 }}>Recorder</span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 11,
            color: 'var(--ksr-text-3)',
            padding: '3px 7px',
            borderRadius: 5,
            background: 'var(--ksr-surf-1)',
            fontWeight: 600
          }}
        >
          Local
        </span>
        <span style={{ color: 'var(--ksr-text-4)' }}>/</span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--ksr-text-1)',
            fontWeight: 600,
            fontFamily: 'var(--ksr-font-sans)',
            letterSpacing: 'var(--ksr-track-snug)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {sessionTitle}
        </span>
        {recState !== 'IDLE' && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 8px',
              borderRadius: 5,
              marginLeft: 6,
              background: recBadgeBg,
              border: `1px solid ${recBadgeBorder}`,
              color: recBadgeText,
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.16em',
              textTransform: 'uppercase'
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'currentColor',
                animation:
                  recState === 'RECORDING' ? 'rec-pulse 1.2s ease-in-out infinite' : 'none'
              }}
            />
            {recState}
          </span>
        )}
      </div>

      {/* Command palette trigger */}
      <button
        className="app-no-drag"
        onClick={() => setPaletteOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px 4px 8px',
          borderRadius: 7,
          cursor: 'pointer',
          background: 'var(--ksr-surf-1)',
          border: '1px solid var(--ksr-border-0)',
          color: 'var(--ksr-text-3)',
          fontSize: 11,
          fontFamily: 'var(--ksr-font-sans)',
          minWidth: 220
        }}
      >
        <Search size={12} />
        <span style={{ flex: 1, textAlign: 'left' }}>Search · jump · run</span>
      </button>

      {/* Primary record */}
      <button
        className="app-no-drag"
        onClick={handleRecord}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 12px 5px 8px',
          borderRadius: 7,
          cursor: 'pointer',
          border: 'none',
          background: recBadgeColor,
          color: 'var(--ksr-text-inverse)',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'var(--ksr-font-sans)',
          letterSpacing: 'var(--ksr-track-snug)',
          boxShadow: `0 0 16px ${recBadgeColor}50`
        }}
      >
        <RecIcon size={13} fill={recState === 'RECORDING' ? 'currentColor' : 'none'} />
        {recLabel}
      </button>

      <UpdateBanner />

      <IconButton
        variant="titlebar"
        title="Settings"
        onClick={() => setSettingsOpen(true)}
        size={28}
      >
        <SettingsIcon size={14} />
      </IconButton>
      <IconButton variant="titlebar" title="Help" size={28}>
        <CircleHelp size={14} />
      </IconButton>

      {/* Window controls */}
      <div className="app-no-drag" style={{ display: 'flex', gap: 0, marginLeft: 4 }}>
        <WindowBtn icon="min" onClick={() => window.stepForge.window.minimize()} />
        <WindowBtn icon="max" onClick={() => window.stepForge.window.maximize()} />
        <WindowBtn icon="close" onClick={() => window.stepForge.window.close()} />
      </div>
    </div>
  );
}

function WindowBtn({ icon, onClick }: { icon: 'min' | 'max' | 'close'; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 38,
        height: 38,
        padding: 0,
        border: 'none',
        cursor: 'pointer',
        background: 'transparent',
        color: 'var(--ksr-text-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          icon === 'close' ? '#e81123' : 'var(--ksr-surf-2)';
        (e.currentTarget as HTMLButtonElement).style.color =
          icon === 'close' ? '#fff' : 'var(--ksr-text-1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--ksr-text-2)';
      }}
    >
      {icon === 'min' && <Minus size={12} />}
      {icon === 'max' && <Square size={11} />}
      {icon === 'close' && <X size={12} />}
    </button>
  );
}
