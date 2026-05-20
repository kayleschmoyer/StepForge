import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FolderOpen, UserRound } from 'lucide-react';
import { useProjectStore } from '@renderer/state/projectStore';

const ACCENT = '#00c4ff';

export function FirstRunSetupOverlay() {
  const open = useProjectStore((state) => state.firstRunSetupOpen);
  const settings = useProjectStore((state) => state.settings);
  const setSettings = useProjectStore((state) => state.setSettings);
  const setOpen = useProjectStore((state) => state.setFirstRunSetupOpen);
  const [testerName, setTesterName] = useState('');
  const [hostFolder, setHostFolder] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTesterName(settings.defaultTesterName);
    setHostFolder(settings.sessionStoragePath);
    const timer = window.setTimeout(() => nameRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open, settings.defaultTesterName, settings.sessionStoragePath]);

  if (!open) return null;

  const canSave = Boolean(testerName.trim()) && Boolean(hostFolder.trim()) && !saving;

  const chooseFolder = async () => {
    if (saving) return;
    const selected = await window.stepForge.dialog.openFile({
      properties: ['openDirectory', 'createDirectory']
    });
    if (selected) setHostFolder(selected);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const next = await window.stepForge.settings.set({
        defaultTesterName: testerName.trim(),
        sessionStoragePath: hostFolder.trim(),
        firstRunSetupComplete: true
      });
      setSettings(next);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="app-no-drag"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(3,7,18,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 500,
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
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ksr-text-0)' }}>
              First launch setup
            </div>
            <div style={{ marginTop: 2, fontSize: 11.5, color: 'var(--ksr-text-3)' }}>
              These defaults are used for new Xray recordings.
            </div>
          </div>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <FieldLabel>What is the tester name?</FieldLabel>
            <div style={inputShellStyle}>
              <UserRound size={14} color={ACCENT} />
              <input
                ref={nameRef}
                value={testerName}
                onChange={(event) => setTesterName(event.target.value)}
                placeholder="Tester name"
                disabled={saving}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Where should the Xray host folder be?</FieldLabel>
            <div style={{ ...inputShellStyle, paddingRight: 4 }}>
              <FolderOpen size={14} color={ACCENT} />
              <input
                value={hostFolder}
                onChange={(event) => setHostFolder(event.target.value)}
                placeholder="Choose a folder"
                disabled={saving}
                style={{ ...inputStyle, fontFamily: 'var(--ksr-font-mono)', fontSize: 11.5 }}
              />
              <button
                type="button"
                disabled={saving}
                onClick={chooseFolder}
                style={folderButtonStyle}
              >
                Browse
              </button>
            </div>
          </div>
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
            New recordings save under the selected folder.
          </div>
          <button
            type="submit"
            disabled={!canSave}
            style={{
              ...primaryButtonStyle,
              opacity: canSave ? 1 : 0.55,
              cursor: canSave ? 'pointer' : 'default'
            }}
          >
            {saving ? 'Saving...' : 'Save setup'}
          </button>
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

const inputShellStyle: React.CSSProperties = {
  height: 38,
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  borderRadius: 7,
  border: '1px solid var(--ksr-border-1)',
  background: 'var(--ksr-surf-1)',
  padding: '0 11px'
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'var(--ksr-text-0)',
  fontFamily: 'var(--ksr-font-sans)',
  fontSize: 13,
  fontWeight: 700
};

const folderButtonStyle: React.CSSProperties = {
  height: 28,
  padding: '0 10px',
  borderRadius: 6,
  border: '1px solid var(--ksr-border-1)',
  background: 'var(--ksr-surf-2)',
  color: 'var(--ksr-text-1)',
  cursor: 'pointer',
  fontFamily: 'var(--ksr-font-sans)',
  fontSize: 11,
  fontWeight: 800
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
