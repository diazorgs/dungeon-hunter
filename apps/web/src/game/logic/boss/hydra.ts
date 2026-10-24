import type { AttackStep } from "./schedule.ts";

export type HeadId = "aimer" | "spreader" | "sweeper";
export const HEAD_IDS: readonly HeadId[] = ["aimer", "spreader", "sweeper"];

/** Which head owns which attack step. */
export const HEAD_STEP: Record<HeadId, string> = {
  aimer: "aimed-shots",
  spreader: "spread",
  sweeper: "beam-sweep",
};

const BASE: Record<HeadId, AttackStep> = {
  aimer: { id: "aimed-shots", telegraphMs: 450, runMs: 600, recoverMs: 900, weight: 1 },
  spreader: { id: "spread", telegraphMs: 500, runMs: 750, recoverMs: 900, weight: 1 },
  sweeper: { id: "beam-sweep", telegraphMs: 700, runMs: 1500, recoverMs: 900, weight: 1 },
};
const CORE: AttackStep[] = [
  { id: "core-pulse", telegraphMs: 500, runMs: 100, recoverMs: 900, weight: 1 },
  { id: "core-spiral", telegraphMs: 500, runMs: 2000, recoverMs: 900, weight: 1 },
];
const LAST_HEAD_CADENCE = 0.8;

/** One step per living head (faster when one remains); core attacks once all heads are down. */
export function hydraSteps(alive: ReadonlySet<HeadId>, coreExposed: boolean): AttackStep[] {
  if (coreExposed || alive.size === 0) return CORE.map((s) => ({ ...s }));
  const mul = alive.size === 1 ? LAST_HEAD_CADENCE : 1;
  return HEAD_IDS.filter((h) => alive.has(h)).map((h) => ({
    ...BASE[h],
    recoverMs: BASE[h].recoverMs * mul,
  }));
}

/** Boss-bar markers where each head's share of the total ends, e.g. [0.8, 0.6, 0.4] for 150×3 + 300. */
export function hydraBarMarkers(maxHp: { heads: number; core: number }): number[] {
  const total = maxHp.heads * HEAD_IDS.length + maxHp.core;
  return HEAD_IDS.map((_, i) => (total - maxHp.heads * (i + 1)) / total);
}
