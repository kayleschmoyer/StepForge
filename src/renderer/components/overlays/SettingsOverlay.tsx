import { useEffect, useState } from 'react';
import {
  X,
  Camera,
  Settings as SettingsIcon,
  FileText,
  CircleHelp,
  Search,
  Check
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useProjectStore } from '@renderer/state/projectStore';
import { accentColorPresets, defaultAppSettings, type AppSettings } from '@shared/models/AppSettings';
import type { AppInfo } from '@shared/models/Ipc';
import { BrandMark } from '../ui/BrandMark';
import { setAccentColor } from '@renderer/services/theme';

const ACCENT = 'var(--ksr-acc)';

type Section = 'capture' | 'app' | 'defaults' | 'about';

const SECTIONS: { id: Section; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'capture', label: 'Capture', Icon: Camera },
  { id: 'app', label: 'App', Icon: SettingsIcon },
  { id: 'defaults', label: 'Defaults', Icon: FileText },
  { id: 'about', label: 'About', Icon: CircleHelp }
];

export function SettingsOverlay() {
  const open = useProjectStore((s) => s.settingsOpen);
  const setOpen = useProjectStore((s) => s.setSettingsOpen);
  const settings = useProjectStore((s) => s.settings);
  const setSettings = useProjectStore((s) => s.setSettings);
  const [section, setSection] = useState<Section>('capture');

  const patch = async (p: Partial<AppSettings>) => {
    const next = await window.stepForge.settings.set(p);
    setSettings(next);
  };

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 50,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.18s'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 880,
          height: 580,
          maxHeight: 'calc(100% - 80px)',
          transform: `translate(-50%, -50%) scale(${open ? 1 : 0.96})`,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 0.2s, opacity 0.2s',
          zIndex: 51,
          background: 'var(--ksr-surf-0)',
          borderRadius: 14,
          border: '1px solid var(--ksr-border-1)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          display: 'flex',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: 180,
            background: 'var(--ksr-bg)',
            borderRight: '1px solid var(--ksr-border-0)',
            padding: '20px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: 'var(--ksr-text-0)',
              padding: '4px 10px 14px',
              letterSpacing: '-0.02em'
            }}
          >
            Settings
          </div>
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '8px 10px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: active ? 'var(--ksr-acc-soft)' : 'transparent',
                  color: active ? ACCENT : 'var(--ksr-text-2)',
                  border: active ? '1px solid var(--ksr-acc-border)' : '1px solid transparent',
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 500
                }}
              >
                <s.Icon size={13} />
                {s.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            flex: 1,
            padding: '24px 28px',
            overflowY: 'auto',
            position: 'relative'
          }}
        >
          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 28,
              height: 28,
              padding: 0,
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ksr-text-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>

          {section === 'capture' && <CaptureSection settings={settings} patch={patch} />}
          {section === 'app' && <AppSection settings={settings} patch={patch} />}
          {section === 'defaults' && <DefaultsSection settings={settings} patch={patch} />}
          {section === 'about' && <AboutSection />}
        </div>
      </div>
    </>
  );
}

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 17,
          fontWeight: 800,
          color: 'var(--ksr-text-0)',
          letterSpacing: '-0.025em'
        }}
      >
        {title}
      </div>
      <div
        style={{ fontSize: 12, color: 'var(--ksr-text-2)', marginTop: 4, lineHeight: 1.5 }}
      >
        {sub}
      </div>
    </div>
  );
}

function Row({
  label,
  sub,
  children
}: {
  label: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid var(--ksr-border-0)',
        gap: 16
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, color: 'var(--ksr-text-1)', fontWeight: 500 }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: 'var(--ksr-text-3)', marginTop: 2 }}>{sub}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        padding: 0,
        flexShrink: 0,
        background: on ? ACCENT : 'var(--ksr-surf-3)',
        border: on ? 'none' : '1px solid var(--ksr-border-1)',
        position: 'relative',
        cursor: 'pointer',
        boxShadow: on ? 'var(--ksr-acc-shadow-sm)' : 'none',
        transition: 'background 0.16s'
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: on ? 'var(--ksr-text-inverse)' : 'var(--ksr-text-2)',
          position: 'absolute',
          top: 2,
          left: on ? 17 : 3,
          transition: 'left 0.16s'
        }}
      />
    </button>
  );
}

