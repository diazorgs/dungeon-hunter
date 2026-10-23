import { pelletAngles } from "../../../logic/weapons/fire.ts";
import type { Behaviour, FireContext } from "./Behaviour.ts";
import { param, scaledDamage } from "./Behaviour.ts";

const MUZZLE_PX = 10;

/** Arc Carbine: one trigger (one energy cost) fires `count` rounds `intervalMs` apart, each re-aimed. */
export class Burst implements Behaviour {
  readonly id = "burst" as const;

  fire(ctx: FireContext): void {
    const count = param(ctx, "count", 3);
    const interval = param(ctx, "intervalMs", 60);
    const { weapon, player, pool, stats } = ctx;
    for (let i = 0; i < count; i++)
      ctx.scene.time.delayedCall(i * interval, () => {
        if (!player.active || player.combat.dead) return;
        const aim = player.aimAngle;
        const x = player.x + Math.cos(aim) * MUZZLE_PX;
        const y = player.y + Math.sin(aim) * MUZZLE_PX;
        for (const a of pelletAngles(aim, weapon.pellets, weapon.spreadDeg, Math.random))
          pool.spawn(x, y, a, weapon.projectileSpeed, {
            damage: scaledDamage(ctx),
            knockback: weapon.knockback,
            bounces: stats.flags.has("bulletsBounce") ? 1 : 0,
            texture: "ph-bullet-player",
          });
        if (i > 0) ctx.scene.events.emit("weapon:fired", { weaponId: weapon.id, x, y, angle: aim });
      });
  }
}
