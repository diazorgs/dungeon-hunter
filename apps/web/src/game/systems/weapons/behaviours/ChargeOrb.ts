import type Phaser from "phaser";
import { chargedShot, chargeLevel } from "../../../logic/weapons/charge.ts";
import type { Behaviour, FireContext } from "./Behaviour.ts";
import { param, scaledDamage } from "./Behaviour.ts";

const ORB_TEXTURE_PX = 10;

/** Null Cannon: hold to charge, release to fire a piercing orb scaled by charge; < 30 % cancels for free. */
export class ChargeOrb implements Behaviour {
  readonly id = "charge-orb" as const;
  readonly manual = true;
  private heldMs = 0;
  private readyAt = 0;
  private orb: Phaser.GameObjects.Image | null = null;

  fire(): void {}

  update(ctx: FireContext, dt: number): void {
    if (!ctx.holding || ctx.now < this.readyAt) return;
    this.heldMs += dt * 1000;
    const level = chargeLevel(this.heldMs, param(ctx, "chargeSec", 1));
    const orb = (this.orb ??= ctx.scene.add.image(0, 0, "ph-orb-null").setDepth(5400));
    orb
      .setVisible(true)
      .setPosition(ctx.origin.x, ctx.origin.y)
      .setScale(0.2 + level * 0.8)
      .setAlpha(0.5 + level / 2);
  }

  onRelease(ctx: FireContext): void {
    const level = chargeLevel(this.heldMs, param(ctx, "chargeSec", 1));
    this.heldMs = 0;
    this.orb?.setVisible(false);
    const shot = chargedShot(level);
    if (!shot.fire) return;
    if (!ctx.spend(ctx.weapon.energyPerShot)) return ctx.dryFire();
    const scale = (param(ctx, "radius", 10) * 2 * shot.powerMul) / ORB_TEXTURE_PX;
    ctx.pool.spawn(ctx.origin.x, ctx.origin.y, ctx.angle, ctx.weapon.projectileSpeed, {
      damage: scaledDamage(ctx, shot.powerMul),
      knockback: ctx.weapon.knockback,
      pierce: 999,
      texture: "ph-orb-null",
      scale,
      lifetimeMs: 2500,
    });
    ctx.fired();
    this.readyAt = ctx.now + 1000 / ctx.weapon.fireRate;
  }
}
