import { RUNNERS } from "@dh/shared";
import { createRng } from "@dh/utils";
import Phaser from "phaser";
import { bus } from "../bridge/bus.ts";
import type { RunConfig } from "../bridge/types.ts";
import type { HudSource } from "../hud/HudSource.ts";
import { roomAt } from "../logic/camera.ts";
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
import { emptyRunSummary } from "./runSummary.ts";

const SECTOR = 1;

export class DungeonScene extends Phaser.Scene {
  private input$!: InputSystem;
  private runConfig!: RunConfig;
  private startedAt = 0;
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
    this.startedAt = this.time.now;
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
      scrap: () => 0,
      sector: SECTOR,
      events: this.events,
    };
    this.registry.set("hudSource", source);
    this.game.events.emit("hud:rebind");

    // Keys pressed while paused must not replay on resume.
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.input$.reset());

    if (import.meta.env.DEV)
      this.input.keyboard?.on("keydown-F9", () =>
        bus.emit(
          "run:ended",
          emptyRunSummary(this.runConfig, this.time.now - this.startedAt, "abandon"),
        ),
      );
  }

  update(time: number, delta: number) {
    const dt = delta / 1000;
    const input = this.input$.read(this.cameras.main, this.world.player);
    this.world.update(input, time, dt, this.runConfig.settings.aimMode);
    this.encounters.update(this.world.player);
    this.camDirector.update(this.world.player, dt);
    if (input.pause) {
      this.scene.launch(SceneKey.Pause, { from: SceneKey.Dungeon });
      this.scene.pause();
    }
  }
}
