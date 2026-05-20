import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  CircleDot,
  Square,
  Pause,
  Download,
  Save,
  Folder,
  Bug,
  AlertTriangle,
  Plus,
  EyeOff,
  Settings as SettingsIcon,
  Palette
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useProjectStore } from '@renderer/state/projectStore';
import { startRecordingWithDetails } from '@renderer/services/startRecordingWithDetails';

const ACCENT = '#00c4ff';

type Group = 'Recording' | 'Project' | 'Step' | 'App';

interface Cmd {
  id: string;
  label: string;
  group: Group;
  Icon: ComponentType<{ size?: number }>;
  run: () => void;
}

export function CommandPalette() {
  const open = useProjectStore((s) => s.paletteOpen);
  const setOpen = useProjectStore((s) => s.setPaletteOpen);
  const setExportOpen = useProjectStore((s) => s.setExportOpen);
  const setSettingsOpen = useProjectStore((s) => s.setSettingsOpen);
  const selectedStep = useProjectStore((s) =>
    s.project?.steps.find((st) => st.id === s.selectedStepId)
  );
  const toggleFlag = useProjectStore((s) => s.toggleFlag);

  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setCursor(0);
      inputRef.current?.focus();
    }
  }, [open]);

  const cmds = useMemo<Cmd[]>(() => {
    const close = () => setOpen(false);
    return [
      {
        id: 'rec',
        label: 'Start new recording',
        group: 'Recording',
        Icon: CircleDot,
        run: () => {
          void startRecordingWithDetails();
          close();
        }
      },
      {
        id: 'stop',
        label: 'Stop recording',
        group: 'Recording',
        Icon: Square,
        run: () => {
          void window.stepForge.recording.stop();
          close();
        }
      },
      {
        id: 'pause',
        label: 'Pause / Resume recording',
        group: 'Recording',
        Icon: Pause,
        run: () => {
          void window.stepForge.recording.pause();
          close();
        }
      },
      {
        id: 'export',
        label: 'Export report…',
        group: 'Project',
        Icon: Download,
        run: () => {
          setExportOpen(true);
          close();
        }
      },
      {
        id: 'save',
        label: 'Save project',
        group: 'Project',
        Icon: Save,
        run: () => {
          void window.stepForge.project.save();
          close();
        }
      },
      {
        id: 'open',
        label: 'Open recent session…',
        group: 'Project',
        Icon: Folder,
        run: () => {
          void window.stepForge.project.open();
          close();
        }
      },
      {
        id: 'flagbug',
        label: 'Flag current step as Bug',
        group: 'Step',
        Icon: Bug,
        run: () => {
          if (selectedStep) {
            toggleFlag(selectedStep.id, 'Bug');
            void window.stepForge.step.toggleFlag({ id: selectedStep.id, flag: 'Bug' });
          }
          close();
        }
      },
      {
        id: 'flagimp',
        label: 'Flag current step Important',
        group: 'Step',
        Icon: AlertTriangle,
        run: () => {
          if (selectedStep) {
            toggleFlag(selectedStep.id, 'Important');
            void window.stepForge.step.toggleFlag({ id: selectedStep.id, flag: 'Important' });
          }
          close();
        }
      },
      {
        id: 'manual',
        label: 'Add manual step',
        group: 'Step',
        Icon: Plus,
        run: () => {
          void window.stepForge.step.addManual();
          close();
        }
      },
      {
        id: 'redact',
        label: 'Redact area on current step',
        group: 'Step',
        Icon: EyeOff,
        run: () => {
          useProjectStore.getState().setActiveTool('redact');
          close();
        }
      },
      {
        id: 'settings',
        label: 'Open Settings…',
        group: 'App',
        Icon: SettingsIcon,
        run: () => {
          setSettingsOpen(true);
          close();
        }
      },
      {
        id: 'theme',
        label: 'Switch theme',
        group: 'App',
        Icon: Palette,
        run: () => {
          const next =
            useProjectStore.getState().settings.theme === 'dark' ? 'light' : 'dark';
          void window.stepForge.settings.set({ theme: next, darkMode: next === 'dark' });
          document.documentElement.setAttribute('data-theme', next);
          close();
        }
      }
    ];
  }, [setOpen, setExportOpen, setSettingsOpen, selectedStep, toggleFlag]);

  const filtered = cmds.filter((c) => !q || c.label.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    setCursor(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filtered[cursor]?.run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, cursor]);

  const groups = filtered.reduce<Record<string, Cmd[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 60,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.16s'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: '50%',
          transform: `translateX(-50%) scale(${open ? 1 : 0.96})`,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.18s, transform 0.18s',
          zIndex: 61,
          width: 600,
          maxHeight: 480,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--ksr-surf-0)',
          borderRadius: 14,
          border: '1px solid var(--ksr-border-1)',
          boxShadow:
            '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderBottom: '1px solid var(--ksr-border-0)'
          }}
        >
          <Search size={16} color="var(--ksr-text-2)" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command — try 'export' or 'flag'"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--ksr-text-0)',
              fontSize: 14,
              fontFamily: 'var(--ksr-font-sans)'
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {filtered.length === 0 && (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--ksr-text-3)',
                fontSize: 12
              }}
            >
              No commands match.
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 6 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--ksr-text-3)',
                  padding: '8px 10px 4px'
                }}
              >
                {group}
              </div>
              {items.map((c) => {
                const i = filtered.indexOf(c);
                const active = i === cursor;
                return (
                  <button
                    key={c.id}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => c.run()}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 7,
                      cursor: 'pointer',
                      background: active ? 'var(--ksr-acc-soft)' : 'transparent',
                      color: active ? ACCENT : 'var(--ksr-text-1)',
                      border: active
                        ? '1px solid var(--ksr-acc-border)'
                        : '1px solid transparent',
                      textAlign: 'left'
                    }}
                  >
                    <c.Icon size={14} />
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 14px',
            borderTop: '1px solid var(--ksr-border-0)',
            fontSize: 10,
            color: 'var(--ksr-text-3)'
          }}
        >
          <span style={{ marginLeft: 'auto' }}>{filtered.length} results</span>
        </div>
      </div>
    </>
  );
}
