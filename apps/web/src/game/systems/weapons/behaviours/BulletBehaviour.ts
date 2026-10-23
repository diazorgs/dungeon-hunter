import { pelletAngles } from "../../../logic/weapons/fire.ts";
import type { Behaviour, FireContext } from "./Behaviour.ts";

/** Plain projectiles: `pellets` bullets fanned across `spreadDeg`. */
export class BulletBehaviour implements Behaviour {
  readonly id = "bullet" as const;

  fire({ weapon, origin, angle, pool, stats }: FireContext): void {
    const damage = Math.round(weapon.damage * stats.damageMul);
    const bounces = stats.flags.has("bulletsBounce") ? 1 : 0;
    for (const a of pelletAngles(angle, weapon.pellets, weapon.spreadDeg, Math.random))
      pool.spawn(origin.x, origin.y, a, weapon.projectileSpeed, {
        damage,
        knockback: weapon.knockback,
        bounces,
        texture: "ph-bullet-player",
      });
  }
}
