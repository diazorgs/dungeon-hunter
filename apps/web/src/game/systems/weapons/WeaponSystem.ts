import { WEAPONS } from "@dh/shared";
import type { WeaponId } from "@dh/shared";
import type Phaser from "phaser";
import { resolveTexture, textureFor } from "../../content/textures.ts";
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
import type { Behaviour } from "./behaviours/Behaviour.ts";
import { createBehaviour } from "./behaviours/registry.ts";
import type { CombatTargets } from "./targets.ts";

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
  private readonly targets: CombatTargets;
  private readonly behaviours = new Map<string, Behaviour>();
  private lastBehaviour: Behaviour | null = null;
  /** The active weapon drawn in the Runner's hand, pointing along the aim. */
  private readonly held: Phaser.GameObjects.Image;
  private heldId = "";

  constructor(scene: Phaser.Scene, player: Player, pool: BulletPool, targets: CombatTargets) {
    this.scene = scene;
    this.player = player;
    this.pool = pool;
    this.targets = targets;
    this.held = scene.add.image(player.x, player.y, "ph-weapon").setOrigin(0.25, 0.6);
  }

  private behaviourFor(id: Behaviour["id"]): Behaviour {
    let b = this.behaviours.get(id);
    if (!b) this.behaviours.set(id, (b = createBehaviour(id)));
    return b;
  }

  get activeId(): WeaponId {
    return activeWeapon(this.loadout);
  }

  update(input: InputState, now: number, dt: number): void {
    if (input.interact) this.tryPickup(now);
    if (input.swap && swap(this.loadout)) {
      this.delayActive(now);
      this.scene.events.emit("weapon:swapped", { active: this.activeId });
    } else if (input.swap) this.scene.events.emit("weapon:swapfail");

    const p = this.player;
    const weapon = WEAPONS[this.activeId];
    const ctx: FireContext = {
      scene: this.scene,
      weapon,
      player: p,
      origin: {
        x: p.x + Math.cos(p.aimAngle) * MUZZLE_PX,
        y: p.y + Math.sin(p.aimAngle) * MUZZLE_PX,
      },
      angle: p.aimAngle,
      pool: this.pool,
      stats: p.stats,
      now,
      holding: input.fire,
      targets: this.targets,
      spend: (cost) => spendEnergy(p.combat, effectiveEnergyCost(cost, p.buffs, now)),
      fired: () =>
        this.scene.events.emit("weapon:fired", {
          weaponId: weapon.id,
          x: ctx.origin.x,
          y: ctx.origin.y,
          angle: ctx.angle,
        }),
      dryFire: () => this.scene.events.emit("weapon:dryfire", { weaponId: weapon.id }),
    };
    const behaviour = this.behaviourFor(weapon.behaviour);
    // Swapping away mid-beam/charge releases the old weapon.
    if (this.lastBehaviour && this.lastBehaviour !== behaviour)
      this.lastBehaviour.onRelease?.({ ...ctx, holding: false });
    this.lastBehaviour = behaviour;

    if (!behaviour.manual && weapon.fireRate > 0) {
      const interval = fireIntervalMs(weapon, effectiveFireRateMul(p.stats, p.buffs, now));
      const shots = shotsDue(this.clocks[this.loadout.active], now, interval, input.fire);
      for (let i = 0; i < shots; i++) {
        if (!ctx.spend(weapon.energyPerShot)) {
          ctx.dryFire();
          break;
        }
        behaviour.fire(ctx);
        ctx.fired();
      }
    }
    behaviour.update?.(ctx, dt);
    this.drawHeld();
    if (this.wasHolding && !input.fire) behaviour.onRelease?.(ctx);
    this.wasHolding = input.fire;
  }

  private drawHeld(): void {
    const p = this.player;
    if (this.heldId !== this.activeId) {
      this.heldId = this.activeId;
      const tex = resolveTexture(
        this.scene.textures,
        textureFor("weapon", this.heldId),
        "ph-weapon",
      );
      this.held.setTexture(tex.key, tex.frame);
    }
    const left = Math.cos(p.aimAngle) < 0;
    // Hand height in the 16×24 sprite; behind the body while aiming up.
    this.held
      .setPosition(Math.round(p.x + (left ? -2 : 2)), Math.round(p.y + 4))
      .setRotation(p.aimAngle)
      .setFlipY(left)
      .setDepth(p.depth + (Math.sin(p.aimAngle) < -0.5 ? -1 : 1))
      .setVisible(p.visible && p.combat.hp > 0);
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
