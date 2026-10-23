import type Phaser from "phaser";
import type { Guardian } from "../../entities/Guardian.ts";
import type { Player } from "../../entities/Player.ts";
import type { Vec2 } from "../../logic/input.ts";
import type { BulletPool } from "../BulletPool.ts";

export interface AiWorld {
  scene: Phaser.Scene;
  player: Player;
  enemyBullets: BulletPool;
  /** Positions of other live guardians, for separation. */
  neighbours(self: Guardian): Vec2[];
}

/** Per-guardian brain; one class per `guardian.ai`. */
export interface AiController {
  update(now: number, dt: number): void;
}

export type AiFactory = (g: Guardian, world: AiWorld) => AiController;
