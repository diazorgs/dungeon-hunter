import { RUNNERS } from "@dh/shared";
import { createRng } from "@dh/utils";
import Phaser from "phaser";
import { bus } from "../bridge/bus.ts";
import type { RunConfig } from "../bridge/types.ts";
import type { HudSource } from "../hud/HudSource.ts";
import { roomAt } from "../logic/camera.ts";
import { createRunState, endRun, tickTime } from "../logic/run/runState.ts";
import type { RunState } from "../logic/run/runState.ts";
import { toRunResult, toRunSummary } from "../logic/run/summary.ts";
import { LootSystem } from "../systems/LootSystem.ts";
import { validateRun } from "@dh/shared";
import { loadedTemplates, ROOM_CATALOG, TILES, TILESET_KEY } from "../content/rooms.ts";
import { composeSector, TILE_PX, wallAt } from "../logic/dungeon/compose.ts";
import { generateSector } from "../logic/dungeon/generate.ts";
import { assignTemplates } from "../logic/dungeon/templates.ts";
import { CameraDirector } from "../systems/CameraDirector.ts";
import { CombatWorld } from "../systems/CombatWorld.ts";
import { EncounterSystem } from "../systems/EncounterSystem.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { buildSector } from "../systems/SectorBuilder.ts";
import { SceneKey } from "./keys.ts";

const SECTOR = 1;

export class DungeonScene extends Phaser.Scene {
  private input$!: InputSystem;
  private runConfig!: RunConfig;
  private loot!: LootSystem;
  private ending = false;
  run!: RunState;
  private camDirector!: CameraDirector;
  private encounters!: EncounterSystem;
  private readonly visited = new Set<number>();
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
    this.cameras.main.setRoundPixels(true);

    const layout = assignTemplates(
      generateSector(seed, SECTOR),
      ROOM_CATALOG,
      createRng(seed).fork(`templates:s${SECTOR}`),
    );
    const sector = composeSector(layout, loadedTemplates(this.cache.json), TILES);
    const built = buildSector(this, sector, TILESET_KEY);
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
    this.events.on("player:died", () => this.die());
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

    // Keys pressed while paused must not replay on resume.
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.input$.reset());

    if (import.meta.env.DEV) this.input.keyboard?.on("keydown-F9", () => this.abandon());
  }

  update(time: number, delta: number) {
    const dt = delta / 1000;
    // update() never runs while paused, so pause time is not counted; hit-stop is.
    tickTime(this.run, delta, false);
    const input = this.input$.read(this.cameras.main, this.world.player);
    if (this.loot.tryInteract(input)) input.interact = false;
    this.world.update(input, time, dt, this.runConfig.settings.aimMode);
    this.loot.update();
    this.encounters.update(this.world.player);
    this.camDirector.update(this.world.player, dt);
    if (input.pause) {
      this.scene.launch(SceneKey.Pause, { from: SceneKey.Dungeon });
      this.scene.pause();
    }
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
