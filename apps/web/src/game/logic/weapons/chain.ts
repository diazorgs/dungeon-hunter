import type { AimTarget } from "../combat/aim.ts";
import type { Vec2 } from "../input.ts";

/**
 * Chain lightning hops: each jump goes to the nearest unvisited visible target within `range`
 * of the previous one. `canSee` blocks hops through walls.
 */
export function chainTargets(
  start: { id: number; x: number; y: number },
  candidates: readonly AimTarget[],
  jumps: number,
  range: number,
  canSee: (a: Vec2, b: Vec2) => boolean = () => true,
): number[] {
  const out: number[] = [];
  const visited = new Set([start.id]);
  let from: Vec2 = start;
  for (let i = 0; i < jumps; i++) {
    let best: AimTarget | undefined;
    let bestD = range;
    for (const c of candidates) {
      if (!c.visible || visited.has(c.id)) continue;
      const d = Math.hypot(c.x - from.x, c.y - from.y);
      if (d <= bestD && canSee(from, c)) {
        best = c;
        bestD = d;
      }
    }
    if (!best) break;
    out.push(best.id);
    visited.add(best.id);
    from = best;
  }
  return out;
}
