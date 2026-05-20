import { Edit, Eye, Download } from 'lucide-react';
import { useProjectStore, type EditorTab } from '@renderer/state/projectStore';

const ACCENT = '#00c4ff';

const TABS: { id: EditorTab; label: string; Icon: typeof Edit }[] = [
  { id: 'edit', label: 'Edit Steps', Icon: Edit },
  { id: 'preview', label: 'Live Preview', Icon: Eye }
];

export function EditorTabs() {
  const tab = useProjectStore((s) => s.editorTab);
  const setTab = useProjectStore((s) => s.setEditorTab);
  const setExportOpen = useProjectStore((s) => s.setExportOpen);

  return (
    <div
      style={{
        height: 'var(--ksr-tabs-h)',
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--ksr-surf-0)',
        borderBottom: '1px solid var(--ksr-border-0)',
        padding: '0 12px',
        gap: 4,
        flexShrink: 0
      }}
    >
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12,
              fontWeight: 600,
              color: active ? 'var(--ksr-text-0)' : 'var(--ksr-text-2)',
              borderBottom: `2px solid ${active ? ACCENT : 'transparent'}`,
              fontFamily: 'var(--ksr-font-sans)',
              letterSpacing: 'var(--ksr-track-snug)'
            }}
          >
            <t.Icon size={13} />
            {t.label}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <button
        onClick={() => setExportOpen(true)}
        style={{
          alignSelf: 'center',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 7,
          border: 'none',
          cursor: 'pointer',
          background: ACCENT,
          color: 'var(--ksr-text-inverse)',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'var(--ksr-font-sans)',
          letterSpacing: 'var(--ksr-track-snug)',
          boxShadow: `0 0 0 1px ${ACCENT}, 0 6px 18px ${ACCENT}25`
        }}
      >
        <Download size={13} /> Export Report
      </button>
    </div>
  );
}
