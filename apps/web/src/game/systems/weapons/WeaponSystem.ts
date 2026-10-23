import { WEAPONS } from "@dh/shared";
import type { WeaponId } from "@dh/shared";
import type Phaser from "phaser";
import type { Player } from "../../entities/Player.ts";
import { WeaponPickup } from "../../entities/WeaponPickup.ts";
import { effectiveEnergyCost, effectiveFireRateMul } from "../../logic/combat/buffs.ts";
import { spendEnergy } from "../../logic/combat/combatant.ts";
import type { InputState } from "../../logic/input.ts";
import { fireIntervalMs, shotsDue } from "../../logic/weapons/fire.ts";
import type { FireClock } from "../../logic/weapons/fire.ts";
import { activeWeapon, createLoadout, pickUp, swap } from "../../logic/weapons/loadout.ts";
import type { BulletPool } from "../BulletPool.ts";
import type { FireContext } from "./behaviours/Behaviour.ts";
import { getBehaviour } from "./behaviours/registry.ts";

const SWAP_DELAY_MS = 150;
const MUZZLE_PX = 10;
const PICKUP_RANGE = 16;

/** Owns the two-slot loadout, fires the active weapon, handles floor pickups. */
export class WeaponSystem {
  readonly loadout = createLoadout();
  readonly pickups: WeaponPickup[] = [];
  // One clock per slot: cooldowns belong to the weapon instance, not the trigger.
  private readonly clocks: [FireClock, FireClock] = [{ nextShotAt: 0 }, { nextShotAt: 0 }];
  private wasHolding = false;
  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly pool: BulletPool;

  constructor(scene: Phaser.Scene, player: Player, pool: BulletPool) {
    this.scene = scene;
    this.player = player;
    this.pool = pool;
  }

  get activeId(): WeaponId {
    return activeWeapon(this.loadout);
  }

  update(input: InputState, now: number, dt: number): void {
    if (input.interact) this.tryPickup(now);
    if (input.swap && swap(this.loadout)) {
      this.delayActive(now);
      this.scene.events.emit("weapon:swapped", { active: this.activeId });
    }

    const p = this.player;
    const weapon = WEAPONS[this.activeId];
    const ctx: FireContext = {
      scene: this.scene,
      weapon,
      origin: {
        x: p.x + Math.cos(p.aimAngle) * MUZZLE_PX,
        y: p.y + Math.sin(p.aimAngle) * MUZZLE_PX,
      },
      angle: p.aimAngle,
      pool: this.pool,
      stats: p.stats,
      now,
      holding: input.fire,
    };
    const behaviour = getBehaviour(weapon.behaviour);

    if (weapon.fireRate > 0) {
      const interval = fireIntervalMs(weapon, effectiveFireRateMul(p.stats, p.buffs, now));
      const shots = shotsDue(this.clocks[this.loadout.active], now, interval, input.fire);
      for (let i = 0; i < shots; i++) {
        if (!spendEnergy(p.combat, effectiveEnergyCost(weapon.energyPerShot, p.buffs, now))) {
          this.scene.events.emit("weapon:dryfire", { weaponId: weapon.id });
          break;
        }
        behaviour.fire(ctx);
        this.scene.events.emit("weapon:fired", {
          weaponId: weapon.id,
          x: ctx.origin.x,
          y: ctx.origin.y,
          angle: ctx.angle,
        });
      }
    }
    behaviour.update?.(ctx, dt);
    if (this.wasHolding && !input.fire) behaviour.onRelease?.(ctx);
    this.wasHolding = input.fire;
  }

  /** Dev helper: put a weapon in the active slot. */
  equip(id: WeaponId): void {
    this.loadout.slots[this.loadout.active] = id;
  }

  /** Returns the weapon dropped to make room, if any. */
  onPickup(id: WeaponId, now = this.scene.time.now): WeaponId | null {
    const { dropped } = pickUp(this.loadout, id);
    this.delayActive(now);
    this.scene.events.emit("weapon:swapped", { active: this.activeId });
    return dropped;
  }

  dropOnFloor(id: WeaponId, x: number, y: number): WeaponPickup {
    const pickup = new WeaponPickup(this.scene, x, y, id);
    this.pickups.push(pickup);
    return pickup;
  }

  private tryPickup(now: number): void {
    const p = this.player;
    const near = this.pickups.find((w) => Math.hypot(w.x - p.x, w.y - p.y) <= PICKUP_RANGE);
    if (!near) return;
    this.pickups.splice(this.pickups.indexOf(near), 1);
    near.destroy();
    const dropped = this.onPickup(near.weaponId, now);
    if (dropped) this.dropOnFloor(dropped, near.x, near.y);
  }

  private delayActive(now: number): void {
    const clock = this.clocks[this.loadout.active];
    clock.nextShotAt = Math.max(clock.nextShotAt, now + SWAP_DELAY_MS);
  }
}
