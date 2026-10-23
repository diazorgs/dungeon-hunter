export const MIN_CHARGE = 0.3;

export const chargeLevel = (heldMs: number, chargeSec: number): number =>
  Math.min(1, Math.max(0, heldMs / (chargeSec * 1000)));

/** Below 30 % the shot is cancelled (no energy spent); otherwise power scales with charge. */
export const chargedShot = (level: number): { fire: boolean; powerMul: number } => ({
  fire: level >= MIN_CHARGE,
  powerMul: level,
});
