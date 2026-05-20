import type { CSSProperties, MouseEvent, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  size?: number;
  active?: boolean;
  variant?: 'default' | 'titlebar';
  style?: CSSProperties;
  ariaLabel?: string;
}

export function IconButton({
  children,
  onClick,
  title,
  size = 28,
  active = false,
  variant = 'default',
  style,
  ariaLabel
}: Props) {
  const isTitlebar = variant === 'titlebar';
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel ?? title}
      className="app-no-drag"
      style={{
        width: size,
        height: size,
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'var(--ksr-acc-soft)' : 'transparent',
        color: active ? 'var(--ksr-acc)' : 'var(--ksr-text-2)',
        border: active ? '1px solid var(--ksr-acc-border)' : '1px solid transparent',
        borderRadius: isTitlebar ? 6 : 7,
        cursor: 'pointer',
        transition: 'background 0.16s, color 0.16s, border-color 0.16s',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--ksr-surf-2)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--ksr-text-1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--ksr-text-2)';
        }
      }}
    >
      {children}
    </button>
  );
}
