import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useProjectStore } from '@renderer/state/projectStore';
import type { RecordedStep } from '@shared/models/Step';
import type { Annotation } from '@shared/models/Annotation';

interface Props {
  step: RecordedStep;
  viewWidth: number;
  viewHeight: number;
  nativeWidth: number;
  nativeHeight: number;
  disabled?: boolean;
}

const DEFAULT_COLOR = '#00c4ff';
const DEFAULT_STROKE = 4;
const DEFAULT_FONT = 22;

function svgPoint(svg: SVGSVGElement, ev: RPointerEvent<SVGSVGElement>): [number, number] {
  const pt = svg.createSVGPoint();
  pt.x = ev.clientX;
  pt.y = ev.clientY;
  const transformed = pt.matrixTransform(svg.getScreenCTM()?.inverse());
  return [Math.round(transformed.x), Math.round(transformed.y)];
}

function newId(): string {
  return 'a-' + Math.random().toString(36).slice(2, 10);
}

export function AnnotationLayer({ step, viewWidth, viewHeight, nativeWidth, nativeHeight, disabled = false }: Props) {
  const tool = useProjectStore((s) => s.activeTool);
  const setAnnotations = useProjectStore((s) => s.setStepAnnotations);
  const [draft, setDraft] = useState<Annotation | null>(null);
  const [textEditor, setTextEditor] = useState<{ x: number; y: number; value: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const startRef = useRef<[number, number] | null>(null);
  const dragRef = useRef<{ id: string; start: [number, number]; original: Annotation } | null>(null);

  const updateLocal = useCallback(
    (next: Annotation[]) => setAnnotations(step.id, next),
    [setAnnotations, step.id]
  );

  const persist = useCallback(
    (next: Annotation[]) => {
      updateLocal(next);
      void window.stepForge.step.setAnnotations({ id: step.id, annotations: next });
    },
    [step.id, updateLocal]
  );

  useEffect(() => {
    if (textEditor) textInputRef.current?.focus();
  }, [textEditor]);

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        persist(step.annotations.filter((annotation) => annotation.id !== selectedId));
        setSelectedId(null);
      } else if (event.key === 'Escape') {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [persist, selectedId, step.annotations]);

  const commitTextEditor = useCallback(() => {
    if (!textEditor) return;
    const text = textEditor.value.trim();
    if (text) {
      const annotation: Annotation = { id: newId(), kind: 'text', at: [textEditor.x, textEditor.y], text, color: DEFAULT_COLOR, fontSize: DEFAULT_FONT };
      persist([...step.annotations, annotation]);
      setSelectedId(annotation.id);
    }
    setTextEditor(null);
  }, [persist, step.annotations, textEditor]);

  const handlePointerDown = (event: RPointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const [x, y] = svgPoint(svgRef.current, event);

    if (tool === 'select') {
      const hit = findAnnotationAt(step.annotations, x, y);
      setSelectedId(hit?.id ?? null);
      if (hit) {
        dragRef.current = { id: hit.id, start: [x, y], original: hit };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      return;
    }

    startRef.current = [x, y];
    setSelectedId(null);

    let annotation: Annotation;
    switch (tool) {
      case 'arrow':
        annotation = { id: newId(), kind: 'arrow', from: [x, y], to: [x, y], color: DEFAULT_COLOR, strokeWidth: DEFAULT_STROKE };
        break;
      case 'rect':
        annotation = { id: newId(), kind: 'rect', bounds: [x, y, 1, 1], color: DEFAULT_COLOR, strokeWidth: DEFAULT_STROKE };
        break;
      case 'circle':
        annotation = { id: newId(), kind: 'circle', bounds: [x, y, 1, 1], color: DEFAULT_COLOR, strokeWidth: DEFAULT_STROKE };
        break;
      case 'text': {
        setTextEditor({ x, y, value: '' });
        startRef.current = null;
        return;
      }
      case 'number': {
        const existing = step.annotations.filter((candidate) => candidate.kind === 'number');
        persist([...step.annotations, { id: newId(), kind: 'number', at: [x, y], n: existing.length + 1, color: DEFAULT_COLOR }]);
        startRef.current = null;
        return;
      }
      case 'blur':
        annotation = { id: newId(), kind: 'blur', bounds: [x, y, 1, 1], intensity: 8 };
        break;
      case 'redact':
        annotation = { id: newId(), kind: 'redact', bounds: [x, y, 1, 1] };
        break;
      default:
        return;
    }
    setDraft(annotation);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: RPointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const [x, y] = svgPoint(svgRef.current, event);

    if (tool === 'select' && dragRef.current) {
      const [startX, startY] = dragRef.current.start;
      const dx = x - startX;
      const dy = y - startY;
      const dragged = dragRef.current;
      updateLocal(step.annotations.map((annotation) => (
        annotation.id === dragged.id ? moveAnnotation(dragged.original, dx, dy) : annotation
      )));
      return;
    }

    if (!draft || !startRef.current) return;
    const [startX, startY] = startRef.current;
    if (draft.kind === 'arrow') {
      setDraft({ ...draft, to: [x, y] });
    } else if (draft.kind === 'rect' || draft.kind === 'circle' || draft.kind === 'blur' || draft.kind === 'redact') {
      setDraft({ ...draft, bounds: [Math.min(x, startX), Math.min(y, startY), Math.abs(x - startX), Math.abs(y - startY)] });
    }
  };

  const handlePointerUp = () => {
    if (dragRef.current) {
      const current = useProjectStore.getState().project?.steps.find((candidate) => candidate.id === step.id)?.annotations ?? step.annotations;
      persist(current);
      dragRef.current = null;
    }

    if (!draft) return;
    const tooSmall = (draft.kind === 'rect' || draft.kind === 'circle' || draft.kind === 'blur' || draft.kind === 'redact') && (draft.bounds[2] < 4 || draft.bounds[3] < 4);
    const arrowTooShort = draft.kind === 'arrow' && Math.hypot(draft.to[0] - draft.from[0], draft.to[1] - draft.from[1]) < 4;
    if (!tooSmall && !arrowTooShort) {
      persist([...step.annotations, draft]);
      setSelectedId(draft.id);
    }
    setDraft(null);
    startRef.current = null;
  };

  const cursor: Record<typeof tool, string> = {
    select: selectedId ? 'move' : 'default',
    arrow: 'crosshair',
    rect: 'crosshair',
    circle: 'crosshair',
    text: 'text',
    number: 'pointer',
    blur: 'crosshair',
    redact: 'crosshair'
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${nativeWidth} ${nativeHeight}`}
      preserveAspectRatio="none"
      width={viewWidth}
      height={viewHeight}
      style={{ position: 'absolute', inset: 0, pointerEvents: disabled ? 'none' : 'auto', width: '100%', height: '100%', cursor: cursor[tool] }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {step.annotations.map((annotation) => (
        <AnnotationShape key={annotation.id} annotation={annotation} selected={annotation.id === selectedId} />
      ))}
      {draft && <AnnotationShape annotation={draft} selected />}
      {textEditor && (
        <foreignObject x={textEditor.x} y={textEditor.y - DEFAULT_FONT} width={320} height={44}>
          <input
            ref={textInputRef}
            value={textEditor.value}
            placeholder="Text"
            onChange={(event) => setTextEditor({ ...textEditor, value: event.currentTarget.value })}
            onBlur={commitTextEditor}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Enter') commitTextEditor();
              if (event.key === 'Escape') setTextEditor(null);
            }}
            style={{
              width: 300,
              height: 32,
              boxSizing: 'border-box',
              border: '2px solid #00c4ff',
              borderRadius: 6,
              background: 'rgba(6, 8, 12, 0.92)',
              color: '#e6f7ff',
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: DEFAULT_FONT,
              fontWeight: 700,
              outline: 'none',
              padding: '2px 8px'
            }}
          />
        </foreignObject>
      )}
    </svg>
  );
}

function AnnotationShape({ annotation, selected }: { annotation: Annotation; selected?: boolean }) {
  const bounds = selected ? annotationBounds(annotation) : null;
  return (
    <g>
      {renderAnnotation(annotation)}
      {bounds && (
        <rect
          x={bounds[0] - 6}
          y={bounds[1] - 6}
          width={bounds[2] + 12}
          height={bounds[3] + 12}
          fill="none"
          stroke="rgba(255,255,255,0.72)"
          strokeWidth={1.5}
          strokeDasharray="6 5"
          rx={6}
          pointerEvents="none"
        />
      )}
    </g>
  );
}

function renderAnnotation(annotation: Annotation) {
  switch (annotation.kind) {
    case 'arrow': {
      const [x1, y1] = annotation.from;
      const [x2, y2] = annotation.to;
      const id = 'arrowhead-' + annotation.id;
      return (
        <g>
          <defs>
            <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth={annotation.strokeWidth * 1.4} markerHeight={annotation.strokeWidth * 1.4} orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={annotation.color} />
            </marker>
          </defs>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={annotation.color} strokeWidth={annotation.strokeWidth} strokeLinecap="round" markerEnd={`url(#${id})`} />
        </g>
      );
    }
    case 'rect': {
      const [x, y, width, height] = annotation.bounds;
      return <rect x={x} y={y} width={width} height={height} fill={annotation.filled ? annotation.color : 'none'} stroke={annotation.color} strokeWidth={annotation.strokeWidth} rx={4} />;
    }
    case 'circle': {
      const [x, y, width, height] = annotation.bounds;
      return <ellipse cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} fill="none" stroke={annotation.color} strokeWidth={annotation.strokeWidth} />;
    }
    case 'text': {
      const [x, y] = annotation.at;
      return <text x={x} y={y} fill={annotation.color} fontFamily="Space Grotesk, sans-serif" fontSize={annotation.fontSize} fontWeight={700}>{annotation.text}</text>;
    }
    case 'number': {
      const [x, y] = annotation.at;
      return (
        <g>
          <circle cx={x} cy={y} r={18} fill={annotation.color} />
          <text x={x} y={y + 5} textAnchor="middle" fill="#fff" fontFamily="Space Grotesk, sans-serif" fontSize={18} fontWeight={800}>{annotation.n}</text>
        </g>
      );
    }
    case 'blur': {
      const [x, y, width, height] = annotation.bounds;
      const id = 'blur-' + annotation.id;
      return (
        <g>
          <defs><filter id={id} x="0" y="0" width="100%" height="100%"><feGaussianBlur in="SourceGraphic" stdDeviation={annotation.intensity} /></filter></defs>
          <rect x={x} y={y} width={width} height={height} fill="rgba(30,41,59,0.55)" filter={`url(#${id})`} />
        </g>
      );
    }
    case 'redact': {
      const [x, y, width, height] = annotation.bounds;
      return <rect x={x} y={y} width={width} height={height} fill="#000" />;
    }
  }
}

