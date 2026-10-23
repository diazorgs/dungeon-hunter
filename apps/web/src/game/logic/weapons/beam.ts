/** Linear ramp from baseDps to maxDps over rampSec of continuous contact. */
export function beamDps(
  heldMs: number,
  p: { baseDps: number; maxDps: number; rampSec: number },
): number {
  const t = Math.min(1, Math.max(0, heldMs / (p.rampSec * 1000)));
  return p.baseDps + (p.maxDps - p.baseDps) * t;
}
