import type Phaser from "phaser";
import type { Guardian } from "../../entities/Guardian.ts";
import type { Player } from "../../entities/Player.ts";
import type { Vec2 } from "../../logic/input.ts";
import type { Bullet } from "../../entities/Bullet.ts";
import type { BulletPool } from "../BulletPool.ts";
import type { HazardSystem } from "../HazardSystem.ts";

export interface AiWorld {
  scene: Phaser.Scene;
  player: Player;
  enemyBullets: BulletPool;
  hazards: HazardSystem;
  blocked(x: number, y: number): boolean;
  /** Line of sight against walls. */
  canSee(from: Vec2, to: Vec2): boolean;
  /** Positions of other live guardians, for separation. */
  neighbours(self: Guardian): Vec2[];
}

/** Per-guardian brain; one class per `guardian.ai`. */
export interface AiController {
  update(now: number, dt: number): void;
  /** Shield Bot: return true when this player bullet is stopped by the guardian's shield. */
  blocks?(b: Bullet): boolean;
}

export type AiFactory = (g: Guardian, world: AiWorld) => AiController;
