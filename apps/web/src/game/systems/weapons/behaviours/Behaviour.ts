import type { Weapon } from "@dh/shared";
import type Phaser from "phaser";
import type { PlayerStats } from "../../../logic/combat/stats.ts";
import type { Vec2 } from "../../../logic/input.ts";
import type { BulletPool } from "../../BulletPool.ts";

export interface FireContext {
  scene: Phaser.Scene;
  weapon: Weapon;
  origin: Vec2;
  angle: number;
  pool: BulletPool;
  stats: PlayerStats;
  now: number;
  holding: boolean;
}

/** How a weapon turns a trigger pull into projectiles. One class per `weapon.behaviour`. */
export interface Behaviour {
  id: Weapon["behaviour"];
  fire(ctx: FireContext): void;
  update?(ctx: FireContext, dt: number): void;
  onRelease?(ctx: FireContext): void;
}
