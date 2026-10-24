import { RADIO, RUNNERS, SECTORS } from "@dh/shared";
import { createRng } from "@dh/utils";
import Phaser from "phaser";
import { bus } from "../bridge/bus.ts";
import type { RunConfig } from "../bridge/types.ts";
import type { HudSource } from "../hud/HudSource.ts";
import { roomAt } from "../logic/camera.ts";
import {
  advanceSector,
  createRunState,
  endRun,
  onBossKilled,
  tickTime,
} from "../logic/run/runState.ts";
import { heal } from "../logic/combat/combatant.ts";
import type { CombatantState } from "../logic/combat/combatant.ts";
import type { Loadout } from "../logic/weapons/loadout.ts";
import { LiftPad } from "../entities/LiftPad.ts";
import { VendorTerminal } from "../entities/VendorTerminal.ts";
import { applySectorAtmosphere } from "../systems/visuals/sectorAtmosphere.ts";
import { playShutdown } from "./ShutdownSequence.ts";
import { gainEnergy } from "../logic/combat/combatant.ts";
import { rollVendorStock, tryBuy } from "../logic/vendor.ts";
import type { VendorItem } from "../logic/vendor.ts";
import { spendScrap } from "../logic/run/runState.ts";
import type { RunState } from "../logic/run/runState.ts";
import { toRunResult, toRunSummary } from "../logic/run/summary.ts";
import { LootSystem } from "../systems/LootSystem.ts";
import { ModSystem } from "../systems/ModSystem.ts";
import { MOD_IDS, dropPool, modPool, validateRun } from "@dh/shared";
import type { BossId, ModId, SectorId } from "@dh/shared";
import type { Chest } from "../entities/Chest.ts";
import { rollModChoices } from "../logic/mods/choices.ts";
import type { HudScene } from "./HudScene.ts";
import { loadedTemplates, ROOM_CATALOG, TILES } from "../content/rooms.ts";
import { composeSector, TILE_PX, wallAt } from "../logic/dungeon/compose.ts";
import { generateSector } from "../logic/dungeon/generate.ts";
import { assignTemplates } from "../logic/dungeon/templates.ts";
import { CameraDirector } from "../systems/CameraDirector.ts";
import { CombatWorld } from "../systems/CombatWorld.ts";
import { EncounterSystem } from "../systems/EncounterSystem.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { buildSector } from "../systems/SectorBuilder.ts";
import { SceneKey } from "./keys.ts";

/** What survives a sector rebuild besides RunState (which holds mods, Scrap and progress). */
interface Carry {
  combat: Pick<CombatantState, "hp" | "shield" | "energy">;
  loadout: Loadout;
}
const LIFT_RANGE = 20;
const LIFT_HEAL = 2;
const SECTOR_BOSS: Record<SectorId, BossId> = {
  1: "gatekeeper",
  2: "conduit-hydra",
  3: "core-warden",
};

export class DungeonScene extends Phaser.Scene {
  private input$!: InputSystem;
  private runConfig!: RunConfig;
  private loot!: LootSystem;
  mods!: ModSystem;
  private ending = false;
  run!: RunState;
  private camDirector!: CameraDirector;
  private encounters!: EncounterSystem;
  private readonly visited = new Set<number>();
  private lift: LiftPad | null = null;
  private vendor: VendorTerminal | null = null;
  world!: CombatWorld;

  constructor() {
    super(SceneKey.Dungeon);
  }

