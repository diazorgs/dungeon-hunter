import type { Guardian } from "../../entities/Guardian.ts";
import { ring } from "../../logic/boss/patterns.ts";
import { lineClear } from "../../logic/los.ts";
import type { AiController, AiWorld } from "./AiController.ts";

const ROAM_PX = 90;
const RING_DELAY_MS = 250;
const TRIES = 30;

/** Bleed Wraith: fades, reappears elsewhere in its room, fires a ring. Teaches "read patterns". */
export class WraithAi implements AiController {
  private nextTeleport: number;
  private busy = false;
  private readonly g: Guardian;
  private readonly w: AiWorld;

  constructor(g: Guardian, w: AiWorld) {
    this.g = g;
    this.w = w;
    this.nextTeleport = w.scene.time.now + (g.def.attack.teleportEveryMs ?? 2800);
  }

  update(now: number): void {
    const { g, w } = this;
    g.setVelocity(0, 0);
    if (this.busy || now < this.nextTeleport) return;
    const a = g.def.attack;
    this.busy = true;
    const fade = a.fadeMs ?? 300;
    const clock = w.scene.time;
    // Gameplay timing runs on the scene clock (paused by hit-stop and Esc); tweens are only the look.
    w.scene.tweens.add({ targets: g, alpha: 0, duration: fade });
    clock.delayedCall(fade, () => {
      if (!g.active) return;
      const to = this.destination();
      g.body.reset(to.x, to.y);
      w.scene.tweens.add({ targets: g, alpha: 1, duration: fade });
    });
    clock.delayedCall(fade * 2 + RING_DELAY_MS, () => {
      this.busy = false;
      this.nextTeleport = clock.now + (a.teleportEveryMs ?? 2800);
      if (!g.active || g.health.dead) return;
      g.setAlpha(1);
      for (const angle of ring(a.ringCount ?? 12, Math.random()))
        g.fire(w.enemyBullets, angle, a.ringSpeed ?? 85);
    });
  }

  /** On floor, in sight of its home (so in the same room), at least minPlayerDist from the player. */
  private destination(): { x: number; y: number } {
    const { g, w } = this;
    const min = g.def.attack.minPlayerDist ?? 48;
    for (let i = 0; i < TRIES; i++) {
      const p = {
        x: g.home.x + (Math.random() * 2 - 1) * ROAM_PX,
        y: g.home.y + (Math.random() * 2 - 1) * ROAM_PX,
      };
      if (w.blocked(p.x, p.y) || Math.hypot(p.x - w.player.x, p.y - w.player.y) < min) continue;
      if (lineClear((x, y) => w.blocked(x, y), g.home, p)) return p;
    }
    return { x: g.x, y: g.y };
  }
}
