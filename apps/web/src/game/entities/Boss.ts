import Phaser from "phaser";
import { playAnim } from "../content/animations.ts";
import { resolveTexture } from "../content/textures.ts";
import { createEnemyHealth, damageEnemy } from "../logic/combat/enemyHealth.ts";
import type { EnemyHealth } from "../logic/combat/enemyHealth.ts";
import { phaseIndex } from "../logic/boss/phases.ts";
import { AttackScheduler } from "../logic/boss/schedule.ts";
import type { AttackStep, ScheduleState } from "../logic/boss/schedule.ts";
import type { CombatWorld } from "../systems/CombatWorld.ts";
import { Telegraph } from "../systems/Telegraph.ts";
import { createRng } from "@dh/utils";

export interface BossDef {
  id: string;
  name: string;
  hp: number;
  /** Phase thresholds as HP fractions, descending (e.g. [0.5]). */
  thresholds: number[];
  params: Record<string, number>;
}

/**
 * Base for every boss: HP, phases by HP, the attack scheduler and hit handling.
 * Subclasses declare `phases()` and act in `runStep()`.
 *
 * Multi-part bosses (Conduit Hydra, plan 18): `takeHit(..., part)` receives the id of the
 * part that was hit; override `takeHit` to route damage per part and call `super.takeHit`
 * only for hits that should reach the core.
 */
export abstract class Boss extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly def: BossDef;
  readonly health: EnemyHealth;
  /** True during the intro and while dying. */
  invulnerable = true;
  damageTakenMul = 1;
  protected readonly world: CombatWorld;
  protected readonly telegraph: Telegraph;
  protected readonly scheduler: AttackScheduler;
  private phase = -1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    def: BossDef,
    world: CombatWorld,
    texture: { key: string; frame?: string },
  ) {
    const tex = resolveTexture(scene.textures, texture, "ph-boss");
    super(scene, x, y, tex.key, tex.frame);
    this.def = def;
    this.world = world;
    this.health = createEnemyHealth(def.hp);
    this.telegraph = new Telegraph(scene);
    this.scheduler = new AttackScheduler(createRng(def.id));
    scene.add.existing(this);
    scene.physics.add.existing(this);
    playAnim(this, `boss.${def.id}.idle`);
    // Bosses ignore knockback.
    this.body.pushable = false;
  }

  /** Hittable pieces; multi-part bosses return their heads too (ids must be negative and unique). */
  parts(): { id: number; part?: string; sprite: Phaser.Physics.Arcade.Sprite }[] {
    return [{ id: -1, sprite: this }];
  }

  /** Boss bar max and phase markers; multi-part bosses report the total across parts. */
  barMaxHp(): number {
    return this.health.maxHp;
  }

  barMarkers(): number[] {
    return this.def.thresholds;
  }

  /** One attack list per phase, matching `def.thresholds` (length + 1). */
  abstract phases(): AttackStep[][];
  protected abstract runStep(s: ScheduleState, now: number, dt: number): void;

  tick(now: number, dt: number): void {
    this.setDepth(this.y + 1000);
    if (this.invulnerable || this.health.dead) return;
    const p = phaseIndex(this.health.hp / this.health.maxHp, this.def.thresholds);
    if (p !== this.phase) {
      this.phase = p;
      this.scheduler.setPhase(this.phases()[p]!);
    }
    const s = this.scheduler.update(now);
    this.runStep(s, now, dt);
    if (!this.health.dead) playAnim(this, `boss.${this.def.id}.${this.animState(s)}`);
  }

  /** Animation for the current schedule stage; Gatekeeper overrides it for its stun. */
  protected animState(s: ScheduleState): string {
    return s.stage === "recover" ? "idle" : "attack";
  }

  get phaseIndex(): number {
    return this.phase;
  }

  /** Returns true when this hit killed the boss. Knockback is ignored by design. */
  takeHit(dmg: number, _knockback: number, _angle: number, _now: number, _part?: string): boolean {
    if (this.invulnerable || this.health.dead) return false;
    const { dealt, killed } = damageEnemy(
      this.health,
      Math.max(1, Math.round(dmg * this.damageTakenMul)),
    );
    this.scene.events.emit("boss:hit", { target: this, x: this.x, y: this.y, dmg: dealt });
    this.scene.events.emit("boss:hp", { hp: this.health.hp });
    if (killed) playAnim(this, `boss.${this.def.id}.death`);
    return killed;
  }

  protected endStageEarly(now: number): void {
    this.scheduler.endStageEarly(now);
  }
}
