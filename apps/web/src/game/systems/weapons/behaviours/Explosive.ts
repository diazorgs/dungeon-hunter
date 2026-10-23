import { explosionDamage } from "../../../logic/weapons/explosion.ts";
import type { Behaviour, FireContext } from "./Behaviour.ts";
import { param, scaledDamage } from "./Behaviour.ts";

/** Fuse Launcher: a 0-damage shell that bursts on hit, wall or timeout. Self-safe: the blast never hurts the Runner. */
export class Explosive implements Behaviour {
  readonly id = "explosive" as const;

  fire(ctx: FireContext): void {
    const { weapon, origin, angle, pool, targets, scene } = ctx;
    const radius = param(ctx, "radius", 32);
    const base = scaledDamage(ctx);
    pool.spawn(origin.x, origin.y, angle, weapon.projectileSpeed, {
      damage: 0,
      texture: "ph-shell-player",
      lifetimeMs: 1500,
      onDeath: (b) => {
        const now = scene.time.now;
        // Each target (each boss part too) takes its own falloff damage once.
        for (const t of targets.all()) {
          const dmg = explosionDamage(
            base,
            Math.max(0, Math.hypot(t.x - b.x, t.y - b.y) - t.radius),
            radius,
          );
          if (dmg > 0) t.hit(dmg, weapon.knockback, Math.atan2(t.y - b.y, t.x - b.x), now);
        }
        scene.events.emit("weapon:blast", { x: b.x, y: b.y, radius });
      },
    });
  }
}
