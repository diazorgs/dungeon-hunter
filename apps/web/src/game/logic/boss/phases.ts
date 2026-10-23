/** Phase index for an HP fraction; thresholds descend, e.g. [0.5] → 0 above 50 %, 1 at or below. */
export const phaseIndex = (hpPct: number, thresholds: readonly number[]): number =>
  thresholds.filter((t) => hpPct <= t).length;
