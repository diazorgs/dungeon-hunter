import type Phaser from "phaser";
import type { Player } from "../../entities/Player.ts";
import type { CombatWorld } from "../CombatWorld.ts";

export interface SkillContext {
  scene: Phaser.Scene;
  player: Player;
  world: CombatWorld;
}

/** A Runner skill. Kit's Patch Drone (plan 23) is one more implementation. */
export interface Skill {
  id: string;
  cooldownMs: number;
  activate(ctx: SkillContext, now: number): void;
  update?(ctx: SkillContext, now: number, dt: number): void;
}
