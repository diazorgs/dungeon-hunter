import Phaser from "phaser";
import { bus } from "../bridge/bus.ts";
import { RUNNERS } from "@dh/shared";
import type { RunConfig } from "../bridge/types.ts";
import { CombatWorld } from "../systems/CombatWorld.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { buildPlaceholderRoom } from "../systems/placeholderRoom.ts";
import { SceneKey } from "./keys.ts";
import { emptyRunSummary } from "./runSummary.ts";

export class DungeonScene extends Phaser.Scene {
  private input$!: InputSystem;
  private runConfig!: RunConfig;
  private startedAt = 0;
  /** Read by the HUD scene. */
  world!: CombatWorld;

  constructor() {
    super(SceneKey.Dungeon);
  }

  create() {
    this.runConfig = this.registry.get("runConfig") as RunConfig;
    this.startedAt = this.time.now;
    this.cameras.main.setRoundPixels(true);
    const room = buildPlaceholderRoom(this, 15, 11);
    this.input$ = new InputSystem(this);
    this.world = new CombatWorld(
      this,
      RUNNERS[this.runConfig.runnerId],
      room.walls,
      {
        x: room.inner.centerX,
        y: room.inner.centerY,
      },
      room.blocked,
    );
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
    const input = this.input$.read(this.cameras.main, this.world.player);
    this.world.update(input, time, delta / 1000, this.runConfig.settings.aimMode);
    if (input.pause) {
      this.scene.launch(SceneKey.Pause, { from: SceneKey.Dungeon });
      this.scene.pause();
    }
  }
}
