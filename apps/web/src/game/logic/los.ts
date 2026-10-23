import type { Vec2 } from "./input.ts";

/** True when no blocked point lies between `from` and `to`. Sampling every 8 px suits 16 px wall tiles. */
export function lineClear(
  blocked: (x: number, y: number) => boolean,
  from: Vec2,
  to: Vec2,
  stepPx = 8,
): boolean {
  const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / stepPx);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocked(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)) return false;
  }
  return true;
}
