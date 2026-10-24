import { PALETTE } from "@dh/shared";
import { degToRad } from "@dh/utils";
import type Phaser from "phaser";
import { damageEnemy } from "../../logic/combat/enemyHealth.ts";
import { HEAD_IDS, HEAD_STEP, hydraBarMarkers, hydraSteps } from "../../logic/boss/hydra.ts";
import type { HeadId } from "../../logic/boss/hydra.ts";
import { ring, spiralStep, spread } from "../../logic/boss/patterns.ts";
import type { AttackStep, ScheduleState } from "../../logic/boss/schedule.ts";
import type { CombatWorld } from "../../systems/CombatWorld.ts";
import { textureFor } from "../../content/textures.ts";
import { Boss } from "../Boss.ts";
import type { BossDef } from "../Boss.ts";
import { HydraHead } from "./HydraHead.ts";

// Heads hang above the core at these angles.
const HEAD_ANGLE: Record<HeadId, number> = {
  aimer: degToRad(210),
  spreader: degToRad(270),
  sweeper: degToRad(330),
};
const BEAM_HIT_PX = 6;

/**
 * Sector 2 boss: a core with three cable heads (aimed shots, spread, beam sweep).
 * Killing a head removes its pattern and its live shots; the core is invulnerable until all three fall.
 */
