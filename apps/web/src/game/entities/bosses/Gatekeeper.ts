import type Phaser from "phaser";
import type { AttackStep, ScheduleState } from "../../logic/boss/schedule.ts";
import { ring } from "../../logic/boss/patterns.ts";
import type { CombatWorld } from "../../systems/CombatWorld.ts";
import { Boss } from "../Boss.ts";
import type { BossDef } from "../Boss.ts";

/**
 * Sector 1 security tank. A: aimed charge that stuns itself on walls (damage window).
 * B: stationary bullet rings. ≤ 50 %: charges twice in a row. Armoured outside the stun.
 */
export class Gatekeeper extends Boss {
  private chargeAngle = 0;
  private chargeIndex = 0;
  private chargeStartedAt = 0;
  private gapUntil = 0;
  private ringsFired = 0;
  private stunned = false;

  constructor(scene: Phaser.Scene, x: number, y: number, def: BossDef, world: CombatWorld) {
    super(scene, x, y, def, world, "ph-boss");
    this.setScale(0.75);
    this.body.setSize(48, 48).setOffset(8, 8);
    this.damageTakenMul = def.params.armourMul ?? 0.5;
  }

  phases(): AttackStep[][] {
    const p = this.def.params;
    const charge = (id: string, n: number): AttackStep => ({
      id,
      telegraphMs: p.chargeTelegraphMs ?? 600,
      runMs: n * (p.chargeMaxMs ?? 1600) + (n - 1) * (p.doubleChargeGapMs ?? 400),
      recoverMs: p.stunMs ?? 1500,
      weight: 1,
    });
    const rings: AttackStep = {
      id: "ring",
      telegraphMs: p.ringTelegraphMs ?? 500,
      runMs: (p.ringCount ?? 3) * (p.ringGapMs ?? 250),
      recoverMs: p.ringRecoverMs ?? 700,
      weight: 1,
    };
    return [
      [charge("charge", 1), rings],
      [charge("double-charge", 2), rings],
    ];
  }

  protected runStep(s: ScheduleState, now: number): void {
    const p = this.def.params;
    const player = this.world.player;
    if (s.stage === "telegraph") {
      this.setVelocity(0, 0);
      if (!s.changed) return;
      if (s.step.id === "ring") this.telegraph.flash(this, s.step.telegraphMs);
      else {
        this.chargeAngle = Math.atan2(player.y - this.y, player.x - this.x);
        this.telegraph.line(this, this.chargeAngle, 240, s.step.telegraphMs);
      }
      return;
    }
    if (s.stage === "recover") {
      this.setVelocity(0, 0);
      if (s.changed) {
        // Only a wall hit opens the damage window.
        this.damageTakenMul = this.stunned ? (p.stunnedMul ?? 1.5) : (p.armourMul ?? 0.5);
        if (this.stunned) this.setTint(0x8296b8);
      }
      return;
    }
    if (s.changed) {
      this.stunned = false;
      this.clearTint();
      this.damageTakenMul = p.armourMul ?? 0.5;
      this.chargeIndex = 0;
      this.chargeStartedAt = now;
      this.gapUntil = 0;
      this.ringsFired = 0;
    }
    if (s.step.id === "ring") this.runRings(s, now);
    else this.runCharge(now, s.step.id === "double-charge" ? 2 : 1);
  }

  private runCharge(now: number, total: number): void {
    const p = this.def.params;
    if (now < this.gapUntil) return;
    const b = this.body.blocked;
    const hitWall = b.left || b.right || b.up || b.down;
    const timedOut = now - this.chargeStartedAt >= (p.chargeMaxMs ?? 1600);
    if (hitWall || timedOut) {
      this.chargeIndex++;
      this.setVelocity(0, 0);
      if (this.chargeIndex >= total) {
        this.stunned = hitWall;
        if (hitWall) this.scene.cameras.main.shake(150, 0.006);
        this.endStageEarly(now);
        return;
      }
      // Second charge re-aims, telegraphed during the gap.
      const gap = p.doubleChargeGapMs ?? 400;
      const player = this.world.player;
      this.chargeAngle = Math.atan2(player.y - this.y, player.x - this.x);
      this.telegraph.line(this, this.chargeAngle, 240, gap);
      this.gapUntil = now + gap;
      this.chargeStartedAt = now + gap;
      return;
    }
    const speed = p.chargeSpeed ?? 260;
    this.setVelocity(Math.cos(this.chargeAngle) * speed, Math.sin(this.chargeAngle) * speed);
  }

  private runRings(s: ScheduleState, now: number): void {
    const p = this.def.params;
    const due = Math.floor((now - s.enteredAt) / (p.ringGapMs ?? 250)) + 1;
    while (this.ringsFired < Math.min(due, p.ringCount ?? 3)) {
      const offset = (this.ringsFired * Math.PI) / (p.ringBullets ?? 16);
      for (const a of ring(p.ringBullets ?? 16, offset))
        this.world.enemyBullets.spawn(this.x, this.y, a, p.ringSpeed ?? 80, {
          damage: 1,
          texture: "ph-bullet-enemy",
        });
      this.ringsFired++;
    }
  }
}
