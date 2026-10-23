import type { Weapon } from "@dh/shared";
import { pelletAngles } from "../../../logic/weapons/fire.ts";
import type { Behaviour, FireContext } from "./Behaviour.ts";
import { param, scaledDamage } from "./Behaviour.ts";

/** Plain projectiles, also serving `pierce` (Line Rifle) and `bounce` (Scatter Coil) through params. */
export class BulletBehaviour implements Behaviour {
  readonly id: Weapon["behaviour"];

  constructor(id: "bullet" | "pierce" | "bounce" = "bullet") {
    this.id = id;
  }

  fire(ctx: FireContext): void {
    const { weapon, origin, angle, pool, stats } = ctx;
    const bounces =
      (this.id === "bounce" ? param(ctx, "bounces", 1) : 0) +
      (stats.flags.has("bulletsBounce") ? 1 : 0);
    const pierce = this.id === "pierce" ? param(ctx, "count", 1) : 0;
    for (const a of pelletAngles(angle, weapon.pellets, weapon.spreadDeg, Math.random))
      pool.spawn(origin.x, origin.y, a, weapon.projectileSpeed, {
        damage: scaledDamage(ctx),
        knockback: weapon.knockback,
        bounces,
        pierce,
        texture: "ph-bullet-player",
      });
  }
}
