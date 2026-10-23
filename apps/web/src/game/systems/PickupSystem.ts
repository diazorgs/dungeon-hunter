import type Phaser from "phaser";
import { Pickup, PICKUP_TEXTURE } from "../entities/Pickup.ts";
import type { PickupKind } from "../entities/Pickup.ts";
import type { Player } from "../entities/Player.ts";
import { gainEnergy, heal } from "../logic/combat/combatant.ts";
import { addScrap } from "../logic/run/runState.ts";
import type { RunState } from "../logic/run/runState.ts";

const POOL = 128;
const MAGNET_PX = 24;
const COLLECT_PX = 8;
const ORB_ENERGY = 12;
const MAGNET_SPEED = 220;

/** Energy orbs, Scrap and health capsules: pooled, magnetised, collected on touch. */
export class PickupSystem {
  private readonly group: Phaser.Physics.Arcade.Group;
  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly run: RunState;

  constructor(scene: Phaser.Scene, player: Player, run: RunState) {
    this.scene = scene;
    this.player = player;
    this.run = run;
    this.group = scene.physics.add.group({
      classType: Pickup,
      maxSize: POOL,
      runChildUpdate: false,
    });
  }

  spawn(kind: PickupKind, x: number, y: number, amount = 1): void {
    const p = this.group.get(x, y) as Pickup | null;
    if (!p) return;
    p.enableBody(true, x, y, true, true);
    p.kind = kind;
    p.amount = amount;
    p.setTexture(PICKUP_TEXTURE[kind]).setDepth(y + 999);
    // Pop out a little so a pile of drops spreads.
    const a = Math.random() * Math.PI * 2;
    p.setVelocity(Math.cos(a) * 40, Math.sin(a) * 40).setDrag(160);
  }

  update(): void {
    const pl = this.player;
    const radius = MAGNET_PX * pl.stats.pickupRadiusMul;
    for (const p of this.group.getChildren() as Pickup[]) {
      // Orbs at full energy and capsules at full HP stay on the floor for later.
      if (!p.active || !this.wanted(p.kind)) continue;
      const d = Math.hypot(pl.x - p.x, pl.y - p.y);
      if (d <= COLLECT_PX) this.collect(p);
      else if (d <= radius)
        p.setVelocity(((pl.x - p.x) / d) * MAGNET_SPEED, ((pl.y - p.y) / d) * MAGNET_SPEED);
    }
  }

  activeCount(): number {
    return this.group.countActive(true);
  }

  private wanted(kind: PickupKind): boolean {
    const c = this.player.combat;
    if (kind === "energy") return c.energy < c.maxEnergy;
    if (kind === "health") return c.hp < c.maxHp;
    return true;
  }

  private collect(p: Pickup): void {
    const c = this.player.combat;
    if (p.kind === "energy") gainEnergy(c, ORB_ENERGY * p.amount);
    else if (p.kind === "health") heal(c, p.amount);
    else addScrap(this.run, p.amount);
    this.scene.events.emit("pickup:collected", { kind: p.kind, amount: p.amount });
    p.disableBody(true, true);
  }
}
