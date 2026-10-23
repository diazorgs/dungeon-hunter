import type { Guardian } from "../../entities/Guardian.ts";
import { orbit, seek } from "../../logic/ai/steer.ts";
import type { AiController, AiWorld } from "./AiController.ts";

const PREFERRED = 110;
const ARC_HEIGHT = 32;

/** Mortar Unit: keeps its distance and lobs shells at where the player stood. Teaches "don't stand still". */
export class MortarAi implements AiController {
  private lastShot = 0;
  private readonly g: Guardian;
  private readonly w: AiWorld;

  constructor(g: Guardian, w: AiWorld) {
    this.g = g;
    this.w = w;
  }

  update(now: number): void {
    const { g, w } = this;
    const a = g.def.attack;
    const d = Math.hypot(w.player.x - g.x, w.player.y - g.y);
    const v =
      d < (a.minRange ?? 48)
        ? seek(w.player, g, g.def.speed)
        : orbit(g, w.player, PREFERRED, g.def.speed, 1);
    g.setVelocity(v.x, v.y);
    if (now - this.lastShot < (a.fireEveryMs ?? 2400)) return;
    this.lastShot = now;
    // Aimed at the player's position at launch: shells do not home.
    const tx = w.player.x;
    const ty = w.player.y + 8;
    const flightMs = a.telegraphMs ?? 900;
    w.hazards.spawn("blast", tx, ty, {
      radius: a.blastRadius ?? 20,
      damage: a.blastDamage ?? 1,
      durationMs: 150,
      delayMs: flightMs,
    });
    const shell = w.scene.add.image(g.x, g.y, "ph-shell").setDepth(5000);
    const sx = g.x;
    const sy = g.y;
    w.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: flightMs,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        shell.setPosition(
          sx + (tx - sx) * t,
          sy + (ty - sy) * t - Math.sin(t * Math.PI) * ARC_HEIGHT,
        );
      },
      onComplete: () => shell.destroy(),
    });
  }
}
