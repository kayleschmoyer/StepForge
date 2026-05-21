import { House, Edit, History, Bell } from 'lucide-react';
import type { ComponentType } from 'react';
import { useProjectStore, type ViewName } from '@renderer/state/projectStore';

const ACCENT = 'var(--ksr-acc)';

interface RailItem {
  id: string;
  Icon: ComponentType<{ size?: number }>;
  label: string;
  target?: ViewName;
  badgeSelector?: (steps: number) => number;
}

const ITEMS: RailItem[] = [
  { id: 'home', Icon: House, label: 'Home', target: 'HOME' },
  {
    id: 'editor',
    Icon: Edit,
    label: 'Editor',
    target: 'EDITOR',
    badgeSelector: (steps) => steps
  },
  { id: 'sessions', Icon: History, label: 'Sessions' },
  { id: 'tray', Icon: Bell, label: 'Diagnostics' }
];

export function Rail() {
  const view = useProjectStore((s) => s.view);
  const setView = useProjectStore((s) => s.setView);
  const setDiagnosticsOpen = useProjectStore((s) => s.setDiagnosticsOpen);
  const stepCount = useProjectStore((s) => s.project?.steps.length ?? 0);

  const handleItemClick = (item: RailItem) => {
    if (item.target) {
      setView(item.target);
      return;
    }
    if (item.id === 'sessions') {
      setView('HOME');
      window.dispatchEvent(new CustomEvent('stepforge:focusRecentSessions'));
      return;
    }
    if (item.id === 'tray') setDiagnosticsOpen(true);
  };

  return (
    <nav
      style={{
        width: 'var(--ksr-rail-w)',
        flexShrink: 0,
        background: 'var(--ksr-bg)',
        borderRight: '1px solid var(--ksr-border-0)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: 4
      }}
    >
      {ITEMS.map((it) => {
        const active = it.target != null && view === it.target;
        const badge = it.badgeSelector ? it.badgeSelector(stepCount) : null;
        return (
          <button
            key={it.id}
            title={it.label}
            onClick={() => handleItemClick(it)}
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: 9,
              cursor: 'pointer',
              background: active ? 'var(--ksr-acc-soft)' : 'transparent',
              color: active ? ACCENT : 'var(--ksr-text-2)',
              border: active ? '1px solid var(--ksr-acc-border)' : '1px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.16s, color 0.16s'
            }}
            onMouseEnter={(e) => {
              if (!active) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--ksr-surf-2)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--ksr-text-1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--ksr-text-2)';
              }
            }}
          >
            <it.Icon size={16} />
            {badge != null && badge > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 8,
                  background: ACCENT,
                  color: 'var(--ksr-text-inverse)',
                  fontSize: 9,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 2px var(--ksr-bg)'
                }}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <button
        title="Account"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${ACCENT}, #a855f7)`,
          color: 'var(--ksr-text-inverse)',
          border: 'none',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 800,
          fontFamily: 'var(--ksr-font-sans)'
        }}
      >
        KS
      </button>
    </nav>
  );
}