function NumInput({
  value,
  onChange,
  suffix,
  disabled
}: {
  value: number;
  onChange: (next: number) => void;
  suffix: string;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 4px 4px 8px',
        borderRadius: 6,
        background: 'var(--ksr-surf-1)',
        border: '1px solid var(--ksr-border-1)',
        opacity: disabled ? 0.5 : 1
      }}
    >
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        disabled={disabled}
        style={{
          width: 60,
          background: 'transparent',
          color: 'var(--ksr-text-1)',
          border: 'none',
          outline: 'none',
          fontSize: 12,
          fontFamily: 'var(--ksr-font-mono)',
          textAlign: 'right'
        }}
      />
      <span style={{ fontSize: 10, color: 'var(--ksr-text-3)', paddingRight: 6 }}>{suffix}</span>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  mono,
  placeholder
}: {
  value: string;
  onChange: (next: string) => void;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: 260,
        padding: '6px 10px',
        borderRadius: 6,
        background: 'var(--ksr-surf-1)',
        color: 'var(--ksr-text-1)',
        border: '1px solid var(--ksr-border-1)',
        fontFamily: mono ? 'var(--ksr-font-mono)' : 'var(--ksr-font-sans)',
        fontSize: 11.5,
        outline: 'none'
      }}
    />
  );
}

function Divider() {
  return (
    <div style={{ height: 1, background: 'var(--ksr-border-0)', margin: '8px 0' }} />
  );
}

// ── Sections ───────────────────────────────────────────────

function CaptureSection({
  settings,
  patch
}: {
  settings: AppSettings;
  patch: (p: Partial<AppSettings>) => void;
}) {
  return (
    <>
      <SectionHead title="Capture" sub="Tune when and how StepForge takes screenshots." />
      <Row
        label="Capture delay"
        sub="Milliseconds to wait after an event before snapping a screenshot."
      >
        <NumInput
          value={settings.captureDelayMs}
          onChange={(v) => patch({ captureDelayMs: v })}
          suffix="ms"
        />
      </Row>
      <Row
        label="Debounce interval"
        sub="Suppress duplicate clicks within this window."
      >
        <NumInput
          value={settings.debounceIntervalMs}
          onChange={(v) => patch({ debounceIntervalMs: v })}
          suffix="ms"
        />
      </Row>
      <Row label="Double-click threshold">
        <NumInput
          value={settings.doubleClickThresholdMs}
          onChange={(v) => patch({ doubleClickThresholdMs: v })}
          suffix="ms"
        />
      </Row>
      <Divider />
      <Row label="Capture keyboard shortcuts">
        <Toggle
          on={settings.captureKeyboardShortcuts}
          onChange={(v) => patch({ captureKeyboardShortcuts: v })}
        />
      </Row>
      <Row label="Capture text entry">
        <Toggle
          on={settings.captureTextEntry}
          onChange={(v) => patch({ captureTextEntry: v })}
        />
      </Row>
      <Row label="Capture scroll events">
        <Toggle
          on={settings.captureScrollEvents}
          onChange={(v) => patch({ captureScrollEvents: v })}
        />
      </Row>
    </>
  );
}

function AppSection({
  settings,
  patch
}: {
  settings: AppSettings;
  patch: (p: Partial<AppSettings>) => void;
}) {
  return (
    <>
      <SectionHead
        title="App behavior"
        sub="How StepForge behaves while recording and on idle."
      />
      <Row label="Dark mode">
        <Toggle
          on={settings.theme === 'dark'}
          onChange={(v) => {
            const theme = v ? 'dark' : 'light';
            patch({ theme, darkMode: v });
            document.documentElement.setAttribute('data-theme', theme);
          }}
        />
      </Row>
      <Row label="App color" sub="Choose the accent used for buttons, tabs, highlights, and active states.">
        <AccentPresetPicker
          value={settings.accentColor}
          onChange={(accentColor) => {
            setAccentColor(accentColor);
            patch({ accentColor });
          }}
        />
      </Row>
      <Row label="Minimize to system tray during recording">
        <Toggle
          on={settings.minimizeToTrayDuringRecording}
          onChange={(v) => patch({ minimizeToTrayDuringRecording: v })}
        />
      </Row>
      <Row label="Show in system tray on startup">
        <Toggle
          on={settings.showInTrayOnStartup}
          onChange={(v) => patch({ showInTrayOnStartup: v })}
        />
      </Row>
      <Divider />
      <Row label="Auto-save session">
        <Toggle
          on={settings.autoSaveEnabled}
          onChange={(v) => patch({ autoSaveEnabled: v })}
        />
      </Row>
      <Row label="Auto-save interval">
        <NumInput
          value={settings.autoSaveIntervalSeconds}
          onChange={(v) => patch({ autoSaveIntervalSeconds: v })}
          suffix="s"
          disabled={!settings.autoSaveEnabled}
        />
      </Row>
      <Row label="Pause when excluded app is focused">
        <Toggle
          on={settings.pauseOnExcludedApp}
          onChange={(v) => patch({ pauseOnExcludedApp: v })}
        />
      </Row>
    </>
  );
}

