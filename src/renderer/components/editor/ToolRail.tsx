import {
  MousePointer2,
  ArrowUpRight,
  Square,
  Circle,
  CircleDot,
  Droplet,
  EyeOff
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useProjectStore, type AnnotationTool } from '@renderer/state/projectStore';

const ACCENT = '#00c4ff';

interface ToolDef {
  id: AnnotationTool;
  Icon: ComponentType<{ size?: number }>;
  label: string;
}

const TOOLS: ToolDef[] = [
  { id: 'select', Icon: MousePointer2, label: 'Select' },
  { id: 'arrow', Icon: ArrowUpRight, label: 'Arrow' },
  { id: 'rect', Icon: Square, label: 'Rectangle' },
  { id: 'circle', Icon: Circle, label: 'Highlight' },
  { id: 'number', Icon: CircleDot, label: 'Number badge' },
  { id: 'blur', Icon: Droplet, label: 'Blur' },
  { id: 'redact', Icon: EyeOff, label: 'Redact' }
];

export function ToolRail() {
  const tool = useProjectStore((s) => s.activeTool);
  const setTool = useProjectStore((s) => s.setActiveTool);

  return (
    <div
      style={{
        width: 'var(--ksr-toolrail-w)',
        background: 'var(--ksr-surf-0)',
        borderRight: '1px solid var(--ksr-border-0)',
        padding: '10px 4px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        alignItems: 'center'
      }}
    >
      {TOOLS.map((t) => {
        const active = tool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={t.label}
            style={{
              width: 36,
              height: 36,
              borderRadius: 7,
              cursor: 'pointer',
              background: active ? 'var(--ksr-acc-soft)' : 'transparent',
              border: active ? '1px solid var(--ksr-acc-border)' : '1px solid transparent',
              color: active ? ACCENT : 'var(--ksr-text-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <t.Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}
