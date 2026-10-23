import { GUARDIANS, dropPool } from "@dh/shared";
import type { GuardianId, SectorId } from "@dh/shared";
import { createRng } from "@dh/utils";
import type { Rng } from "@dh/utils";
import type Phaser from "phaser";
import type { Bullet } from "../entities/Bullet.ts";
import { Chest } from "../entities/Chest.ts";
import { Crate } from "../entities/Crate.ts";
import type { ComposedSector } from "../logic/dungeon/compose.ts";
import type { InputState } from "../logic/input.ts";
import {
  isGoldChest,
  rollChestWeapon,
  rollCrate,
  rollGuardianDrop,
  roomClearReward,
} from "../logic/loot/tables.ts";
import { onKill, onRoomCleared } from "../logic/run/runState.ts";
import type { RunState } from "../logic/run/runState.ts";
import type { CombatWorld } from "./CombatWorld.ts";
import { PickupSystem } from "./PickupSystem.ts";

const CHEST_RANGE = 20;

/** Turns kills, crates, chests and room clears into drops. All rolls use `loot:s{sector}`. */
export class LootSystem {
  readonly pickups: PickupSystem;
  readonly chests: Chest[] = [];
  private readonly scene: Phaser.Scene;
  private readonly world: CombatWorld;
  private readonly run: RunState;
  private readonly rng: Rng;

  constructor(
    scene: Phaser.Scene,
    world: CombatWorld,
    run: RunState,
    sector: ComposedSector,
    sectorId: SectorId,
  ) {
    this.scene = scene;
    this.world = world;
    this.run = run;
    this.rng = createRng(run.config.seed).fork(`loot:s${sectorId}`);
    this.pickups = new PickupSystem(scene, world.player, run);

    const solids = scene.physics.add.staticGroup();
    for (const s of sector.spawns) {
      if (s.kind === "crate") solids.add(new Crate(scene, s.x, s.y));
      if (s.kind === "chest") {
        const chest = new Chest(
          scene,
          s.x,
          s.y,
          isGoldChest(this.rng, sectorId) ? "gold" : "weapon",
        );
        this.chests.push(chest);
        solids.add(chest);
      }
    }
    const physics = scene.physics.add;
    physics.collider(world.player, solids);
    physics.collider(world.guardians.group, solids);
    physics.collider(world.enemyBullets.group, solids, (b) => (b as Bullet).kill());
    physics.collider(world.playerBullets.group, solids, (b, target) => {
      if (target instanceof Crate) target.hit((b as Bullet).damage);
      (b as Bullet).kill();
    });

    const on = (e: string, fn: (d: never) => void) => scene.events.on(e, fn);
    on(
      "guardian:killed",
      (d: { id: GuardianId; x: number; y: number; elite: boolean; selfDestruct: boolean }) => {
        // A Crawler that blew itself up was not killed by the player.
        if (d.selfDestruct) return;
        onKill(run);
        this.drop(d.x, d.y, rollGuardianDrop(this.rng, GUARDIANS[d.id], d.elite));
      },
    );
    on("crate:broken", (d: { x: number; y: number }) => this.drop(d.x, d.y, rollCrate(this.rng)));
    on("room:cleared", (d: { type: string }) => {
      if (d.type !== "combat") return;
      onRoomCleared(run);
      const p = world.player;
      for (let i = 0; i < roomClearReward(sectorId).scrap; i++)
        this.pickups.spawn("scrap", p.x, p.y - 24);
    });
  }

  /** Handles E on a nearby chest; returns true when it consumed the interact press. */
  tryInteract(input: InputState): boolean {
    if (!input.interact) return false;
    const p = this.world.player;
    const chest = this.chests.find(
      (c) => !c.opened && Math.hypot(c.x - p.x, c.y - p.y) <= CHEST_RANGE,
    );
    if (!chest) return false;
    chest.open();
    if (chest.kind === "gold") {
      this.scene.events.emit("chest:gold-opened", chest);
      return true;
    }
    const held = this.world.weapons.loadout.slots.filter((id) => id !== null);
    const id = rollChestWeapon(
      this.rng,
      dropPool(this.run.config.unlockedWeaponIds),
      held,
      p.stats.chestLuck,
    );
    // The weapon lands on the floor: taking it or leaving it is the player's call, nothing is lost.
    this.world.weapons.dropOnFloor(id, chest.x, chest.y + 16);
    this.scene.events.emit("chest:opened", { kind: chest.kind, weaponId: id });
    return true;
  }

  update(): void {
    this.pickups.update();
  }

  private drop(
    x: number,
    y: number,
    d: { scrap: number; energyOrbs: number; health?: boolean },
  ): void {
    if (d.scrap > 0) this.pickups.spawn("scrap", x, y, d.scrap);
    for (let i = 0; i < d.energyOrbs; i++) this.pickups.spawn("energy", x, y);
    if (d.health) this.pickups.spawn("health", x, y);
  }
}
