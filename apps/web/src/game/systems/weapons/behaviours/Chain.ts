import { PALETTE } from "@dh/shared";
import { chainTargets } from "../../../logic/weapons/chain.ts";
import { lineClear } from "../../../logic/los.ts";
import { pelletAngles } from "../../../logic/weapons/fire.ts";
import type { Behaviour, FireContext } from "./Behaviour.ts";
import { param, scaledDamage } from "./Behaviour.ts";

const BOLT_MS = 80;

/** Static Repeater: on hit, lightning jumps to the nearest unvisited enemies (never through walls). */
export class Chain implements Behaviour {
  readonly id = "chain" as const;

  fire(ctx: FireContext): void {
    const { weapon, origin, angle, pool, targets, scene } = ctx;
    const jumps = param(ctx, "jumps", 2);
    const range = param(ctx, "range", 48);
    const chainDmg = scaledDamage(ctx, param(ctx, "dmgMul", 0.5));
    for (const a of pelletAngles(angle, weapon.pellets, weapon.spreadDeg, Math.random))
      pool.spawn(origin.x, origin.y, a, weapon.projectileSpeed, {
        damage: scaledDamage(ctx),
        knockback: weapon.knockback,
        texture: "ph-bullet-player",
        onHit: (_b, first) => {
          const all = targets.all();
          const ids = chainTargets(
            first,
            all.map((t) => ({ id: t.id, x: t.x, y: t.y, visible: true })),
            jumps,
            range,
            (p, q) => lineClear((x, y) => targets.blocked(x, y), p, q),
          );
          const g = scene.add.graphics().setDepth(5500).lineStyle(1, PALETTE["teal-200"]);
          let from: { x: number; y: number } = first;
          for (const id of ids) {
            const t = all.find((c) => c.id === id)!;
            g.lineBetween(from.x, from.y, t.x, t.y);
            t.hit(chainDmg, 0, Math.atan2(t.y - from.y, t.x - from.x), scene.time.now);
            from = t;
          }
          scene.time.delayedCall(BOLT_MS, () => g.destroy());
        },
      });
  }
}
