import { PALETTE } from "@dh/shared";
import { createRng, degToRad, rotateToward } from "@dh/utils";
import type Phaser from "phaser";
import { damageEnemy } from "../../logic/combat/enemyHealth.ts";
import { aimedBurst, ring, spiralStep } from "../../logic/boss/patterns.ts";
import type { AttackStep, ScheduleState } from "../../logic/boss/schedule.ts";
import {
  WARDEN,
  clampHpToGate,
  electrifiedTiles,
  lockdownRings,
  spiralCadenceMs,
} from "../../logic/boss/warden.ts";
import type { WardenPhase } from "../../logic/boss/warden.ts";
import { buildWaves, encounterPool } from "../../logic/encounter/budget.ts";
import type { Wave } from "../../logic/encounter/budget.ts";
import type { Bullet } from "../Bullet.ts";
import { IMPLEMENTED_AI } from "../../systems/ai/registry.ts";
import type { CombatWorld } from "../../systems/CombatWorld.ts";
import { Boss } from "../Boss.ts";
import type { BossDef } from "../Boss.ts";
import { ShieldArm } from "./ShieldArm.ts";

const ARENA = { w: 13, h: 9 };
const TILE = 16;
// Arms overlap at the front so no bullet slips between them.
const ARM_SPREAD = 0.18;
const FLOOR_FOREVER_MS = 10 * 60_000;

const SHIELDED: AttackStep[] = [
  { id: "spiral-2", telegraphMs: 450, runMs: 3000, recoverMs: 800, weight: 1 },
  { id: "arm-sweep", telegraphMs: 450, runMs: 2000, recoverMs: 800, weight: 1 },
];
const LOCKDOWN: AttackStep[] = [
  { id: "spiral-2", telegraphMs: 450, runMs: 3000, recoverMs: 900, weight: 1 },
];
const EXPOSED: AttackStep[] = [
  { id: "spiral-4", telegraphMs: 450, runMs: 2500, recoverMs: 600, weight: 1 },
  { id: "core-burst", telegraphMs: 450, runMs: 200, recoverMs: 700, weight: 1 },
];

/**
 * Final boss in the Core Chamber. Shielded (arms block the front) → Lockdown (electrified floor rings,
 * two Bleed waves, invulnerable while a wave lives) → Core Exposed (faster spirals) → 15 % scream → enraged.
 * HP is gated so one big hit cannot skip a phase script.
 */
export class CoreWarden extends Boss {
  wardenPhase: WardenPhase = "shielded";
  private readonly gates = new Set<number>();
  private immune = false;
  private arms: ShieldArm[] = [];
  private armColliders: Phaser.Physics.Arcade.Collider[] = [];
  private facing = 0;
  private sweeping = false;
  private shots = 0;
  private lockdownAt = 0;
  private rings = 0;
  private waves: Wave[] = [];
  private wavesSpawned = 0;
  private screamUntil = 0;
  private nextEnrageAt = 0;
  private started = false;

  constructor(scene: Phaser.Scene, x: number, y: number, def: BossDef, world: CombatWorld) {
    super(scene, x, y, def, world, "ph-boss");
    this.setScale(0.75).setTint(PALETTE["bleed-300"]);
    this.body.setSize(40, 40).setOffset(12, 12);
    this.body.immovable = true;
    this.arms = [new ShieldArm(scene, x, y), new ShieldArm(scene, x, y)];
    // Arms start covering the Runner; afterwards they turn slowly, so circling works.
    this.facing = Math.atan2(world.player.y - y, world.player.x - x);
    // Registered before BossSystem's own overlap, so an arm eats the bullet first.
    for (const arm of this.arms) {
      this.armColliders.push(
        scene.physics.add.overlap(arm, world.playerBullets.group, (a, b) => {
          const bullet = (a === arm ? b : a) as Bullet;
          if (!bullet.active) return;
          scene.events.emit("bullet:wall", { x: bullet.x, y: bullet.y });
          bullet.kill();
        }),
        scene.physics.add.overlap(arm, world.player, () => {
          if (this.sweeping) world.player.hurt(1, scene.time.now);
        }),
      );
    }
    this.once("destroy", () => this.breakArms());
  }

  phases(): AttackStep[][] {
    return [SHIELDED];
  }

  takeHit(dmg: number, _kb: number, _angle: number, _now: number): boolean {
    if (this.invulnerable || this.health.dead) return false;
    if (this.immune) {
      this.scene.events.emit("bullet:wall", { x: this.x, y: this.y });
      return false;
    }
    const want = this.health.hp - Math.max(1, Math.round(dmg * this.damageTakenMul));
    const target = clampHpToGate(want, this.health.maxHp, this.gates);
    const { dealt, killed } = damageEnemy(this.health, this.health.hp - target);
    this.scene.events.emit("boss:hit", { target: this, x: this.x, y: this.y, dmg: dealt });
    this.scene.events.emit("boss:hp", { hp: this.health.hp });
    return killed;
  }

