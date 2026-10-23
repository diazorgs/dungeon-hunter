import { PALETTE } from "@dh/shared";
import type { Guardian as GuardianDef } from "@dh/shared";
import Phaser from "phaser";
import { textureFor } from "../content/textures.ts";
import { createEnemyHealth, damageEnemy, isStunned, stun } from "../logic/combat/enemyHealth.ts";
import type { EnemyHealth } from "../logic/combat/enemyHealth.ts";
import type { AiController } from "../systems/ai/AiController.ts";

export interface GuardianSpawnOpts {
  elite?: boolean;
  bleed?: boolean;
  hpMul?: number;
}

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
    // DESIGN.md §7.1: elite ×2 HP and ×1.5 scale, Bleed ×1.4 HP and magenta.
    const hpMul = (opts.hpMul ?? 1) * (opts.elite ? 2 : 1) * (opts.bleed ? 1.4 : 1);
    this.health = createEnemyHealth(def.hp, hpMul);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    if (opts.elite) this.setScale(1.5);
    if (opts.bleed) this.setTint(PALETTE["bleed-500"]);
  }

  /** Busy = stunned or mid-knockback: no steering, no attacks, still hittable. */
  busy(now: number): boolean {
    return isStunned(this.health, now) || now < this.knockedUntil;
  }

  /** Returns true when this hit killed it. */
  takeHit(dmg: number, knockback: number, fromAngle: number, now: number, stunMs = 0): boolean {
    if (this.health.dead) return false;
    const { dealt, killed } = damageEnemy(this.health, dmg);
    if (knockback > 0) {
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
