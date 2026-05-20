import { useEffect, useState } from 'react';
import {
  Bug,
  AlertTriangle,
  MoreHorizontal,
  Copy,
  ArrowUp,
  ArrowDown,
  Trash2
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useProjectStore } from '@renderer/state/projectStore';
import type { RecordedStep, StepFlag } from '@shared/models/Step';

const ACCENT = '#00c4ff';

export function Inspector() {
  const step = useProjectStore((s) =>
    s.project?.steps.find((st) => st.id === s.selectedStepId)
  );
  const project = useProjectStore((s) => s.project);

  if (!step || !project) {
    return (
      <aside
        style={{
          width: 'var(--ksr-inspector-w)',
          flexShrink: 0,
          background: 'var(--ksr-surf-0)',
          borderLeft: '1px solid var(--ksr-border-0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ksr-text-3)',
          fontSize: 12,
          padding: 16,
          textAlign: 'center'
        }}
      >
        Select a step to inspect.
      </aside>
    );
  }

  return (
    <aside
      style={{
        width: 'var(--ksr-inspector-w)',
        flexShrink: 0,
        background: 'var(--ksr-surf-0)',
        borderLeft: '1px solid var(--ksr-border-0)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <InspectorHeader step={step} />
      <DescriptionSection step={step} />
      <FlagsSection step={step} />
      {(step.flags.includes('Bug') || step.userNote) && (
        <ExpectedActualSection step={step} expected={project.metadata.expected} actual={project.metadata.actual} />
      )}
      {step.warnings && step.warnings.length > 0 && <WarningsSection step={step} />}
      <ActionFooter step={step} />
    </aside>
  );
}

function InspectorHeader({ step }: { step: RecordedStep }) {
  const flagColor = step.flags.includes('Bug')
    ? 'var(--ksr-bug)'
    : step.flags.includes('Important')
      ? 'var(--ksr-imp)'
      : ACCENT;
  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--ksr-border-0)',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          flexShrink: 0,
          background: flagColor,
          color: 'var(--ksr-text-inverse)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 13,
          boxShadow: `0 0 0 3px ${typeof flagColor === 'string' ? flagColor : '#00c4ff'}28`
        }}
      >
        {step.stepNumber}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ksr-text-3)'
          }}
        >
          Step Properties
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--ksr-text-0)',
            marginTop: 2,
            letterSpacing: 'var(--ksr-track-snug)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {step.description}
        </div>
      </div>
      <button
        style={{
          width: 28,
          height: 28,
          padding: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ksr-text-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <MoreHorizontal size={16} />
      </button>
    </div>
  );
}

function InsSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--ksr-border-0)'
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--ksr-text-3)',
          marginBottom: 8
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 7,
  fontFamily: 'var(--ksr-font-sans)',
  fontSize: 12.5,
  background: 'var(--ksr-surf-1)',
  color: 'var(--ksr-text-1)',
  border: '1px solid var(--ksr-border-1)',
  outline: 'none',
  marginBottom: 8
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: 56,
  lineHeight: 1.55,
  marginBottom: 0
};

function DescriptionSection({ step }: { step: RecordedStep }) {
  const updateStep = useProjectStore((s) => s.updateStep);
  const [desc, setDesc] = useState(step.description);
  const [note, setNote] = useState(step.userNote ?? '');

  useEffect(() => {
    setDesc(step.description);
    setNote(step.userNote ?? '');
  }, [step.id, step.description, step.userNote]);

  useEffect(() => {
    if (desc === step.description) return;
    const t = setTimeout(() => {
      updateStep(step.id, { description: desc });
      void window.stepForge.step.update({ id: step.id, patch: { description: desc } });
    }, 400);
    return () => clearTimeout(t);
  }, [desc, step.id, step.description, updateStep]);

  useEffect(() => {
    if (note === (step.userNote ?? '')) return;
    const t = setTimeout(() => {
      updateStep(step.id, { userNote: note });
      void window.stepForge.step.update({ id: step.id, patch: { userNote: note } });
    }, 400);
    return () => clearTimeout(t);
  }, [note, step.id, step.userNote, updateStep]);

  return (
    <InsSection label="Description">
      <input value={desc} onChange={(e) => setDesc(e.target.value)} style={inputStyle} />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note for this step…"
        style={textareaStyle}
      />
    </InsSection>
  );
}

function FlagsSection({ step }: { step: RecordedStep }) {
  const toggleFlag = useProjectStore((s) => s.toggleFlag);
  const defs: {
    id: StepFlag;
    label: string;
    Icon: ComponentType<{ size?: number }>;
    color: string;
    bg: string;
    border: string;
    text: string;
  }[] = [
    {
      id: 'Important',
      label: 'Important',
      Icon: AlertTriangle,
      color: 'var(--ksr-imp)',
      bg: 'var(--ksr-imp-bg)',
      border: 'var(--ksr-imp-border)',
      text: 'var(--ksr-imp-text)'
    },
    {
      id: 'Bug',
      label: 'Bug',
      Icon: Bug,
      color: 'var(--ksr-bug)',
      bg: 'var(--ksr-bug-bg)',
      border: 'var(--ksr-bug-border)',
      text: 'var(--ksr-bug-text)'
    }
  ];
  return (
    <InsSection label="Flags">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {defs.map((f) => {
          const on = step.flags.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => {
                toggleFlag(step.id, f.id);
                void window.stepForge.step.toggleFlag({ id: step.id, flag: f.id });
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 7,
                cursor: 'pointer',
                background: on ? f.bg : 'transparent',
                color: on ? f.text : 'var(--ksr-text-3)',
                border: `1px solid ${on ? f.border : 'var(--ksr-border-1)'}`,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'var(--ksr-font-sans)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              <f.Icon size={11} />
              {f.label}
            </button>
          );
        })}
      </div>
    </InsSection>
  );
}

