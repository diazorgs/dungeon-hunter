import type { Weapon } from "@dh/shared";
import type Phaser from "phaser";
import type { Player } from "../../../entities/Player.ts";
import type { PlayerStats } from "../../../logic/combat/stats.ts";
import type { Vec2 } from "../../../logic/input.ts";
import type { BulletPool } from "../../BulletPool.ts";
import type { CombatTargets } from "../targets.ts";

export interface FireContext {
  scene: Phaser.Scene;
  weapon: Weapon;
  player: Player;
  origin: Vec2;
  angle: number;
  pool: BulletPool;
  stats: PlayerStats;
  now: number;
  holding: boolean;
  targets: CombatTargets;
  /** Spend energy (Overcharge makes it free); false when short, nothing spent. */
  spend(cost: number): boolean;
  /** Emit `weapon:fired` (shake, muzzle flash, SFX) for manual behaviours. */
  fired(): void;
  dryFire(): void;
}

/** How a weapon turns a trigger pull into damage. One class per `weapon.behaviour`; one instance per WeaponSystem. */
export interface Behaviour {
  id: Weapon["behaviour"];
  /** Manual behaviours (beam, charge) manage timing and energy themselves in update/onRelease. */
  manual?: boolean;
  fire(ctx: FireContext): void;
  update?(ctx: FireContext, dt: number): void;
  onRelease?(ctx: FireContext): void;
}

export const scaledDamage = (ctx: FireContext, mul = 1): number =>
  Math.max(1, Math.round(ctx.weapon.damage * ctx.stats.damageMul * mul));

export const param = (ctx: FireContext, key: string, fallback: number): number => {
  const v = ctx.weapon.behaviourParams[key];
  return typeof v === "number" ? v : fallback;
};