  create() {
    this.runConfig = this.registry.get("runConfig") as RunConfig;
    const { seed } = this.runConfig;
    // The run outlives sector rebuilds (scene restarts); create it once per game.
    this.run =
      (this.registry.get("runState") as RunState | undefined) ?? createRunState(this.runConfig);
    this.registry.set("runState", this.run);
    this.ending = false;
    this.lift = null;
    const SECTOR = this.run.sector;
    this.cameras.main.setRoundPixels(true);
    // scene.events survives a restart: drop our domain:verb listeners so nothing doubles up.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const name of this.events.eventNames())
        if (typeof name === "string" && name.includes(":")) this.events.removeAllListeners(name);
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResume);
    });

    const layout = assignTemplates(
      generateSector(seed, SECTOR),
      ROOM_CATALOG,
      createRng(seed).fork(`templates:s${SECTOR}`),
    );
    const sector = composeSector(layout, loadedTemplates(this.cache.json), TILES);
    const built = buildSector(this, sector, SECTORS[SECTOR].tileset);
    applySectorAtmosphere(this, SECTORS[SECTOR], sector);
    const width = sector.widthTiles * TILE_PX;
    const height = sector.heightTiles * TILE_PX;
    this.physics.world.setBounds(0, 0, width, height);
    const start = sector.spawns.find((s) => s.kind === "player-start")!;

    this.input$ = new InputSystem(this);
    this.world = new CombatWorld(
      this,
      RUNNERS[this.runConfig.runnerId],
      this.runConfig.settings,
      [built.wallLayer, built.doorGroup],
      start,
      (x, y) => wallAt(sector, x, y),
    );
    this.camDirector = new CameraDirector(this.cameras.main, sector.rooms, width, height);
    this.encounters = new EncounterSystem(this, this.world.guardians, built.doors, sector, {
      sectorId: SECTOR,
      seed,
      roomsClearedThisRun: () => this.run.roomsCleared,
    });
    this.loot = new LootSystem(this, this.world, this.run, sector, SECTOR);
    this.mods = new ModSystem(this, this.world.player, this.run, this.world.guardians);
    const vendorAt = sector.spawns.find((sp) => sp.kind === "vendor");
    this.vendor = vendorAt
      ? new VendorTerminal(
          this,
          vendorAt.x,
          vendorAt.y,
          rollVendorStock(
            createRng(seed).fork(`vendor:s${SECTOR}`),
            dropPool(this.runConfig.unlockedWeaponIds),
            SECTOR,
          ),
        )
      : null;
    if (this.vendor) this.physics.add.collider(this.world.player, this.vendor);
    const goldRng = createRng(seed).fork(`mods:gold:s${SECTOR}`);
    this.events.on("chest:gold-opened", async (chest: Chest) => {
      const choices = rollModChoices(
        goldRng,
        modPool(this.runConfig.unlockedModIds),
        this.world.player.stats,
      );
      const id = await this.pickMod(choices, true);
      if (id) this.mods.apply(id);
      else chest.reclose();
    });
    this.events.on("boss:room", (d: { x: number; y: number }) =>
      this.world.bosses.start(SECTOR_BOSS[SECTOR], d.x, d.y),
    );
    this.events.on("boss:dead", (d: { id: BossId }) => {
      onBossKilled(this.run, d.id);
      // Core Warden: the shutdown cinematic ends the run in victory.
      if (d.id === "core-warden") {
        void playShutdown(this, this.world.player, () => (this.input$.blocked = true)).then(() =>
          this.finish(),
        );
        return;
      }
      const at = sector.spawns.find((sp) => sp.kind === "lift");
      if (at) this.lift = new LiftPad(this, at.x, at.y);
    });
    this.events.on("player:died", () => this.die());
    if (import.meta.env.DEV)
      Object.assign((window as unknown as { __dh: object }).__dh, {
        giveMod: (id: ModId) =>
          MOD_IDS.includes(id) ? this.mods.apply(id) : console.warn("unknown mod", id),
      });
    this.visited.clear();
    this.events.on("room:entered", (d: { roomId: number }) => this.visited.add(d.roomId));
    const source: HudSource = {
      player: this.world.player,
      weapons: this.world.weapons,
      skills: this.world.skills,
      layout,
      visitedRooms: this.visited,
      currentRoom: () => roomAt(this.world.player, sector.rooms),
      scrap: () => this.run.scrap,
      sector: SECTOR,
      events: this.events,
    };
    this.registry.set("hudSource", source);
    this.game.events.emit("hud:rebind");

    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume);

    // Sector carry-over: HP, shield, energy and held weapons (mods were re-applied by ModSystem).
    const carry = this.registry.get("carry") as Carry | undefined;
    if (carry) {
      Object.assign(this.world.player.combat, carry.combat);
      Object.assign(this.world.weapons.loadout, structuredClone(carry.loadout));
      this.registry.remove("carry");
    }
    const beat = SECTORS[SECTOR].radioEnterBeat;
    for (const line of RADIO.filter((l) => l.beat === beat)) this.events.emit("radio:say", line);
    this.events.emit("sector:entered", { sector: SECTOR });

    if (import.meta.env.DEV) {
      this.input.keyboard?.on("keydown-F9", () => this.abandon());
      this.input.keyboard?.on("keydown-F8", () => this.rebuildSector());
      // F6: clear the room (kills every live guardian) to walk a seed quickly.
      this.input.keyboard?.on("keydown-F6", () => {
        for (const g of this.world.guardians.alive()) g.takeHit(9999, 0, 0, this.time.now);
      });
    }
  }

  // Keys pressed while paused must not replay on resume.
  private readonly onResume = () => this.input$.reset();

  update(time: number, delta: number) {
    const dt = delta / 1000;
    // update() never runs while paused, so pause time is not counted; hit-stop is.
    tickTime(this.run, delta, false);
    const input = this.input$.read(this.cameras.main, this.world.player);
    if (this.loot.tryInteract(input)) input.interact = false;
    const p = this.world.player;
    if (
      input.interact &&
      this.vendor &&
      Math.hypot(this.vendor.x - p.x, this.vendor.y - p.y) <= LIFT_RANGE + 8
    ) {
      input.interact = false;
      void this.openVendor(this.vendor);
    }
    if (
      input.interact &&
      this.lift &&
      Math.hypot(this.lift.x - p.x, this.lift.y - p.y) <= LIFT_RANGE
    ) {
      input.interact = false;
      this.startLift();
    }
    this.world.update(input, time, dt, this.runConfig.settings.aimMode);
    this.loot.update();
    this.encounters.update(this.world.player);
    this.camDirector.update(this.world.player, dt);
    if (input.pause) {
      this.scene.launch(SceneKey.Pause, { from: SceneKey.Dungeon });
      this.scene.pause();
    }
  }

  /** Opens the HUD's mod cards; world input is blocked meanwhile (combat itself keeps running). */
  async pickMod(choices: ModId[], cancellable: boolean): Promise<ModId | null> {
    const hud = this.scene.get(SceneKey.Hud) as HudScene;
    this.input$.blocked = true;
    const id = await hud.modPick.open(choices, { cancellable, gold: cancellable });
    this.input$.blocked = false;
    return id;
  }

  /** Vendor panel: Scrap for weapons, health, energy. A weapon with both slots full drops the active one. */
  private async openVendor(terminal: VendorTerminal): Promise<void> {
    const hud = this.scene.get(SceneKey.Hud) as HudScene;
    if (hud.vendor.isOpen) return;
    const p = this.world.player;
    const buy = (item: VendorItem): string | null => {
      const c = p.combat;
      const check = tryBuy(terminal.stock, item, {
        scrap: this.run.scrap,
        hpFull: c.hp >= c.maxHp,
        energyFull: c.energy >= c.maxEnergy,
      });
      if (!check.ok) return check.reason;
      spendScrap(this.run, check.cost);
      if (item.kind === "weapon") {
        const w = terminal.stock.weapons[item.index]!;
        w.sold = true;
        const dropped = this.world.weapons.onPickup(w.id);
        if (dropped) this.world.weapons.dropOnFloor(dropped, terminal.x, terminal.y + 18);
      } else if (item.kind === "health") heal(c, terminal.stock.health.amount);
      else gainEnergy(c, terminal.stock.energy.amount);
      this.events.emit("pickup:collected", { kind: item.kind, amount: 1 });
      return null;
    };
    this.input$.blocked = true;
    await hud.vendor.open(terminal.stock, () => this.run.scrap, buy);
    this.input$.blocked = false;
  }

  /** Lift: freeze the world, heal 2 HP, a non-cancellable mod pick, then descend. */
  private startLift(): void {
    this.lift?.destroy();
    this.lift = null;
    heal(this.world.player.combat, LIFT_HEAL);
    const rng = createRng(this.runConfig.seed).fork(`mods:lift:s${this.run.sector}`);
    const choices = rollModChoices(
      rng,
      modPool(this.runConfig.unlockedModIds),
      this.world.player.stats,
    );
    this.scene.launch(SceneKey.Lift, { choices, from: this.run.sector });
    this.scene.pause();
  }

  /** Called by LiftScene after the pick. */
  descend(): void {
    advanceSector(this.run);
    this.rebuildSector();
  }

  /** Restart the scene on the run's current sector, carrying the Runner over. */
  rebuildSector(): void {
    const carry: Carry = {
      combat: {
        hp: this.world.player.combat.hp,
        shield: this.world.player.combat.shield,
        energy: this.world.player.combat.energy,
      },
      loadout: structuredClone(this.world.weapons.loadout),
    };
    this.registry.set("carry", carry);
    this.scene.restart();
  }

  /** Pause menu → Abandon (and F9 in DEV). */
  abandon(): void {
    endRun(this.run, "abandon");
    this.finish();
  }

  /** 1.2 s slow-motion death beat, then hand the summary to React. */
  private die(): void {
    if (this.ending) return;
    endRun(this.run, "death");
    this.ending = true;
    const slow = 0.25;
    this.time.timeScale = slow;
    this.tweens.timeScale = slow;
    this.physics.world.timeScale = 1 / slow;
    this.time.delayedCall(1200 * slow, () => this.finish());
  }

  private finish(): void {
    this.ending = true;
    const summary = toRunSummary(this.run);
    if (import.meta.env.DEV) {
      const check = validateRun(toRunResult(this.run));
      if (!check.ok) console.warn("RunResult would be rejected:", check.reason, summary);
    }
    bus.emit("run:ended", summary);
  }
}
