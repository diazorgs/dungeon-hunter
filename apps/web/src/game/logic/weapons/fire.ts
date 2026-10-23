import type { Weapon } from "@dh/shared";
import { degToRad } from "@dh/utils";

export interface FireClock {
  nextShotAt: number;
}

/**
 * Shots owed this frame. Long frames owe several shots (capped) so low FPS does not
 * lower the fire rate; releasing the trigger never banks shots, so tapping is never faster.
 */
export function shotsDue(
  clock: FireClock,
  now: number,
  intervalMs: number,
  holding: boolean,
  maxPerFrame = 3,
): number {
  if (!holding) {
    clock.nextShotAt = Math.max(clock.nextShotAt, now);
    return 0;
  }
  if (now < clock.nextShotAt) return 0;
  const owed = Math.floor((now - clock.nextShotAt) / intervalMs) + 1;
  const n = Math.min(owed, maxPerFrame);
  clock.nextShotAt = Math.max(clock.nextShotAt + n * intervalMs, now);
  return n;
}

export const fireIntervalMs = (weapon: Weapon, fireRateMul: number): number =>
  1000 / (weapon.fireRate * fireRateMul);

/** Pellets fan evenly across the spread with ±10% jitter; a single pellet lands anywhere inside it. */
export function pelletAngles(
  aim: number,
  pellets: number,
  spreadDeg: number,
  rand: () => number,
): number[] {
  const spread = degToRad(spreadDeg);
  if (pellets <= 1) return [aim + (rand() - 0.5) * spread];
  const step = spread / (pellets - 1);
  return Array.from(
    { length: pellets },
    (_, i) => aim - spread / 2 + i * step + (rand() * 2 - 1) * 0.1 * step,
  );
}
