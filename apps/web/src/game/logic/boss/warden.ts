export const WARDEN = {
  hp: 1200,
  thresholds: [0.66, 0.33],
  screamAt: 0.15,
  screamMs: 3000,
  lockdownRingEveryMs: 4000,
  maxRings: 2,
  /** HP gates a big hit cannot skip, in order. */
  gates: [0.66, 0.33, 0.15],
} as const;

export type WardenPhase = "shielded" | "lockdown" | "exposed" | "scream" | "enraged";

/** HP cannot drop below the first gate whose phase script has not run yet. */
export function clampHpToGate(
  hp: number,
  maxHp: number,
  completedGates: ReadonlySet<number>,
): number {
  const gate = WARDEN.gates.find((g) => !completedGates.has(g));
  return gate === undefined ? hp : Math.max(hp, Math.round(gate * maxHp));
}

/** Electrified rings so far: one more every 4 s, at most 2. */
export const lockdownRings = (elapsedMs: number): number =>
  Math.min(WARDEN.maxRings, Math.max(0, Math.floor(elapsedMs / WARDEN.lockdownRingEveryMs)));

/** Floor tiles in the outer `rings` rings of the arena floor (13×9 → a 9×5 safe core at 2 rings). */
export function electrifiedTiles(
  arena: { w: number; h: number },
  rings: number,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < arena.h; y++)
    for (let x = 0; x < arena.w; x++)
      if (Math.min(x, y, arena.w - 1 - x, arena.h - 1 - y) < rings) out.push({ x, y });
  return out;
}

/** Spiral fire interval: 140 ms at 33 % HP down to 70 ms at 0 %. */
export function spiralCadenceMs(hpPct: number): number {
  const t = Math.min(1, Math.max(0, hpPct / 0.33));
  return Math.round(70 + (140 - 70) * t);
}
