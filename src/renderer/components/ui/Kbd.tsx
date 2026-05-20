import type { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  style?: CSSProperties;
}

export function Kbd({ children, style }: Props) {
  return (
    <kbd
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 22,
        height: 18,
        padding: '0 5px',
        borderRadius: 4,
        background: 'var(--ksr-surf-2)',
        border: '1px solid var(--ksr-border-1)',
        boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.4)',
        color: 'var(--ksr-text-2)',
        fontFamily: 'var(--ksr-font-mono)',
        fontSize: 'var(--ksr-text-xs)',
        fontWeight: 600,
        letterSpacing: 0,
        ...style
      }}
    >
      {children}
    </kbd>
  );
}
