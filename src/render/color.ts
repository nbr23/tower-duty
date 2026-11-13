export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function mix(color: number, toward: number, t: number): number {
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const a = (color >> shift) & 0xff;
    const b = (toward >> shift) & 0xff;
    out |= Math.round(a + (b - a) * t) << shift;
  }
  return out;
}

export function rgba(color: number, alpha: number): string {
  return `rgba(${(color >> 16) & 0xff}, ${(color >> 8) & 0xff}, ${color & 0xff}, ${alpha})`;
}
