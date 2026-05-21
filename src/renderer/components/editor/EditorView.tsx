import { useEffect } from 'react';
import { EditorTabs } from './EditorTabs';
import { Timeline } from './Timeline';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';
import { PreviewTab } from './PreviewTab';
import { useProjectStore } from '@renderer/state/projectStore';

export function EditorView() {
  const tab = useProjectStore((s) => s.editorTab);
  const project = useProjectStore((s) => s.project);

  useEffect(() => {
    if (!project) return;
    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return;
      const file = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
        ?.getAsFile();
      if (!file) return;
      event.preventDefault();
      void file.arrayBuffer().then((imageBytes) => window.stepForge.step.addScreenshot({ imageBytes, description: 'Pasted screenshot' }));
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [project]);

  if (!project) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ksr-text-3)',
          fontSize: 13,
          padding: 32
        }}
      >
        No project loaded. Start a recording from the title bar or open a saved session.
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        background: 'var(--ksr-bg)'
      }}
    >
      <EditorTabs />
      {tab === 'edit' && (
        <>
          <Timeline />
          <div
            style={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden',
              minHeight: 0
            }}
          >
            <Canvas />
            <Inspector />
          </div>
        </>
      )}
      {tab === 'preview' && <PreviewTab />}
    </div>
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}