function ExpectedActualSection({
  step,
  expected,
  actual
}: {
  step: RecordedStep;
  expected: string;
  actual: string;
}) {
  const isBug = step.flags.includes('Bug');
  const updateMetadata = useProjectStore((s) => s.updateMetadata);
  const [expectedDraft, setExpectedDraft] = useState(expected);
  const [actualDraft, setActualDraft] = useState(actual);

  useEffect(() => {
    setExpectedDraft(expected);
  }, [expected]);

  useEffect(() => {
    setActualDraft(actual);
  }, [actual]);

  useEffect(() => {
    if (!isBug || expectedDraft === expected) return;
    const timer = setTimeout(() => {
      updateMetadata({ expected: expectedDraft });
      void window.stepForge.project.updateMetadata({ patch: { expected: expectedDraft } });
    }, 400);
    return () => clearTimeout(timer);
  }, [expected, expectedDraft, isBug, updateMetadata]);

  useEffect(() => {
    if (!isBug || actualDraft === actual) return;
    const timer = setTimeout(() => {
      updateMetadata({ actual: actualDraft });
      void window.stepForge.project.updateMetadata({ patch: { actual: actualDraft } });
    }, 400);
    return () => clearTimeout(timer);
  }, [actual, actualDraft, isBug, updateMetadata]);

  return (
    <InsSection label={isBug ? 'Expected vs Actual' : 'Note'}>
      {isBug ? (
        <>
          <ResultField
            kind="expected"
            value={expectedDraft}
            onChange={setExpectedDraft}
            placeholder="What should have happened?"
          />
          <ResultField
            kind="actual"
            value={actualDraft}
            onChange={setActualDraft}
            placeholder="What actually happened?"
          />
        </>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--ksr-text-2)', lineHeight: 1.55 }}>
          {step.userNote}
        </div>
      )}
    </InsSection>
  );
}

function ResultField({
  kind,
  value,
  onChange,
  placeholder
}: {
  kind: 'expected' | 'actual';
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const cfg =
    kind === 'expected'
      ? { color: 'var(--ksr-ok-text)', bg: 'var(--ksr-ok-bg)', label: 'Expected' }
      : { color: 'var(--ksr-bug-text)', bg: 'var(--ksr-bug-bg)', label: 'Actual' };
  return (
    <div
      style={{
        borderLeft: `3px solid ${cfg.color}`,
        background: cfg.bg,
        padding: '8px 10px',
        borderRadius: 6,
        marginBottom: 8
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: cfg.color,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 4
        }}
      >
        {cfg.label}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          minHeight: 68,
          resize: 'vertical',
          border: '1px solid var(--ksr-border-1)',
          borderRadius: 6,
          background: 'var(--ksr-surf-0)',
          color: 'var(--ksr-text-1)',
          fontFamily: 'var(--ksr-font-sans)',
          fontSize: 12,
          lineHeight: 1.5,
          padding: '8px 9px',
          outline: 'none'
        }}
      />
    </div>
  );
}

function WarningsSection({ step }: { step: RecordedStep }) {
  return (
    <InsSection label="Capture Warnings">
      {step.warnings?.map((w, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 7,
            background: 'var(--ksr-imp-bg)',
            border: '1px solid var(--ksr-imp-border)',
            color: 'var(--ksr-imp-text)',
            fontSize: 11.5,
            lineHeight: 1.5,
            marginBottom: 6
          }}
        >
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{w.message}</span>
        </div>
      ))}
    </InsSection>
  );
}

function ActionFooter({ step }: { step: RecordedStep }) {
  const duplicate = useProjectStore((s) => s.duplicateStep);
  const reorder = useProjectStore((s) => s.reorderStep);
  const remove = useProjectStore((s) => s.deleteStep);

  const handleDuplicate = () => {
    duplicate(step.id);
    void window.stepForge.step.duplicate(step.id);
  };
  const handleUp = () => {
    reorder(step.id, 'up');
    void window.stepForge.step.reorder({ id: step.id, direction: 'up' });
  };
  const handleDown = () => {
    reorder(step.id, 'down');
    void window.stepForge.step.reorder({ id: step.id, direction: 'down' });
  };
  const handleDelete = () => {
    remove(step.id);
    void window.stepForge.step.delete(step.id);
  };

  return (
    <div
      style={{
        marginTop: 'auto',
        padding: '14px 16px',
        borderTop: '1px solid var(--ksr-border-0)',
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap'
      }}
    >
      <SmallBtn Icon={Copy} onClick={handleDuplicate}>
        Duplicate
      </SmallBtn>
      <SmallBtn Icon={ArrowUp} onClick={handleUp}>
        Up
      </SmallBtn>
      <SmallBtn Icon={ArrowDown} onClick={handleDown}>
        Down
      </SmallBtn>
      <SmallBtn Icon={Trash2} onClick={handleDelete} danger>
        Delete
      </SmallBtn>
    </div>
  );
}

function SmallBtn({
  Icon,
  children,
  onClick,
  danger
}: {
  Icon: ComponentType<{ size?: number }>;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 10px',
        borderRadius: 6,
        cursor: 'pointer',
        background: 'transparent',
        border: `1px solid ${danger ? 'var(--ksr-bug-border)' : 'var(--ksr-border-1)'}`,
        color: danger ? 'var(--ksr-bug-text)' : 'var(--ksr-text-2)',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'var(--ksr-font-sans)'
      }}
    >
      <Icon size={12} />
      {children}
    </button>
  );
}
