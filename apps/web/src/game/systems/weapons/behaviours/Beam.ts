import { PALETTE } from "@dh/shared";
import type Phaser from "phaser";
import { beamDps } from "../../../logic/weapons/beam.ts";
import type { HitTarget } from "../targets.ts";
import type { Behaviour, FireContext } from "./Behaviour.ts";
import { param } from "./Behaviour.ts";

const STEP_PX = 4;
const FX_EVERY_MS = 300;

/** Pulse Lance: continuous ray to the first wall or enemy; damage ramps on one target; drains energy per second. */
export class Beam implements Behaviour {
  readonly id = "beam" as const;
  readonly manual = true;
  private g: Phaser.GameObjects.Graphics | null = null;
  private targetId: number | null = null;
  private heldMs = 0;
  private energyOwed = 0;
  private damageOwed = 0;
  private lastFx = -Infinity;
  private dry = false;

  fire(): void {}

  update(ctx: FireContext, dt: number): void {
    if (!ctx.holding) return this.stop();
    if (this.dry) return;
    this.energyOwed += (ctx.weapon.energyPerSecond ?? 0) * dt;
    while (this.energyOwed >= 1) {
      if (!ctx.spend(1)) {
        // Out of energy: the beam stops at once and dry-fires once per trigger pull.
        this.stop();
        this.dry = true;
        ctx.dryFire();
        return;
      }
      this.energyOwed -= 1;
    }
    const { end, target } = this.raycast(ctx);
    if (target?.id !== this.targetId) {
      this.targetId = target?.id ?? null;
      this.heldMs = 0;
      this.damageOwed = 0;
    }
    if (target) {
      this.heldMs += dt * 1000;
      const p = {
        baseDps: param(ctx, "baseDps", 8),
        maxDps: param(ctx, "maxDps", 20),
        rampSec: param(ctx, "rampSec", 1.5),
      };
      this.damageOwed += beamDps(this.heldMs, p) * ctx.stats.damageMul * dt;
      const whole = Math.floor(this.damageOwed);
      if (whole > 0) {
        this.damageOwed -= whole;
        target.hit(whole, 0, ctx.angle, ctx.now);
      }
    }
    const g = (this.g ??= ctx.scene.add.graphics().setDepth(5400));
    g.clear()
      .lineStyle(3, PALETTE["teal-400"], 0.6)
      .lineBetween(ctx.origin.x, ctx.origin.y, end.x, end.y);
    g.lineStyle(1, PALETTE["teal-200"]).lineBetween(ctx.origin.x, ctx.origin.y, end.x, end.y);
    if (ctx.now - this.lastFx >= FX_EVERY_MS) {
      this.lastFx = ctx.now;
      ctx.fired();
    }
  }

  onRelease(): void {
    this.stop();
    this.dry = false;
  }

  private stop(): void {
    this.g?.clear();
    this.targetId = null;
    this.heldMs = 0;
    this.damageOwed = 0;
  }

  private raycast(ctx: FireContext): { end: { x: number; y: number }; target: HitTarget | null } {
    const range = param(ctx, "range", 160);
    const dx = Math.cos(ctx.angle);
    const dy = Math.sin(ctx.angle);
    const targets = ctx.targets.all();
    for (let d = 0; d <= range; d += STEP_PX) {
      const p = { x: ctx.origin.x + dx * d, y: ctx.origin.y + dy * d };
      if (ctx.targets.blocked(p.x, p.y)) return { end: p, target: null };
      const t = targets.find((c) => Math.hypot(c.x - p.x, c.y - p.y) <= c.radius);
      if (t) return { end: p, target: t };
    }
    return { end: { x: ctx.origin.x + dx * range, y: ctx.origin.y + dy * range }, target: null };
  }
}
