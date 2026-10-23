import { PALETTE } from "@dh/shared";
import type { Runner } from "@dh/shared";
import Phaser from "phaser";
import { textureFor } from "../content/textures.ts";
import type { ActiveBuffs } from "../logic/combat/buffs.ts";
import { isActive } from "../logic/combat/buffs.ts";
import {
  applyDamage,
  createCombatant,
  grantInvuln,
  tickShieldRegen,
} from "../logic/combat/combatant.ts";
import type { CombatantState, DamageResult } from "../logic/combat/combatant.ts";
import { ChargePool } from "../logic/combat/cooldown.ts";
import { applyStatChange, deriveStats } from "../logic/combat/stats.ts";
import type { PlayerStats } from "../logic/combat/stats.ts";
import type { InputState } from "../logic/input.ts";

const MOVE_SPEED = 96;
const ACCEL = MOVE_SPEED / 0.06; // full speed in 60 ms
const DECEL = MOVE_SPEED / 0.08; // stop in 80 ms
const DASH_DISTANCE = 48;
const DASH_MS = 120;
const DASH_INVULN_MS = 200;
const DASH_RECHARGE_MS = 600;

/** The Runner: Arcade sprite wrapping pure combat state. Emits `player:dashed` on the scene. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly runner: Runner;
  readonly combat: CombatantState;
  stats: PlayerStats;
  readonly buffs: ActiveBuffs = { until: {} };
  /** Assisted aim that weapons read. */
  aimAngle = 0;
  isDashing = false;
  /** DEV sandbox toggle: ignore all damage. */
  god = false;
  facing: 1 | -1 = 1;
  private readonly dash: ChargePool;
  private dashEndsAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, runner: Runner) {
    const tex = textureFor("runner", runner.id);
    super(scene, x, y, tex.key, tex.frame);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Feet-only body (sprite 16×24) so walls clip feet, not heads.
    this.body.setSize(10, 8).setOffset(3, 16);
    this.runner = runner;
    this.combat = createCombatant(runner);
    this.stats = deriveStats(runner, []);
    this.dash = new ChargePool(this.stats.dashCharges, DASH_RECHARGE_MS);
  }

  dashCharges(now: number): number {
    return this.dash.charges(now);
  }

  /** All damage to the Runner goes through here. Emits `player:damaged` / `player:died`. */
  hurt(amount: number, now: number): DamageResult | null {
    if (this.god) return null;
    const r = applyDamage(this.combat, amount, now);
    if (r.ignored) return r;
    this.scene.events.emit("player:damaged", { shieldLost: r.shieldLost, hpLost: r.hpLost });
    if (r.died) this.scene.events.emit("player:died");
    return r;
  }

  setStats(next: PlayerStats): void {
    applyStatChange(this.combat, this.stats, next);
    this.dash.setMax(next.dashCharges);
    this.stats = next;
  }

  /** `dt` in seconds. */
  tick(input: InputState, now: number, dt: number): void {
    tickShieldRegen(this.combat, now);
    if (this.isDashing && now >= this.dashEndsAt) {
      this.isDashing = false;
      // Drop to walk speed so the dash covers its 48 px instead of coasting past it.
      this.body.velocity.limit(MOVE_SPEED);
    }

    if (!this.isDashing && input.dash && this.dash.use(now)) this.startDash(input, now);
    else if (!this.isDashing) this.steer(input.move.x * MOVE_SPEED, input.move.y * MOVE_SPEED, dt);

    this.facing = Math.cos(this.aimAngle) >= 0 ? 1 : -1;
    this.setFlipX(this.facing < 0);
    this.setDepth(this.y + 1000);
    this.updateTint(now);
  }

  private steer(tx: number, ty: number, dt: number): void {
    const v = this.body.velocity;
    const dx = tx - v.x;
    const dy = ty - v.y;
    const gap = Math.hypot(dx, dy);
    const step = (tx === 0 && ty === 0 ? DECEL : ACCEL) * dt;
    if (gap <= step) this.setVelocity(tx, ty);
    else this.setVelocity(v.x + (dx / gap) * step, v.y + (dy / gap) * step);
  }

  private startDash(input: InputState, now: number): void {
    const moving = input.move.x !== 0 || input.move.y !== 0;
    const len = moving ? Math.hypot(input.move.x, input.move.y) : 1;
    const dir = moving
      ? { x: input.move.x / len, y: input.move.y / len }
      : { x: Math.cos(this.aimAngle), y: Math.sin(this.aimAngle) };
    const speed = DASH_DISTANCE / (DASH_MS / 1000);
    // Velocity, not teleport: the wall collider stops the dash flush instead of tunnelling.
    this.setVelocity(dir.x * speed, dir.y * speed);
    this.isDashing = true;
    this.dashEndsAt = now + DASH_MS;
    grantInvuln(this.combat, now, DASH_INVULN_MS);
    for (const delay of [0, 40, 80]) this.scene.time.delayedCall(delay, () => this.afterimage());
    this.scene.events.emit("player:dashed", this);
  }

  private afterimage(): void {
    if (!this.active) return;
    const ghost = this.scene.add
      .image(this.x, this.y, this.texture.key, this.frame.name)
      .setFlipX(this.flipX)
      .setAlpha(0.5)
      .setDepth(this.depth - 1);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 200,
      onComplete: () => ghost.destroy(),
    });
  }

  private updateTint(now: number): void {
    if (!isActive(this.buffs, "overcharge", now)) {
      this.clearTint();
      return;
    }
    // Pulse an additive amber-300 glow.
    const f = 0.35 + 0.35 * Math.sin(now / 90);
    const c = PALETTE["amber-300"];
    const ch = (shift: number) => Math.round(((c >> shift) & 0xff) * f);
    this.setTint((ch(16) << 16) | (ch(8) << 8) | ch(0)).setTintMode(Phaser.TintModes.ADD);
  }
}
