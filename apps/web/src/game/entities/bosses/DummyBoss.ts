import type Phaser from "phaser";
import type { AttackStep, ScheduleState } from "../../logic/boss/schedule.ts";
import { ring } from "../../logic/boss/patterns.ts";
import type { CombatWorld } from "../../systems/CombatWorld.ts";
import { Boss } from "../Boss.ts";

/** Sandbox-only boss with one ring attack, to prove the framework (`?scene=sandbox&spawn=boss:dummy`). */
export class DummyBoss extends Boss {
  constructor(scene: Phaser.Scene, x: number, y: number, world: CombatWorld) {
    super(
      scene,
      x,
      y,
      { id: "dummy", name: "Test Dummy", hp: 120, thresholds: [], params: {} },
      world,
      "ph-boss",
    );
    this.setScale(0.5);
  }

  phases(): AttackStep[][] {
    return [[{ id: "ring", telegraphMs: 500, runMs: 100, recoverMs: 1200, weight: 1 }]];
  }

  protected runStep(s: ScheduleState): void {
    if (s.stage === "telegraph" && s.changed) this.telegraph.flash(this, s.step.telegraphMs);
    if (s.stage === "run" && s.changed)
      for (const a of ring(12))
        this.world.enemyBullets.spawn(this.x, this.y, a, 70, {
          damage: 1,
          texture: "ph-bullet-enemy",
        });
  }
}