function findAnnotationAt(annotations: Annotation[], x: number, y: number): Annotation | undefined {
  return [...annotations].reverse().find((annotation) => hitTest(annotation, x, y));
}

function hitTest(annotation: Annotation, x: number, y: number): boolean {
  if (annotation.kind === 'arrow') return distanceToSegment(x, y, annotation.from, annotation.to) <= Math.max(10, annotation.strokeWidth + 6);
  if (annotation.kind === 'text') return inBounds(x, y, annotationBounds(annotation));
  if (annotation.kind === 'number') return Math.hypot(x - annotation.at[0], y - annotation.at[1]) <= 24;
  return inBounds(x, y, annotation.bounds);
}

function inBounds(x: number, y: number, bounds: [number, number, number, number]): boolean {
  return x >= bounds[0] && x <= bounds[0] + bounds[2] && y >= bounds[1] && y <= bounds[1] + bounds[3];
}

function moveAnnotation(annotation: Annotation, dx: number, dy: number): Annotation {
  switch (annotation.kind) {
    case 'arrow':
      return { ...annotation, from: [annotation.from[0] + dx, annotation.from[1] + dy], to: [annotation.to[0] + dx, annotation.to[1] + dy] };
    case 'text':
      return { ...annotation, at: [annotation.at[0] + dx, annotation.at[1] + dy] };
    case 'number':
      return { ...annotation, at: [annotation.at[0] + dx, annotation.at[1] + dy] };
    default:
      return { ...annotation, bounds: [annotation.bounds[0] + dx, annotation.bounds[1] + dy, annotation.bounds[2], annotation.bounds[3]] };
  }
}

function annotationBounds(annotation: Annotation): [number, number, number, number] {
  switch (annotation.kind) {
    case 'arrow': {
      const left = Math.min(annotation.from[0], annotation.to[0]);
      const top = Math.min(annotation.from[1], annotation.to[1]);
      return [left, top, Math.abs(annotation.to[0] - annotation.from[0]), Math.abs(annotation.to[1] - annotation.from[1])];
    }
    case 'text':
      return [annotation.at[0], annotation.at[1] - annotation.fontSize, Math.max(24, annotation.text.length * annotation.fontSize * 0.55), annotation.fontSize * 1.25];
    case 'number':
      return [annotation.at[0] - 18, annotation.at[1] - 18, 36, 36];
    default:
      return annotation.bounds;
  }
}

function distanceToSegment(px: number, py: number, from: [number, number], to: [number, number]): number {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}