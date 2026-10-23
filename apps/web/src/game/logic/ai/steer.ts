import type { Vec2 } from "../input.ts";

const ZERO = (): Vec2 => ({ x: 0, y: 0 });

export function seek(from: Vec2, to: Vec2, speed: number): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  return d === 0 ? ZERO() : { x: (dx / d) * speed, y: (dy / d) * speed };
}

/** Circles `center`; pure tangent at `radius`, steering in or out when off it. */
export function orbit(from: Vec2, center: Vec2, radius: number, speed: number, dir: 1 | -1): Vec2 {
  const rx = from.x - center.x;
  const ry = from.y - center.y;
  const d = Math.hypot(rx, ry);
  if (d === 0) return { x: speed, y: 0 };
  const ux = rx / d;
  const uy = ry / d;
  const err = Math.max(-1, Math.min(1, (d - radius) / radius));
  const vx = -uy * dir - ux * err;
  const vy = ux * dir - uy * err;
  const len = Math.hypot(vx, vy);
  return { x: (vx / len) * speed, y: (vy / len) * speed };
}

/** Push away from neighbours inside `radius`, stronger the closer they are. */
export function separation(
  self: Vec2,
  others: readonly Vec2[],
  radius: number,
  strength: number,
): Vec2 {
  const out = ZERO();
  for (const o of others) {
    const dx = self.x - o.x;
    const dy = self.y - o.y;
    const d = Math.hypot(dx, dy);
    if (d === 0 || d >= radius) continue;
    const w = (1 - d / radius) * strength;
    out.x += (dx / d) * w;
    out.y += (dy / d) * w;
  }
  return out;
}