  tick(now: number, dt: number): void {
    this.setDepth(this.y + 1000);
    this.updateArms(dt);
    if (this.invulnerable || this.health.dead) return;
    if (!this.started) {
      this.started = true;
      this.scheduler.setPhase(SHIELDED);
    }
    const hpPct = this.health.hp / this.health.maxHp;
    switch (this.wardenPhase) {
      case "shielded":
        this.runStep(this.scheduler.update(now), now);
        if (this.health.hp <= Math.round(WARDEN.thresholds[0] * this.health.maxHp))
          this.enterLockdown(now);
        break;
      case "lockdown":
        this.updateLockdown(now);
        break;
      case "exposed":
        this.runStep(this.scheduler.update(now), now);
        if (hpPct <= WARDEN.screamAt + 1e-9) this.enterScream(now);
        break;
      case "scream":
        if (now >= this.screamUntil) {
          this.gates.add(WARDEN.screamAt);
          this.immune = false;
          this.clearTint().setTint(PALETTE["bleed-500"]);
          this.wardenPhase = "enraged";
        }
        break;
      case "enraged":
        this.enraged(now);
        break;
    }
  }

  // ---- arms -------------------------------------------------------------

  private updateArms(dt: number): void {
    if (this.arms.length === 0) return;
    const p = this.def.params;
    const player = this.world.player;
    if (this.sweeping) this.facing += degToRad(p.armSweepDegPerSec ?? 270) * dt;
    else
      this.facing = rotateToward(
        this.facing,
        Math.atan2(player.y - this.y, player.x - this.x),
        degToRad(p.armTurnDegPerSec ?? 45) * dt,
      );
    const r = p.armRadius ?? 28;
    this.arms.forEach((arm, i) => {
      const a = this.facing + (i === 0 ? -ARM_SPREAD : ARM_SPREAD);
      arm.body.reset(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r);
      arm.setDepth(arm.y + 1000);
    });
  }

  private breakArms(): void {
    for (const c of this.armColliders) c.destroy();
    this.armColliders = [];
    for (const arm of this.arms) {
      this.scene?.events.emit("guardian:killed", {
        uid: -9,
        id: "shield-bot",
        x: arm.x,
        y: arm.y,
        elite: false,
        bleed: false,
        selfDestruct: true,
      });
      arm.destroy();
    }
    this.arms = [];
  }

  // ---- attacks ----------------------------------------------------------

  protected runStep(s: ScheduleState, now: number): void {
    const p = this.def.params;
    if (s.stage === "telegraph") {
      if (s.changed) this.telegraph.flash(this, s.step.telegraphMs);
      this.sweeping = false;
      return;
    }
    if (s.stage === "recover") {
      this.sweeping = false;
      if (s.changed) this.setTint(PALETTE["bleed-300"]);
      return;
    }
    if (s.changed) this.shots = 0;
    const t = now - s.enteredAt;
    const fire = (a: number, speed = p.spiralSpeed ?? 75) =>
      this.world.enemyBullets.spawn(this.x, this.y, a, speed, {
        damage: 1,
        texture: "ph-bullet-bleed",
      });
    switch (s.step.id) {
      case "spiral-2": {
        const gap = p.spiral2GapMs ?? 120;
        for (; this.shots < Math.floor(t / gap) + 1; this.shots++)
          for (const a of spiralStep(2, this.shots, p.spiral2StepDeg ?? 14)) fire(a);
        break;
      }
      case "arm-sweep":
        this.sweeping = true;
        break;
      case "spiral-4": {
        const gap = spiralCadenceMs(this.health.hp / this.health.maxHp);
        for (; this.shots < Math.floor(t / gap) + 1; this.shots++)
          for (const a of spiralStep(4, this.shots, p.spiral4StepDeg ?? 10)) fire(a);
        break;
      }
      case "core-burst":
        if (s.changed) {
          const player = this.world.player;
          for (const a of ring(p.burstRing ?? 24, Math.random())) fire(a, p.burstSpeed ?? 90);
          const aim = Math.atan2(player.y - this.y, player.x - this.x);
          for (const a of aimedBurst(aim, p.burstAimed ?? 5, 8, Math.random))
            fire(a, (p.burstSpeed ?? 90) * 1.3);
        }
        break;
    }
  }

  // ---- lockdown ---------------------------------------------------------

