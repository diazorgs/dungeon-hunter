import { PALETTE } from "@dh/shared";
import Phaser from "phaser";
import type { Guardian } from "../../entities/Guardian.ts";
import { createFsm } from "../../logic/ai/fsm.ts";
import type { Fsm } from "../../logic/ai/fsm.ts";
import { orbit, separation } from "../../logic/ai/steer.ts";
import type { AiController, AiWorld } from "./AiController.ts";

type State = "drift" | "windup" | "fire";

/** Sentry Drone: orbits at range, telegraphs, fires one slow bolt. Teaches "dodge and shoot back". */
export class HoverShooterAi implements AiController {
  private readonly g: Guardian;
  private readonly w: AiWorld;
  private readonly dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  private readonly fsm: Fsm<State, null>;

  constructor(g: Guardian, w: AiWorld) {
    this.g = g;
    this.w = w;
    const a = g.def.attack;
    this.fsm = createFsm<State, null>({
      initial: "drift",
      states: {
        drift: {
          update: (_c, now) => {
            this.steer();
            return now - this.fsm.enteredAt >= (a.fireEveryMs ?? 1800) ? "windup" : undefined;
          },
        },
        windup: {
          enter: () => {
            g.setVelocity(0, 0);
            g.setTint(PALETTE["bleed-300"]).setTintMode(Phaser.TintModes.FILL);
          },
          update: (_c, now) =>
            now - this.fsm.enteredAt >= (a.windupMs ?? 300) ? "fire" : undefined,
          exit: () => g.clearTint(),
        },
        fire: {
          enter: () => {
            const p = w.player;
            const angle = Math.atan2(p.y - g.y, p.x - g.x);
            w.enemyBullets.spawn(g.x, g.y, angle, a.boltSpeed ?? 90, {
              damage: a.boltDamage ?? 1,
              texture: "ph-bullet-enemy",
            });
          },
          update: () => "drift",
        },
      },
    });
  }

  private steer(): void {
    const { g, w } = this;
    const v = orbit(g, w.player, this.g.def.attack.preferredRange ?? 96, g.def.speed, this.dir);
    const push = separation(g, w.neighbours(g), 20, g.def.speed);
    g.setVelocity(v.x + push.x, v.y + push.y);
  }

  update(now: number, dt: number): void {
    this.fsm.update(null, now, dt);
  }
}
