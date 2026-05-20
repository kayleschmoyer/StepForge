export interface DpiScale {
  x: number;
  y: number;
}

export function toWindowRelativePoint(
  point: { x: number; y: number },
  bounds?: { x: number; y: number; width: number; height: number },
  dpiScale: DpiScale = { x: 1, y: 1 }
): { x: number; y: number } {
  if (!bounds) return point;
  return {
    x: Math.round((point.x - bounds.x) * dpiScale.x),
    y: Math.round((point.y - bounds.y) * dpiScale.y)
  };
}