import { PALETTE } from "@dh/shared";
import Phaser from "phaser";
import type { Guardian } from "../../entities/Guardian.ts";
import { spread } from "../../logic/boss/patterns.ts";
import { createFsm } from "../../logic/ai/fsm.ts";
import type { Fsm } from "../../logic/ai/fsm.ts";
import type { AiController, AiWorld } from "./AiController.ts";

type State = "idle" | "windup" | "fire";

/** Turret Node: stationary, needs line of sight, telegraphs, fires a 3-way spread. Teaches "use cover". */
export class TurretAi implements AiController {
  private readonly fsm: Fsm<State, null>;
  private lastVolley = -Infinity;

  constructor(g: Guardian, w: AiWorld) {
    const a = g.def.attack;
    g.setVelocity(0, 0);
    this.fsm = createFsm<State, null>({
      initial: "idle",
      states: {
        idle: {
          update: (_c, now) =>
            now - this.lastVolley >= (a.volleyEveryMs ?? 1600) && w.canSee(g, w.player)
              ? "windup"
              : undefined,
        },
        windup: {
          enter: () => g.setTint(PALETTE["amber-300"]).setTintMode(Phaser.TintModes.ADD),
          update: (_c, now) =>
            now - this.fsm.enteredAt >= (a.windupMs ?? 400) ? "fire" : undefined,
          exit: () => g.clearTint(),
        },
        fire: {
          enter: (_c, now) => {
            this.lastVolley = now;
            // Re-check: the Runner may have ducked behind cover during the windup.
            if (!w.canSee(g, w.player)) return;
            const aim = Math.atan2(w.player.y - g.y, w.player.x - g.x);
            for (const angle of spread(aim, a.spreadCount ?? 3, a.spreadArcDeg ?? 30))
              w.enemyBullets.spawn(g.x, g.y, angle, a.boltSpeed ?? 100, {
                damage: 1,
                texture: "ph-bullet-enemy",
              });
          },
          update: () => "idle",
        },
      },
    });
  }

  update(now: number, dt: number): void {
    this.fsm.update(null, now, dt);
  }
}
