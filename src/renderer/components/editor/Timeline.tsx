import { MousePointerClick, Keyboard, ArrowDown, ArrowRight, Plus, Bug, AlertTriangle, ImagePlus, X } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { useProjectStore } from '@renderer/state/projectStore';
import type { RecordedStep, ActionType } from '@shared/models/Step';

const ACCENT = 'var(--ksr-acc)';

const ACTION_ICON: Record<ActionType, typeof MousePointerClick> = {
  LeftClick: MousePointerClick,
  RightClick: MousePointerClick,
  DoubleClick: MousePointerClick,
  MiddleClick: MousePointerClick,
  KeyboardInput: Keyboard,
  KeyboardShortcut: Keyboard,
  TextEntry: Keyboard,
  Scroll: ArrowDown,
  WindowActivated: ArrowRight,
  WindowClosed: ArrowRight,
  MenuItemSelected: ArrowRight,
  DragAndDrop: ArrowRight,
  ManualNote: Plus
};

export function Timeline() {
  const steps = useProjectStore((s) => s.project?.steps ?? []);
  const selectedId = useProjectStore((s) => s.selectedStepId);
  const selectStep = useProjectStore((s) => s.selectStep);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div
      style={{
        height: 'var(--ksr-timeline-h)',
        flexShrink: 0,
        background: 'var(--ksr-surf-0)',
        borderBottom: '1px solid var(--ksr-border-0)',
        display: 'flex',
        alignItems: 'center',
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '12px 16px',
        gap: 10
      }}
    >
      {steps.map((s) => (
        <TimelineCard
          key={s.id}
          step={s}
          selected={s.id === selectedId}
          onClick={() => selectStep(s.id)}
        />
      ))}
      <button
        title="Add new step — note, screenshot, or paste"
        onClick={() => setAddOpen(true)}
        style={addButtonStyle}
      >
        <Plus size={18} />
      </button>
      {addOpen && <AddStepModal onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function AddStepModal({ onClose }: { onClose: () => void }) {
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
        ?.getAsFile();
      if (!file) return;
      event.preventDefault();
      event.stopPropagation();
      setBusy(true);
      void file.arrayBuffer().then(async (imageBytes) => {
        await window.stepForge.step.addScreenshot({
          imageBytes,
          description: description.trim() || 'Pasted screenshot'
        });
        onClose();
      });
    };
    window.addEventListener('paste', handlePaste, true);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('paste', handlePaste, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [description, onClose]);

  const handleBrowse = async () => {
    const sourcePath = await window.stepForge.dialog.openFile({
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }],
      properties: ['openFile']
    });
    if (!sourcePath) return;
    setBusy(true);
    await window.stepForge.step.addScreenshot({
      sourcePath,
      description: description.trim() || undefined
    });
    onClose();
  };

  const handleAddNote = async () => {
    setBusy(true);
    await window.stepForge.step.addManual();
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2,6,10,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          maxWidth: 'calc(100vw - 32px)',
          background: 'var(--ksr-surf-1)',
          border: '1px solid var(--ksr-border-1)',
          borderRadius: 14,
          padding: 22,
          fontFamily: 'var(--ksr-font-sans)',
          color: 'var(--ksr-text-1)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Add new step</div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--ksr-text-3)', cursor: 'pointer' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ksr-text-3)', letterSpacing: '0.06em' }}>
          Description (optional)
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          spellCheck
          placeholder="Describe what this step shows…"
          autoFocus
          style={{
            width: '100%',
            marginTop: 6,
            marginBottom: 14,
            padding: '8px 10px',
            background: 'var(--ksr-surf-0)',
            border: '1px solid var(--ksr-border-1)',
            borderRadius: 8,
            color: 'var(--ksr-text-1)',
            fontFamily: 'inherit',
            fontSize: 13
          }}
        />

        <button
          onClick={() => void handleBrowse()}
          disabled={busy}
          style={{
            width: '100%',
            padding: '18px 14px',
            border: '1.5px dashed var(--ksr-border-1)',
            borderRadius: 10,
            background: 'transparent',
            color: 'var(--ksr-text-2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            cursor: busy ? 'progress' : 'pointer',
            fontFamily: 'inherit'
          }}
        >
          <ImagePlus size={22} color={ACCENT} />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ksr-text-1)' }}>
            Click to choose a screenshot
          </div>
          <div style={{ fontSize: 11, color: 'var(--ksr-text-3)' }}>
            or press Ctrl+V to paste an image from your clipboard
          </div>
        </button>

        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button
            onClick={() => void handleAddNote()}
            disabled={busy}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: '1px solid var(--ksr-border-1)',
              borderRadius: 8,
              color: 'var(--ksr-text-1)',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              cursor: busy ? 'progress' : 'pointer'
            }}
          >
            Add note without screenshot
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: '1px solid var(--ksr-border-1)',
              borderRadius: 8,
              color: 'var(--ksr-text-2)',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const addButtonStyle: CSSProperties = {
  width: 64,
  height: 84,
  flexShrink: 0,
  borderRadius: 10,
  background: 'transparent',
  border: '1.5px dashed var(--ksr-border-1)',
  color: 'var(--ksr-text-3)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

function TimelineCard({
  step,
  selected,
  onClick
}: {
  step: RecordedStep;
  selected: boolean;
  onClick: () => void;
}) {
  const hasBug = step.flags.includes('Bug');
  const hasImp = step.flags.includes('Important');
  const flagColor = hasBug ? 'var(--ksr-bug)' : hasImp ? 'var(--ksr-imp)' : ACCENT;
  const flagShadow = hasBug ? '#ef4444' : hasImp ? '#f59e0b' : ACCENT;
  const Icon = ACTION_ICON[step.actionType] ?? MousePointerClick;
  const FlagIcon = hasBug ? Bug : AlertTriangle;
  const timeShort = new Date(step.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <button
      onClick={onClick}
      style={{
        width: 'var(--ksr-step-thumb-w)',
        height: 'var(--ksr-step-thumb-h)',
        flexShrink: 0,
        position: 'relative',
        borderRadius: 10,
        padding: 0,
        overflow: 'hidden',
        background: 'var(--ksr-surf-1)',
        border: selected ? `2px solid ${flagColor}` : '1px solid var(--ksr-border-0)',
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: selected
          ? `0 0 0 3px ${flagShadow}22, 0 6px 18px rgba(0,0,0,0.4)`
          : '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
        transform: selected ? 'translateY(-2px)' : 'none'
      }}
    >
      {/* Number badge */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          zIndex: 2,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: flagColor,
          color: 'var(--ksr-text-inverse)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800,
          fontFamily: 'var(--ksr-font-sans)',
          boxShadow: '0 0 0 2px var(--ksr-surf-0)'
        }}
      >
        {step.stepNumber}
      </div>
      {step.flags.length > 0 && (
        <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, color: flagColor }}>
          <FlagIcon size={12} />
        </div>
      )}

      {/* Thumbnail placeholder */}
      <div style={{ position: 'absolute', inset: 0, padding: '24px 6px 24px' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 4,
            overflow: 'hidden',
            background: '#0f172a',
            position: 'relative'
          }}
        >
          <ThumbnailPlaceholder step={step} />
        </div>
      </div>

      {/* Time strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))',
          padding: '14px 8px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'var(--ksr-font-mono)',
          fontSize: 9,
          color: '#e2e8f0'
        }}
      >
        <span style={{ color: 'var(--ksr-text-2)' }}>{timeShort}</span>
        <span
          style={{
            marginLeft: 'auto',
            color: flagColor,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3
          }}
        >
          <Icon size={9} />
        </span>
      </div>
    </button>
  );
}

function ThumbnailPlaceholder({ step }: { step: RecordedStep }) {
  // Phase 6 swaps this for a real <img src={file://screenshotPath} />
  if (step.screenshotPath) {
    return (
      <img
        src={'file://' + step.screenshotPath}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 2,
        padding: 4,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      }}
    >
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 2 }} />
      ))}
    </div>
  );
}
