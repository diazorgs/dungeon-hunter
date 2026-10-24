import { BOSSES } from "@dh/shared";
import type { BossId } from "@dh/shared";
import type Phaser from "phaser";
import type { Boss } from "../entities/Boss.ts";
import { Bullet } from "../entities/Bullet.ts";
import { DummyBoss } from "../entities/bosses/DummyBoss.ts";
import { ConduitHydra } from "../entities/bosses/ConduitHydra.ts";
import { Gatekeeper } from "../entities/bosses/Gatekeeper.ts";
import type { CombatWorld } from "./CombatWorld.ts";
import type { HitTarget } from "./weapons/targets.ts";

const INTRO_MS = 1500;
const HIT_STOP_MS = 30;
const SLOWMO_MS = 600;

type BossFactory = (scene: Phaser.Scene, x: number, y: number, world: CombatWorld) => Boss;

/** Implemented bosses; Hydra and Warden land in plans 18 and 20. */
export const BOSSES_IMPL: Partial<Record<BossId | "dummy", BossFactory>> = {
  gatekeeper: (scene, x, y, world) => {
    const d = BOSSES.gatekeeper;
    const thresholds = d.phases.slice(0, -1).map((p) => p.untilHpPct);
    return new Gatekeeper(
      scene,
      x,
      y,
      { id: d.id, name: d.name, hp: d.hp, thresholds, params: d.params },
      world,
    );
  },
  "conduit-hydra": (scene, x, y, world) => {
    const d = BOSSES["conduit-hydra"];
    return new ConduitHydra(
      scene,
      x,
      y,
      { id: d.id, name: d.name, hp: d.params.coreHp ?? 300, thresholds: [], params: d.params },
      world,
    );
  },
  dummy: (scene, x, y, world) => new DummyBoss(scene, x, y, world),
};

/** Intro, ticking, collisions and the death sequence for the active boss. */
export class BossSystem {
  boss: Boss | null = null;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private readonly scene: Phaser.Scene;
  private readonly world: CombatWorld;

  constructor(scene: Phaser.Scene, world: CombatWorld) {
    this.scene = scene;
    this.world = world;
  }

  start(id: BossId | "dummy", x: number, y: number): Boss {
    const factory = BOSSES_IMPL[id];
    if (!factory) throw new Error(`Boss "${id}" is not implemented yet`);
    const { scene, world } = this;
    const boss = factory(scene, x, y, world);
    this.boss = boss;
    const physics = scene.physics.add;
    // One overlap per part; dead parts are disabled, not destroyed, until the boss dies.
    for (const part of boss.parts())
      this.colliders.push(
        physics.overlap(part.sprite, world.playerBullets.group, (a, b) => {
          const bullet = (a instanceof Bullet ? a : b) as Bullet;
          if (!bullet.active || bullet.hitIds.has(part.id)) return;
          bullet.hitIds.add(part.id);
          if (bullet.damage > 0)
            this.hit(bullet.damage, bullet.rotation, scene.time.now, part.part);
          bullet.onHit?.(bullet, this.asTarget(part));
          if (bullet.pierceLeft > 0) bullet.pierceLeft--;
          else bullet.kill();
        }),
      );
    this.colliders.push(physics.collider(boss, world.walls));
    physics.overlap(world.player, boss, () => {
      if (!boss.invulnerable) world.player.hurt(boss.def.params.contactDamage ?? 1, scene.time.now);
    });
    // Intro: name card, no damage either way.
    scene.events.emit("boss:intro", { name: boss.def.name });
    scene.time.delayedCall(INTRO_MS, () => {
      if (!boss.active) return;
      boss.invulnerable = false;
      scene.events.emit("boss:spawned", {
        name: boss.def.name,
        maxHp: boss.barMaxHp(),
        phaseMarkers: boss.barMarkers(),
      });
    });
    return boss;
  }

  update(now: number, dt: number): void {
    this.boss?.tick(now, dt);
  }

  /** All damage to the boss goes through here so death is handled once. */
  hit(dmg: number, angle: number, now: number, part?: string): void {
    const boss = this.boss;
    if (boss && boss.takeHit(dmg, 0, angle, now, part)) this.die(boss);
  }

  targets(): HitTarget[] {
    if (!this.boss || this.boss.invulnerable) return [];
    return this.boss
      .parts()
      .filter((p) => p.sprite.active && p.sprite.body?.enable)
      .map((p) => this.asTarget(p));
  }

  private asTarget(p: {
    id: number;
    part?: string;
    sprite: Phaser.Physics.Arcade.Sprite;
  }): HitTarget {
    return {
      id: p.id,
      x: p.sprite.x,
      y: p.sprite.y,
      radius: p.sprite.displayWidth / 2,
      hit: (dmg, _kb, angle, now) => this.hit(dmg, angle, now, p.part),
    };
  }

  private die(boss: Boss): void {
    boss.invulnerable = true;
    // No unfair hits after the kill.
    this.world.enemyBullets.clear();
    this.world.juice.hitStop(HIT_STOP_MS);
    this.scene.events.emit("boss:dead", { id: boss.def.id, x: boss.x, y: boss.y });
    const slow = 0.3;
    this.scene.time.timeScale = slow;
    this.scene.physics.world.timeScale = 1 / slow;
    this.scene.time.delayedCall(SLOWMO_MS * slow, () => {
      this.scene.time.timeScale = 1;
      this.scene.physics.world.timeScale = 1;
    });
    for (const c of this.colliders) c.destroy();
    this.colliders = [];
    boss.disableBody(true, true);
    this.boss = null;
    this.scene.time.delayedCall(0, () => boss.destroy());
  }
}
