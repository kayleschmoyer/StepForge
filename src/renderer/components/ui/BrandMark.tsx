interface Props {
  size?: number;
  accent?: string;
}

export function BrandMark({ size = 24, accent = '#00c4ff' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" fill="none">
      <defs>
        <linearGradient id="bm-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="36" fill="#0d1628" />
      <circle
        cx="80"
        cy="80"
        r="58"
        stroke="url(#bm-grad)"
        strokeOpacity="0.5"
        strokeWidth="2"
        fill="none"
        strokeDasharray="340 24"
        strokeDashoffset="-6"
        strokeLinecap="round"
      />
      <circle cx="80" cy="80" r="34" fill="#0f1e3a" />
      <circle cx="80" cy="80" r="34" stroke="url(#bm-grad)" strokeWidth="2" fill="none" />
      <text
        x="80"
        y="98"
        fontFamily="Space Grotesk, sans-serif"
        fontSize="38"
        fontWeight="800"
        textAnchor="middle"
        letterSpacing="-2"
      >
        <tspan fill="#ffffff">K</tspan>
        <tspan fill={accent}>S</tspan>
      </text>
      <circle cx="128" cy="32" r="7" fill="#ff3b30" />
    </svg>
  );
}
