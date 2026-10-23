import type { Guardian as GuardianDef } from "@dh/shared";
import Phaser from "phaser";
import { textureFor } from "../content/textures.ts";
import { createEnemyHealth, damageEnemy, isStunned, stun } from "../logic/combat/enemyHealth.ts";
import type { EnemyHealth } from "../logic/combat/enemyHealth.ts";
import { spawnModifiers } from "../logic/spawn/modifiers.ts";
import type { GuardianSpawnOpts } from "../logic/spawn/modifiers.ts";
import type { AiController } from "../systems/ai/AiController.ts";
import type { BulletPool } from "../systems/BulletPool.ts";
import { applyBleedVisual } from "../systems/visuals/bleed.ts";

export type { GuardianSpawnOpts };

const KNOCKBACK_MS = 100;

/** A guardian machine. Behaviour lives in its AiController; this class owns health and hits. */
export class Guardian extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly def: GuardianDef;
  readonly uid: number;
  readonly health: EnemyHealth;
  readonly opts: GuardianSpawnOpts;
  ai!: AiController;
  knockedUntil = 0;
  readonly bulletSpeedMul: number;
  /** Where it spawned; AIs that relocate (Wraith) stay near it. */
  readonly home: { x: number; y: number };

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: GuardianDef,
    uid: number,
    opts: GuardianSpawnOpts = {},
  ) {
    const tex = textureFor("guardian", def.id);
    super(scene, x, y, tex.key, tex.frame);
    this.def = def;
    this.uid = uid;
    this.opts = opts;
    const mods = spawnModifiers(opts);
    this.health = createEnemyHealth(def.hp, mods.hpMul);
    this.bulletSpeedMul = mods.bulletSpeedMul;
    this.home = { x, y };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(mods.scale);
    this.resetLook();
    if (def.speed === 0) this.setImmovable(true);
  }

  /** Back to the base look after a telegraph tint (keeps the Bleed treatment). */
  resetLook(): void {
    if (this.opts.bleed) applyBleedVisual(this);
    else this.clearTint();
  }

  /** Enemy shot honouring the Bleed bullet speed and colour. */
  fire(pool: BulletPool, angle: number, speed: number, damage = 1, x = this.x, y = this.y): void {
    pool.spawn(x, y, angle, speed * this.bulletSpeedMul, {
      damage,
      texture: this.opts.bleed ? "ph-bullet-bleed" : "ph-bullet-enemy",
    });
  }

  /** Busy = stunned or mid-knockback: no steering, no attacks, still hittable. */
  busy(now: number): boolean {
    return isStunned(this.health, now) || now < this.knockedUntil;
  }

  /** Returns true when this hit killed it. */
  takeHit(dmg: number, knockback: number, fromAngle: number, now: number, stunMs = 0): boolean {
    if (this.health.dead) return false;
    const { dealt, killed } = damageEnemy(this.health, dmg);
    // Stationary guardians (Turret Node) ignore knockback.
    if (knockback > 0 && this.def.speed > 0) {
      // Velocity impulse, so the wall collider stops it instead of pushing it through.
      this.setVelocity(Math.cos(fromAngle) * knockback, Math.sin(fromAngle) * knockback);
      this.knockedUntil = now + KNOCKBACK_MS;
    }
    if (stunMs > 0) stun(this.health, now, stunMs);
    this.scene.events.emit("guardian:hit", {
      uid: this.uid,
      x: this.x,
      y: this.y,
      dmg: dealt,
      target: this,
    });
    if (killed) this.die(false);
    return killed;
  }

  /** Removal is deferred to GuardianSystem.update so no body vanishes mid-collision. */
  die(selfDestruct: boolean): void {
    this.health.dead = true;
    this.disableBody(false, true);
    this.setActive(false);
    this.scene.events.emit("guardian:killed", {
      uid: this.uid,
      id: this.def.id,
      x: this.x,
      y: this.y,
      elite: !!this.opts.elite,
      bleed: !!this.opts.bleed,
      selfDestruct,
    });
  }
}