  private enterLockdown(now: number): void {
    this.wardenPhase = "lockdown";
    this.gates.add(WARDEN.thresholds[0]);
    this.immune = true;
    this.sweeping = false;
    this.lockdownAt = now;
    this.rings = 0;
    this.world.enemyBullets.clear();
    this.scene.events.emit("radio:say", {
      speaker: "vigil",
      text: "LOCKDOWN. ARENA SEALED.",
      durationMs: 2500,
    });
    const rng = createRng(`${this.scene.registry.get("runConfig")?.seed ?? "warden"}|lockdown`);
    this.waves = buildWaves(
      this.def.params.lockdownBudget ?? 14,
      encounterPool(3, IMPLEMENTED_AI),
      rng,
      { bleed: true },
    );
    this.wavesSpawned = 0;
    this.spawnWave(rng);
    this.scheduler.cancel();
    this.scheduler.setPhase(LOCKDOWN);
  }

  private updateLockdown(now: number): void {
    // Electrify one more ring every 4 s (each ring telegraphs 1 s before it goes live).
    const due = lockdownRings(now - this.lockdownAt);
    while (this.rings < due) {
      this.rings++;
      const prev = new Set(electrifiedTiles(ARENA, this.rings - 1).map((t) => `${t.x},${t.y}`));
      for (const tile of electrifiedTiles(ARENA, this.rings))
        if (!prev.has(`${tile.x},${tile.y}`)) {
          const { x, y } = this.tileCenter(tile);
          this.world.hazards.spawn("floor", x, y, {
            w: TILE,
            h: TILE,
            damage: 1,
            durationMs: FLOOR_FOREVER_MS,
            delayMs: 1000,
          });
        }
    }
    const waveAlive = this.world.guardians.aliveCount() > 0;
    this.immune = waveAlive;
    if (waveAlive) return;
    // Wave 2 at 50 %.
    if (this.wavesSpawned === 1 && this.health.hp <= this.health.maxHp * 0.5) {
      this.spawnWave(createRng(`${this.def.id}|wave2`));
      return;
    }
    // Both waves done and the 33 % gate reached: Core Exposed.
    if (
      this.wavesSpawned >= 2 &&
      this.health.hp <= Math.round(WARDEN.thresholds[1] * this.health.maxHp)
    ) {
      this.gates.add(WARDEN.thresholds[1]);
      this.world.hazards.clear("floor");
      this.breakArms();
      this.wardenPhase = "exposed";
      this.damageTakenMul = 1;
      this.scheduler.cancel();
      this.scheduler.setPhase(EXPOSED);
      return;
    }
    this.runStep(this.scheduler.update(now), now);
  }

  /** Guardians spawn only on the safe 9×5 core, which the floor never reaches. */
  private spawnWave(rng: ReturnType<typeof createRng>): void {
    const wave = this.waves[this.wavesSpawned] ?? [];
    this.wavesSpawned++;
    const hot = new Set(electrifiedTiles(ARENA, 2).map((t) => `${t.x},${t.y}`));
    const safe: { x: number; y: number }[] = [];
    for (let x = 0; x < ARENA.w; x++)
      for (let y = 0; y < ARENA.h; y++)
        if (!hot.has(`${x},${y}`) && Math.abs(x - 6) + Math.abs(y - 4) > 2) safe.push({ x, y });
    const spots = rng.shuffle(safe);
    wave.forEach((e, i) => {
      const { x, y } = this.tileCenter(spots[i % spots.length]!);
      this.world.guardians.spawn(e.guardianId, x, y, { elite: e.elite, bleed: true });
    });
  }

  private tileCenter(t: { x: number; y: number }): { x: number; y: number } {
    // The Warden sits on the arena's centre tile (6, 4).
    return { x: this.x + (t.x - 6) * TILE, y: this.y + (t.y - 4) * TILE };
  }

  // ---- scream and enrage ------------------------------------------------

  private enterScream(now: number): void {
    this.wardenPhase = "scream";
    this.immune = true;
    this.screamUntil = now + WARDEN.screamMs;
    this.world.enemyBullets.clear();
    this.scene.cameras.main.shake(WARDEN.screamMs, 0.006);
    this.telegraph.flash(this, WARDEN.screamMs);
    this.scene.events.emit("radio:say", {
      speaker: "vigil",
      text: "C0RE INT3GRITY... FAILING.",
      durationMs: 2500,
    });
  }

  private enraged(now: number): void {
    const p = this.def.params;
    if (now < this.nextEnrageAt) return;
    this.nextEnrageAt = now + 70;
    this.shots++;
    const fire = (a: number, speed: number) =>
      this.world.enemyBullets.spawn(this.x, this.y, a, speed, {
        damage: 1,
        texture: "ph-bullet-bleed",
      });
    for (const a of spiralStep(6, this.shots, 9)) fire(a, p.enrageSpeed ?? 85);
    if (this.shots % (p.enrageEvery ?? 12) === 0)
      for (const a of ring(p.enrageRing ?? 32, Math.random())) fire(a, 70);
  }
}
