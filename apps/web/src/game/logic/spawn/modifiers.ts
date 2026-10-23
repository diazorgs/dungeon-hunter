import type { SectorId } from "@dh/shared";

export interface GuardianSpawnOpts {
  elite?: boolean;
  bleed?: boolean;
  hpMul?: number;
}

export const BLEED = { hpMul: 1.4, bulletSpeedMul: 1.25, puddleDamage: 1, puddleMs: 2000 } as const;
export const ELITE = { hpMul: 2, scale: 1.5 } as const;
/** Per-room elite chance, passed to buildWaves (which allows at most one elite per room). */
export const ELITE_CHANCE: Record<SectorId, number> = { 1: 0.2, 2: 0.3, 3: 0.4 };

/** Elite and Bleed stack (a Bleed elite is ×2.8 HP). */
export function spawnModifiers(opts: GuardianSpawnOpts) {
  return {
    hpMul: (opts.hpMul ?? 1) * (opts.elite ? ELITE.hpMul : 1) * (opts.bleed ? BLEED.hpMul : 1),
    scale: opts.elite ? ELITE.scale : 1,
    bulletSpeedMul: opts.bleed ? BLEED.bulletSpeedMul : 1,
    guaranteedOrb: !!opts.elite,
    deathPuddle: !!opts.bleed,
  };
}