export class ConduitHydra extends Boss {
  private readonly heads: HydraHead[];
  private readonly cables: Phaser.GameObjects.Graphics;
  private readonly beam: Phaser.GameObjects.Graphics;
  private shotsFired = 0;
  private sweepFrom = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, def: BossDef, world: CombatWorld) {
    super(scene, x, y, def, world, textureFor("boss", "conduit-hydra"));
    this.cables = scene.add.graphics().setDepth(this.depth - 1);
    this.beam = scene.add.graphics().setDepth(5400);
    this.heads = HEAD_IDS.map((id) => new HydraHead(scene, x, y, id, def.params.headHp ?? 150));
    this.placeHeads(0);
    this.once("destroy", () => {
      this.heads.forEach((h) => h.destroy());
      this.cables.destroy();
      this.beam.destroy();
    });
  }

  private get alive(): Set<HeadId> {
    return new Set(this.heads.filter((h) => !h.health.dead).map((h) => h.headId));
  }

  get coreExposed(): boolean {
    return this.alive.size === 0;
  }

  parts() {
    return [
      { id: -1, sprite: this as Phaser.Physics.Arcade.Sprite },
      ...this.heads.map((h, i) => ({
        id: -2 - i,
        part: h.headId,
        sprite: h as Phaser.Physics.Arcade.Sprite,
      })),
    ];
  }

  barMaxHp(): number {
    return (this.def.params.headHp ?? 150) * 3 + this.health.maxHp;
  }

  barMarkers(): number[] {
    return hydraBarMarkers({ heads: this.def.params.headHp ?? 150, core: this.health.maxHp });
  }

  private totalHp(): number {
    return this.heads.reduce((sum, h) => sum + h.health.hp, 0) + this.health.hp;
  }

  phases(): AttackStep[][] {
    return [hydraSteps(this.alive, this.coreExposed)];
  }

  takeHit(dmg: number, kb: number, angle: number, now: number, part?: string): boolean {
    if (this.invulnerable || this.health.dead) return false;
    const head = this.heads.find((h) => h.headId === part);
    if (head) {
      if (head.health.dead) return false;
      const { dealt, killed } = damageEnemy(head.health, dmg);
      this.scene.events.emit("boss:hit", { target: head, x: head.x, y: head.y, dmg: dealt });
      this.scene.events.emit("boss:hp", { hp: this.totalHp() });
      if (killed) this.killHead(head);
      return false;
    }
    if (!this.coreExposed) {
      // Shots spark off the shielded core.
      this.scene.events.emit("bullet:wall", { x: this.x, y: this.y });
      return false;
    }
    const killed = super.takeHit(dmg, kb, angle, now);
    this.scene.events.emit("boss:hp", { hp: this.totalHp() });
    return killed;
  }

  private killHead(head: HydraHead): void {
    head.disableBody(true, true);
    this.scene.events.emit("hydra:head-destroyed", { headId: head.headId });
    // Its live shots and beam vanish with it.
    this.world.enemyBullets.forEachActive((b) => b.tag === head.headId && b.kill());
    if (head.headId === "sweeper") this.beam.clear();
    if (this.currentStep === HEAD_STEP[head.headId]) this.scheduler.cancel();
    // Same frame as the last head dies, the core attacks become the schedule.
    this.scheduler.setPhase(hydraSteps(this.alive, this.coreExposed));
  }

  private currentStep: string | null = null;

  tick(now: number, dt: number): void {
    this.placeHeads(now);
    super.tick(now, dt);
  }

  private placeHeads(now: number): void {
    const r = this.def.params.headRadius ?? 44;
    const g = this.cables.clear().lineStyle(2, PALETTE["teal-600"]);
    for (const h of this.heads) {
      const a = HEAD_ANGLE[h.headId] + Math.sin(now / 600 + HEAD_ANGLE[h.headId]) * 0.15;
      const hx = this.x + Math.cos(a) * r;
      const hy = this.y + Math.sin(a) * r;
      if (h.health.dead) continue;
      h.body.reset(hx, hy);
      h.setDepth(hy + 1000);
      g.lineBetween(this.x, this.y, hx, hy);
    }
  }

  private head(id: HeadId): HydraHead | undefined {
    return this.heads.find((h) => h.headId === id && !h.health.dead);
  }

  protected runStep(s: ScheduleState, now: number): void {
    this.currentStep = s.step.id;
    const p = this.def.params;
    const player = this.world.player;
    const owner = (HEAD_IDS.find((h) => HEAD_STEP[h] === s.step.id) ?? null) as HeadId | null;
    const src = owner ? this.head(owner) : this;
    if (!src) return;
    const aim = Math.atan2(player.y - src.y, player.x - src.x);

    if (s.stage === "telegraph") {
      if (!s.changed) return;
      this.shotsFired = 0;
      if (s.step.id === "beam-sweep") {
        // Show the whole arc before the sweep.
        const arc = degToRad(p.sweepArcDeg ?? 120);
        this.sweepFrom = aim - arc / 2;
        for (let i = 0; i <= 4; i++)
          this.telegraph.line(
            src,
            this.sweepFrom + (arc * i) / 4,
            p.sweepLength ?? 220,
            s.step.telegraphMs,
          );
      } else this.telegraph.flash(src as Phaser.GameObjects.Sprite, s.step.telegraphMs);
      return;
    }
    if (s.stage === "recover") {
      if (s.changed) this.beam.clear();
      return;
    }
    const t = now - s.enteredAt;
    const shoot = (angle: number, speed: number) =>
      this.world.enemyBullets.spawn(src.x, src.y, angle, speed, {
        damage: 1,
        texture: "ph-bullet-enemy",
        tag: owner ?? "core",
      });
    // Fire every scheduled shot whose time has come.
    const due = (gap: number, count: number) => Math.min(count, Math.floor(t / gap) + 1);
    switch (s.step.id) {
      case "aimed-shots":
        for (; this.shotsFired < due(p.aimedGapMs ?? 120, p.aimedCount ?? 5); this.shotsFired++)
          shoot(aim, p.aimedSpeed ?? 110);
        break;
      case "spread":
        for (; this.shotsFired < due(p.spreadGapMs ?? 250, p.spreadVolleys ?? 3); this.shotsFired++)
          for (const a of spread(aim, p.spreadCount ?? 7, p.spreadArcDeg ?? 70))
            shoot(a, p.spreadSpeed ?? 90);
        break;
      case "beam-sweep": {
        const angle =
          this.sweepFrom + degToRad(p.sweepArcDeg ?? 120) * Math.min(1, t / s.step.runMs);
        const len = p.sweepLength ?? 220;
        const ex = src.x + Math.cos(angle) * len;
        const ey = src.y + Math.sin(angle) * len;
        // The sweep is the arena hazard: no wall blocks it, but i-frames still apply via hurt().
        this.beam.clear().lineStyle(3, PALETTE["bleed-500"]).lineBetween(src.x, src.y, ex, ey);
        if (distToSegment(player, src, { x: ex, y: ey }) <= BEAM_HIT_PX) player.hurt(1, now);
        break;
      }
      case "core-pulse":
        if (s.changed)
          for (const a of ring(p.corePulseCount ?? 20, Math.random()))
            shoot(a, p.corePulseSpeed ?? 80);
        break;
      case "core-spiral":
        for (
          ;
          this.shotsFired <
          due(p.spiralGapMs ?? 100, Math.floor(s.step.runMs / (p.spiralGapMs ?? 100)));
          this.shotsFired++
        )
          for (const a of spiralStep(p.spiralArms ?? 3, this.shotsFired, p.spiralStepDeg ?? 12))
            shoot(a, p.spiralSpeed ?? 80);
        break;
    }
  }
}

function distToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}
