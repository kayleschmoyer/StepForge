import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';

const ACCENT = '#00c4ff';

interface ToastItem {
  id: number;
  description: string;
}

let nextId = 1;

export function CapturedToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const off = window.stepForge.capture.onToast((payload) => {
      const id = nextId++;
      setToasts((cur) => [...cur, { id, description: payload.description }]);
      setTimeout(() => {
        setToasts((cur) => cur.filter((t) => t.id !== id));
      }, 1700);
    });
    return () => off();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 50,
        right: 24,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none'
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(10,13,20,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--ksr-acc-border)',
            boxShadow: `0 10px 30px rgba(0,0,0,0.4), 0 0 0 1px ${ACCENT}30`,
            animation: 'toast-in 0.3s ease'
          }}
        >
          <Camera size={14} color={ACCENT} />
          <span
            style={{
              fontSize: 12,
              color: 'var(--ksr-text-1)',
              fontWeight: 600,
              fontFamily: 'var(--ksr-font-sans)'
            }}
          >
            Step captured
          </span>
        </div>
      ))}
    </div>
  );
}
