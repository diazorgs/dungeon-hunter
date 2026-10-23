import { PALETTE } from "@dh/shared";
import Phaser from "phaser";
import type { Guardian } from "../../entities/Guardian.ts";
import { createFsm } from "../../logic/ai/fsm.ts";
import type { Fsm } from "../../logic/ai/fsm.ts";
import { separation, seek } from "../../logic/ai/steer.ts";
import type { AiController, AiWorld } from "./AiController.ts";

type State = "chase" | "fuse" | "explode";

/** Crawler: rushes, fuses, explodes. Killed before the blast = no damage. Teaches "keep moving". */
export class RusherAi implements AiController {
  private readonly fsm: Fsm<State, null>;

  constructor(g: Guardian, w: AiWorld) {
    const a = g.def.attack;
    const dist = () => Math.hypot(w.player.x - g.x, w.player.y - g.y);
    this.fsm = createFsm<State, null>({
      initial: "chase",
      states: {
        chase: {
          update: () => {
            const v = seek(g, w.player, g.def.speed);
            const push = separation(g, w.neighbours(g), 14, g.def.speed);
            g.setVelocity(v.x + push.x, v.y + push.y);
            return dist() <= (a.triggerRange ?? 18) ? "fuse" : undefined;
          },
        },
        fuse: {
          enter: () => g.setVelocity(0, 0),
          update: (_c, now) => {
            const t = now - this.fsm.enteredAt;
            // Blink white while the fuse burns.
            if (Math.floor(t / 60) % 2) g.setTint(PALETTE.white).setTintMode(Phaser.TintModes.FILL);
            else g.resetLook();
            return t >= (a.fuseMs ?? 350) ? "explode" : undefined;
          },
          exit: () => g.resetLook(),
        },
        explode: {
          enter: (_c, now) => {
            if (dist() <= (a.blastRadius ?? 20)) w.player.hurt(a.blastDamage ?? 1, now);
            g.die(true);
          },
          update: () => undefined,
        },
      },
    });
  }

  update(now: number, dt: number): void {
    this.fsm.update(null, now, dt);
  }
}
