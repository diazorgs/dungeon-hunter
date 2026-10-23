export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const degToRad = (d: number): number => (d * Math.PI) / 180;
export const radToDeg = (r: number): number => (r * 180) / Math.PI;
export const angleBetween = (ax: number, ay: number, bx: number, by: number): number =>
  Math.atan2(by - ay, bx - ax);
export const distSq = (ax: number, ay: number, bx: number, by: number): number =>
  (bx - ax) ** 2 + (by - ay) ** 2;

/** Signed shortest turn from `a` to `b`, in (-π, π]. */
export function angleDiff(a: number, b: number): number {
  const d = (((b - a) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return d > Math.PI ? d - 2 * Math.PI : d;
}

export function rotateToward(from: number, to: number, maxStep: number): number {
  const d = angleDiff(from, to);
  return Math.abs(d) <= maxStep ? from + d : from + Math.sign(d) * maxStep;
}
