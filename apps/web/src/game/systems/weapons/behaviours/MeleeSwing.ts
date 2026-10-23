import { PALETTE } from "@dh/shared";
import { degToRad } from "@dh/utils";
import type Phaser from "phaser";
import { inMeleeArc } from "../../../logic/weapons/melee.ts";
import type { Behaviour, FireContext } from "./Behaviour.ts";
import { param, scaledDamage } from "./Behaviour.ts";

const SWING_MS = 120;

/** Shock Baton / Grid Cutter: one arc check per swing; optional stun; Grid Cutter erases enemy bullets. */
export class MeleeSwing implements Behaviour {
  readonly id = "melee-swing" as const;

  fire(ctx: FireContext): void {
    const { player, angle, targets, now, weapon } = ctx;
    const arc = param(ctx, "arcDeg", 100);
    const range = param(ctx, "range", 22);
    const stunMs = param(ctx, "stunSec", 0) * 1000;
    for (const t of targets.all())
      if (inMeleeArc(player, angle, arc, range + t.radius, t))
        t.hit(scaledDamage(ctx), weapon.knockback, angle, now, stunMs);
    if (weapon.behaviourParams.deletesBullets === true)
      targets.enemyBullets.forEachActive((b) => {
        if (inMeleeArc(player, angle, arc, range, b)) b.kill();
      });
    this.drawSwing(ctx.scene, player, angle, arc, range);
  }

  private drawSwing(
    scene: Phaser.Scene,
    at: { x: number; y: number },
    angle: number,
    arcDeg: number,
    range: number,
  ) {
    const half = degToRad(arcDeg) / 2;
    const g = scene.add.graphics().setDepth(5500);
    g.fillStyle(PALETTE["amber-100"], 0.5)
      .slice(at.x, at.y, range, angle - half, angle + half)
      .fillPath();
    scene.tweens.add({ targets: g, alpha: 0, duration: SWING_MS, onComplete: () => g.destroy() });
  }
}
