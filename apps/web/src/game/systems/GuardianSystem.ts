import { GUARDIANS } from "@dh/shared";
import type { GuardianId } from "@dh/shared";
import type Phaser from "phaser";
import type { Bullet } from "../entities/Bullet.ts";
import { Guardian } from "../entities/Guardian.ts";
import type { GuardianSpawnOpts } from "../entities/Guardian.ts";
import type { Player } from "../entities/Player.ts";
import type { AimTarget } from "../logic/combat/aim.ts";
import type { Vec2 } from "../logic/input.ts";
import { lineClear } from "../logic/los.ts";
import type { AiWorld } from "./ai/AiController.ts";
import { getAi } from "./ai/registry.ts";
import type { BulletPool } from "./BulletPool.ts";
import type { HazardSystem } from "./HazardSystem.ts";
import { BLEED } from "../logic/spawn/modifiers.ts";

const TILE = 16;
const NUDGE_TILES = 3;

/** Spawns, ticks and resolves hits for all guardians in the scene. */
export class GuardianSystem {
  readonly group: Phaser.Physics.Arcade.Group;
  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly blocked: (x: number, y: number) => boolean;
  private readonly world: AiWorld;
  private nextUid = 1;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    pools: { player: BulletPool; enemy: BulletPool },
    walls: Phaser.Types.Physics.Arcade.ArcadeColliderType,
    blocked: (x: number, y: number) => boolean,
    hazards: HazardSystem,
  ) {
    this.scene = scene;
    this.player = player;
    this.blocked = blocked;
    this.group = scene.physics.add.group();
    this.world = {
      scene,
      player,
      enemyBullets: pools.enemy,
      neighbours: (self) => this.alive().filter((g) => g !== self),
      canSee: (from, to) => lineClear(blocked, from, to),
      hazards,
      blocked,
    };
    scene.events.on("guardian:killed", (d: { x: number; y: number; bleed: boolean }) => {
      if (d.bleed)
        hazards.spawn("puddle", d.x, d.y, {
          radius: 12,
          damage: BLEED.puddleDamage,
          durationMs: BLEED.puddleMs,
        });
    });
    const physics = scene.physics.add;
    physics.collider(this.group, walls);
    physics.overlap(pools.player.group, this.group, (b, g) =>
      this.onPlayerBullet(b as Bullet, g as Guardian),
    );
    // Contact and bullets go through Player.hurt, which honours dash and post-hit i-frames.
    physics.overlap(player, this.group, (_p, g) => {
      const dmg = (g as Guardian).def.contactDamage;
      if (dmg > 0) player.hurt(dmg, scene.time.now);
    });
    physics.overlap(player, pools.enemy.group, (_p, b) => {
      const r = player.hurt((b as Bullet).damage, scene.time.now);
      if (r && !r.ignored) (b as Bullet).kill();
    });
  }

  spawn(id: GuardianId, x: number, y: number, opts: GuardianSpawnOpts = {}): Guardian {
    const at = this.freeSpot(x, y);
    const g = new Guardian(this.scene, at.x, at.y, GUARDIANS[id], this.nextUid++, opts);
    this.group.add(g);
    g.ai = getAi(g.def.ai)(g, this.world);
    return g;
  }

  update(now: number, dt: number): void {
    for (const g of this.group.getChildren() as Guardian[]) {
      if (g.health.dead) {
        g.destroy();
        continue;
      }
      g.setDepth(g.y + 1000);
      // A dead Runner is not a target: everyone idles.
      if (this.player.combat.dead || g.busy(now)) {
        if (this.player.combat.dead) g.setVelocity(0, 0);
        continue;
      }
      g.ai.update(now, dt);
    }
  }

  aliveCount(): number {
    return this.alive().length;
  }

  alive(): Guardian[] {
    return (this.group.getChildren() as Guardian[]).filter((g) => !g.health.dead);
  }

  targets(): AimTarget[] {
    return this.alive().map((g) => ({ id: g.uid, x: g.x, y: g.y, visible: true }));
  }

  clear(): void {
    for (const g of this.group.getChildren() as Guardian[]) g.destroy();
  }

  private onPlayerBullet(b: Bullet, g: Guardian): void {
    if (!b.active || g.health.dead || b.hitIds.has(g.uid)) return;
    if (g.ai.blocks?.(b)) {
      // Bouncing shots glance off the shield; everything else sparks and dies.
      if (b.bouncesLeft > 0) {
        b.bouncesLeft--;
        b.setVelocity(-b.body.velocity.x, -b.body.velocity.y);
        b.hitIds.add(g.uid);
      } else {
        this.scene.events.emit("bullet:wall", { x: b.x, y: b.y, owner: b.owner });
        b.kill();
      }
      return;
    }
    b.hitIds.add(g.uid);
    g.takeHit(b.damage, b.knockback, b.rotation, this.scene.time.now, b.stunMs);
    if (b.pierceLeft > 0) b.pierceLeft--;
    else b.kill();
  }

  /** Badly authored spawn points inside walls are moved to the nearest free tile (BFS). */
  private freeSpot(x: number, y: number): Vec2 {
    if (!this.blocked(x, y)) return { x, y };
    const seen = new Set<string>(["0,0"]);
    const queue: [number, number][] = [[0, 0]];
    while (queue.length) {
      const [dx, dy] = queue.shift()!;
      for (const [sx, sy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = dx + sx;
        const ny = dy + sy;
        const key = `${nx},${ny}`;
        if (seen.has(key) || Math.abs(nx) > NUDGE_TILES || Math.abs(ny) > NUDGE_TILES) continue;
        seen.add(key);
        if (!this.blocked(x + nx * TILE, y + ny * TILE))
          return { x: x + nx * TILE, y: y + ny * TILE };
        queue.push([nx, ny]);
      }
    }
    return { x, y };
  }
}