function AccentPresetPicker({
  value,
  onChange
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 32px)',
        gap: 8
      }}
    >
      {accentColorPresets.map((preset) => {
        const active = preset.value.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={preset.id}
            type="button"
            title={preset.name}
            aria-label={preset.name}
            onClick={() => onChange(preset.value)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: active ? '2px solid var(--ksr-text-0)' : '1px solid var(--ksr-border-1)',
              background: preset.value,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: active ? `0 0 0 3px ${preset.value}33` : 'none'
            }}
          >
            {active && <Check size={15} color="#fff" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}

function DefaultsSection({
  settings,
  patch
}: {
  settings: AppSettings;
  patch: (p: Partial<AppSettings>) => void;
}) {
  const [excluded, setExcluded] = useState(settings.excludedProcesses.join(', '));
  useEffect(() => setExcluded(settings.excludedProcesses.join(', ')), [settings.excludedProcesses]);

  return (
    <>
      <SectionHead title="Defaults" sub="Pre-fill these fields on every new session." />
      <Row label="Default tester name">
        <TextInput
          value={settings.defaultTesterName}
          onChange={(v) => patch({ defaultTesterName: v })}
        />
      </Row>
      <Row label="Default environment">
        <TextInput
          value={settings.defaultEnvironment}
          onChange={(v) => patch({ defaultEnvironment: v })}
        />
      </Row>
      <Row label="Default priority">
        <TextInput
          value={settings.defaultPriority}
          onChange={(v) => patch({ defaultPriority: v })}
        />
      </Row>
      <Row label="Xray host folder">
        <TextInput
          value={settings.sessionStoragePath || ''}
          onChange={(v) => patch({ sessionStoragePath: v })}
          mono
          placeholder="Choose where recording folders are saved"
        />
      </Row>
      <Row
        label="Excluded processes"
        sub="Comma-separated. These windows will never be captured."
      >
        <TextInput
          value={excluded}
          onChange={(v) => {
            setExcluded(v);
            patch({
              excludedProcesses: v
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            });
          }}
        />
      </Row>
      <Row label="Reset to defaults">
        <button
          onClick={() => patch({ ...defaultAppSettings })}
          style={{
            padding: '5px 12px',
            borderRadius: 6,
            background: 'var(--ksr-surf-2)',
            border: '1px solid var(--ksr-border-1)',
            color: 'var(--ksr-text-2)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Reset all
        </button>
      </Row>
    </>
  );
}

function AboutSection() {
  const updateStatus = useProjectStore((s) => s.updateStatus);
  const setUpdateStatus = useProjectStore((s) => s.setUpdateStatus);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    void window.stepForge.app.info().then(setAppInfo);
    const off = window.stepForge.update.onStatus(setUpdateStatus);
    return () => off();
  }, [setUpdateStatus]);

  const updateLabel = updateStatus.status === 'checking'
    ? 'Checking...'
    : updateStatus.status === 'available'
      ? `Update available v${updateStatus.version}`
      : updateStatus.status === 'downloading'
        ? `Downloading ${Math.round(updateStatus.percent)}%`
        : updateStatus.status === 'downloaded'
          ? `Ready to install v${updateStatus.version}`
          : updateStatus.status === 'installing'
            ? 'Installing update...'
            : updateStatus.status === 'not-available'
              ? 'Up to date'
              : updateStatus.status === 'error'
                ? 'Update failed'
                : 'Check for updates';

  return (
    <>
      <SectionHead title="About" sub="Version, system info, and credits." />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: 18,
          background: 'var(--ksr-surf-1)',
          border: '1px solid var(--ksr-border-0)',
          borderRadius: 12,
          marginBottom: 14
        }}
      >
        <BrandMark size={56} accent={ACCENT} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: 'var(--ksr-text-0)',
              letterSpacing: '-0.02em'
            }}
          >
            StepForge <span style={{ color: ACCENT }}>{appInfo?.version ?? ''}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ksr-text-2)', marginTop: 4 }}>
            Built on Electron · {appInfo ? `${appInfo.platform}-${appInfo.arch}` : 'Windows'} · NSIS installer
          </div>
          <div style={{ fontSize: 12, color: 'var(--ksr-text-3)', marginTop: 4 }}>
            © Kayle Schmoyer — All rights reserved.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => void window.stepForge.update.check()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              background: 'var(--ksr-acc-soft)',
              color: ACCENT,
              border: '1px solid var(--ksr-acc-border)',
              fontSize: 11,
              fontWeight: 600
            }}
          >
            <Search size={12} /> {updateLabel}
          </button>
          <button
            onClick={() => appInfo && void window.stepForge.app.openExternal(appInfo.releaseNotesUrl)}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              background: 'var(--ksr-surf-2)',
              color: 'var(--ksr-text-2)',
              border: '1px solid var(--ksr-border-1)',
              fontSize: 11,
              fontWeight: 600
            }}
          >
            Open release notes
          </button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ksr-text-3)', lineHeight: 1.7 }}>
        Window-only capture · PowerShell capture path · uiohook-napi input hooks
      </div>
    </>
  );
}
