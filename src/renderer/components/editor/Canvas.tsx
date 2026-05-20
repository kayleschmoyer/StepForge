import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { ZoomIn, ZoomOut, Maximize, AlertTriangle, Hand } from 'lucide-react';
import { useProjectStore } from '@renderer/state/projectStore';
import { IconButton } from '../ui/IconButton';
import { ToolRail } from './ToolRail';
import { AnnotationLayer } from './annotations/AnnotationLayer';

const CANVAS_BASE_WIDTH = 880;
const CANVAS_BASE_HEIGHT = 550; // 16:10 of 880

interface CanvasViewState {
  zoom: number;
  scrollLeft: number;
  scrollTop: number;
}

export function Canvas() {
  const step = useProjectStore((s) =>
    s.project?.steps.find((st) => st.id === s.selectedStepId)
  );
  const stepId = step?.id ?? null;
  const [zoom, setZoom] = useState(100);
  const [panMode, setPanMode] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const viewStateByStepRef = useRef<Record<string, CanvasViewState>>({});

  useEffect(() => {
    setImageSize(null);
  }, [step?.id, step?.screenshotPath]);

  useEffect(() => {
    if (!stepId) return;
    const saved = viewStateByStepRef.current[stepId];
    setZoom(saved?.zoom ?? 100);
    setPanMode(false);
    panRef.current = null;
    requestAnimationFrame(() => {
      viewportRef.current?.scrollTo({
        left: saved?.scrollLeft ?? 0,
        top: saved?.scrollTop ?? 0
      });
    });
  }, [stepId]);

  if (!step) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          minWidth: 0,
          background: 'var(--ksr-bg)'
        }}
      >
        <ToolRail />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ksr-text-3)',
            fontSize: 13
          }}
        >
          No step selected. Start a recording or open a session.
        </div>
      </div>
    );
  }

  const nativeWidth = imageSize?.width ?? 1280;
  const nativeHeight = imageSize?.height ?? 800;
  const width = (CANVAS_BASE_WIDTH * zoom) / 100;
  const height = width * (nativeHeight / nativeWidth);
  const hasWarning = (step.warnings?.length ?? 0) > 0;

  const saveViewState = (patch: Partial<CanvasViewState>) => {
    if (!stepId) return;
    const viewport = viewportRef.current;
    const current = viewStateByStepRef.current[stepId] ?? {
      zoom,
      scrollLeft: viewport?.scrollLeft ?? 0,
      scrollTop: viewport?.scrollTop ?? 0
    };
    viewStateByStepRef.current[stepId] = { ...current, ...patch };
  };

  const updateZoom = (updater: (current: number) => number) => {
    setZoom((current) => {
      const next = updater(current);
      const viewport = viewportRef.current;
      saveViewState({
        zoom: next,
        scrollLeft: viewport?.scrollLeft ?? 0,
        scrollTop: viewport?.scrollTop ?? 0
      });
      return next;
    });
  };

  const handlePanStart = (event: RPointerEvent<HTMLDivElement>) => {
    if (!panMode || !viewportRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: viewportRef.current.scrollLeft,
      top: viewportRef.current.scrollTop
    };
  };

  const handlePanMove = (event: RPointerEvent<HTMLDivElement>) => {
    if (!panRef.current || !viewportRef.current) return;
    event.preventDefault();
    viewportRef.current.scrollLeft = panRef.current.left - (event.clientX - panRef.current.x);
    viewportRef.current.scrollTop = panRef.current.top - (event.clientY - panRef.current.y);
  };

  const handlePanEnd = (event: RPointerEvent<HTMLDivElement>) => {
    if (!panRef.current) return;
    panRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, background: 'var(--ksr-bg)' }}>
      <ToolRail />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          position: 'relative'
        }}
      >
        {/* Canvas toolbar */}
        <div
          style={{
            height: 40,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 18px',
            borderBottom: '1px solid var(--ksr-border-0)',
            background: 'var(--ksr-surf-0)'
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: 'var(--ksr-text-1)',
              fontWeight: 600,
              fontFamily: 'var(--ksr-font-sans)',
              letterSpacing: 'var(--ksr-track-snug)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            Step {step.stepNumber} · {step.description}
          </div>
          {hasWarning && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'var(--ksr-imp-bg)',
                border: '1px solid var(--ksr-imp-border)',
                color: 'var(--ksr-imp-text)',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              <AlertTriangle size={11} /> Capture Warning
            </span>
          )}
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <IconButton title="Zoom out" onClick={() => updateZoom((z) => Math.max(50, z - 10))}>
              <ZoomOut size={14} />
            </IconButton>
            <span
              style={{
                fontFamily: 'var(--ksr-font-mono)',
                fontSize: 11,
                color: 'var(--ksr-text-2)',
                minWidth: 40,
                textAlign: 'center'
              }}
            >
              {zoom}%
            </span>
            <IconButton title="Zoom in" onClick={() => updateZoom((z) => Math.min(200, z + 10))}>
              <ZoomIn size={14} />
            </IconButton>
            <IconButton title="Pan screenshot" onClick={() => setPanMode((value) => !value)}>
              <Hand size={14} color={panMode ? 'var(--ksr-acc)' : undefined} />
            </IconButton>
            <div
              style={{
                width: 1,
                height: 18,
                background: 'var(--ksr-border-1)',
                margin: '0 6px'
              }}
            />
            <IconButton title="Fit to viewport" onClick={() => {
              updateZoom(() => 100);
              viewportRef.current?.scrollTo({ left: 0, top: 0 });
              saveViewState({ zoom: 100, scrollLeft: 0, scrollTop: 0 });
            }}>
              <Maximize size={14} />
            </IconButton>
          </div>
        </div>

        {/* Canvas viewport */}
        <div
          ref={viewportRef}
          onScroll={(event) => {
            saveViewState({
              scrollLeft: event.currentTarget.scrollLeft,
              scrollTop: event.currentTarget.scrollTop
            });
          }}
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 24,
            backgroundImage: 'radial-gradient(var(--ksr-surf-1) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
            backgroundPosition: '7px 7px'
          }}
        >
          <div
            style={{
              minWidth: '100%',
              minHeight: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: Math.max(width, 1),
              height: Math.max(height, 1)
            }}
          >
            <div
              onPointerDown={handlePanStart}
              onPointerMove={handlePanMove}
              onPointerUp={handlePanEnd}
              onPointerCancel={handlePanEnd}
              style={{
                width,
                height,
                flexShrink: 0,
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px var(--ksr-border-1)',
                background: '#0f172a',
                position: 'relative',
                cursor: panMode ? (panRef.current ? 'grabbing' : 'grab') : 'default'
              }}
            >
              <CanvasImage step={step} onSize={setImageSize} />
              <AnnotationLayer
                step={step}
                viewWidth={width}
                viewHeight={height}
                nativeWidth={nativeWidth}
                nativeHeight={nativeHeight}
                disabled={panMode}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CanvasImage({
  step,
  onSize
}: {
  step: import('@shared/models/Step').RecordedStep;
  onSize: (size: { width: number; height: number } | null) => void;
}) {
  // Phase 6 wires real images. For now show a placeholder pattern.
  if (step.screenshotPath) {
    return (
      <img
        src={'file://' + step.screenshotPath}
        alt={step.description}
        onLoad={(event) => {
          onSize({
            width: event.currentTarget.naturalWidth || 1280,
            height: event.currentTarget.naturalHeight || 800
          });
        }}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill'
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 12,
        color: 'rgba(226,232,240,0.4)',
        fontFamily: 'var(--ksr-font-mono)',
        fontSize: 11,
        background:
          'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%), radial-gradient(ellipse at top left, rgba(99,102,241,0.18), transparent 60%)'
      }}
    >
      <span style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>SCREENSHOT</span>
      <span>{step.window?.title ?? 'No window info'}</span>
    </div>
  );
}
