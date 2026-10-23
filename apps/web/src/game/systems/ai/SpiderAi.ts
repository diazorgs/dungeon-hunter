import type { Guardian } from "../../entities/Guardian.ts";
import { createFsm } from "../../logic/ai/fsm.ts";
import type { Fsm } from "../../logic/ai/fsm.ts";
import type { AiController, AiWorld } from "./AiController.ts";

type State = "dash" | "rest";

/** Arc Spider: darts in short bursts and leaves an electric trail. Teaches "control space". */
export class SpiderAi implements AiController {
  private readonly fsm: Fsm<State, null>;
  private lastTrail = 0;

  constructor(g: Guardian, w: AiWorld) {
    const a = g.def.attack;
    this.fsm = createFsm<State, null>({
      initial: "rest",
      states: {
        dash: {
          enter: () => {
            // Toward the player, skewed up to ±60° so it circles rather than charges.
            const angle =
              Math.atan2(w.player.y - g.y, w.player.x - g.x) +
              (Math.random() - 0.5) * (Math.PI / 1.5);
            const speed = a.dashSpeed ?? 160;
            g.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
          },
          update: (_c, now) => {
            if (now - this.lastTrail >= (a.trailEveryMs ?? 80)) {
              this.lastTrail = now;
              w.hazards.spawn("arc-trail", g.x, g.y, {
                radius: 5,
                damage: a.trailDamage ?? 1,
                durationMs: a.trailMs ?? 2000,
              });
            }
            return now - this.fsm.enteredAt >= (a.dashMs ?? 400) ? "rest" : undefined;
          },
        },
        rest: {
          enter: () => g.setVelocity(0, 0),
          update: (_c, now) => (now - this.fsm.enteredAt >= (a.restMs ?? 600) ? "dash" : undefined),
        },
      },
    });
  }

  update(now: number, dt: number): void {
    this.fsm.update(null, now, dt);
  }
}
