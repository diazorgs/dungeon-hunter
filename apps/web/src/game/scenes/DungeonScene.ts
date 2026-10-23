import Phaser from "phaser";
import { bus } from "../bridge/bus.ts";
import type { RunConfig } from "../bridge/types.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { buildPlaceholderRoom } from "../systems/placeholderRoom.ts";
import { SceneKey } from "./keys.ts";
import { emptyRunSummary } from "./runSummary.ts";

export class DungeonScene extends Phaser.Scene {
  private input$!: InputSystem;
  private runConfig!: RunConfig;
  private startedAt = 0;

  constructor() {
    super(SceneKey.Dungeon);
  }

  create() {
    this.runConfig = this.registry.get("runConfig") as RunConfig;
    this.startedAt = this.time.now;
    this.cameras.main.setRoundPixels(true);
    buildPlaceholderRoom(this, 15, 11);
    this.input$ = new InputSystem(this);
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

  update() {
    const input = this.input$.read(this.cameras.main, { x: 240, y: 135 });
    if (input.pause) {
      this.scene.launch(SceneKey.Pause, { from: SceneKey.Dungeon });
      this.scene.pause();
    }
  }
}
