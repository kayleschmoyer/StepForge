import { useEffect } from 'react';
import { TitleBar } from './components/chrome/TitleBar';
import { Rail } from './components/chrome/Rail';
import { StatusBar } from './components/chrome/StatusBar';
import { HomeView } from './components/home/HomeView';
import { EditorView } from './components/editor/EditorView';
import { ExportDrawer } from './components/overlays/ExportDrawer';
import { SettingsOverlay } from './components/overlays/SettingsOverlay';
import { CommandPalette } from './components/overlays/CommandPalette';
import { CapturedToast } from './components/overlays/CapturedToast';
import { RecordingSetupOverlay } from './components/overlays/RecordingSetupOverlay';
import { FirstRunSetupOverlay } from './components/overlays/FirstRunSetupOverlay';
import { DiagnosticsOverlay } from './components/overlays/DiagnosticsOverlay';
import { useProjectStore } from './state/projectStore';
import { MOCK_PROJECT } from './state/mockSeed';
import { applySettingsAppearance } from './services/theme';

export default function App() {
  const view = useProjectStore((s) => s.view);
  const setPaletteOpen = useProjectStore((s) => s.setPaletteOpen);
  const setSettingsOpen = useProjectStore((s) => s.setSettingsOpen);
  const setExportOpen = useProjectStore((s) => s.setExportOpen);
  const setRecordingSetupOpen = useProjectStore((s) => s.setRecordingSetupOpen);
  const setDiagnosticsOpen = useProjectStore((s) => s.setDiagnosticsOpen);
  const setFirstRunSetupOpen = useProjectStore((s) => s.setFirstRunSetupOpen);
  const setProject = useProjectStore((s) => s.setProject);
  const setSettings = useProjectStore((s) => s.setSettings);
  const setView = useProjectStore((s) => s.setView);
  const setRecState = useProjectStore((s) => s.setRecState);
  const project = useProjectStore((s) => s.project);
  const settings = useProjectStore((s) => s.settings);

  useEffect(() => {
    applySettingsAppearance(settings);
  }, [settings]);

  // Bootstrap: load settings, seed mock project in dev when nothing is loaded.
  useEffect(() => {
    void window.stepForge.settings.get().then((settings) => {
      setSettings(settings);
      applySettingsAppearance(settings);
      if (!settings.firstRunSetupComplete) setFirstRunSetupOpen(true);
    });

    if (!project && import.meta.env.DEV) {
      setProject(MOCK_PROJECT);
      useProjectStore.setState({ view: 'EDITOR' });
    }
    const offSettings = window.stepForge.settings.onChanged(setSettings);
    const offProject = window.stepForge.project.onChanged((nextProject) => {
      setProject(nextProject);
      setView('EDITOR');
    });
    const offRecording = window.stepForge.recording.onStateChanged(setRecState);
    return () => {
      offSettings();
      offProject();
      offRecording();
    };
  }, [setProject, setSettings, setFirstRunSetupOpen, setView, setRecState, project]);

  // Global keymap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
        setSettingsOpen(false);
        setExportOpen(false);
        setRecordingSetupOpen(false);
        setDiagnosticsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen, setSettingsOpen, setExportOpen, setRecordingSetupOpen, setDiagnosticsOpen]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--ksr-bg)',
        color: 'var(--ksr-text-1)',
        fontFamily: 'var(--ksr-font-sans)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <TitleBar />

      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
          position: 'relative'
        }}
      >
        <Rail />

        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            overflow: 'hidden'
          }}
        >
          {view === 'HOME' && <HomeView />}
          {view === 'EDITOR' && <EditorView />}
        </main>
      </div>

      <StatusBar />

      <ExportDrawer />
      <RecordingSetupOverlay />
      <FirstRunSetupOverlay />
      <DiagnosticsOverlay />
      <SettingsOverlay />
      <CommandPalette />
      <CapturedToast />
    </div>
  );
}
