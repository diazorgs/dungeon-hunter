import { PALETTE } from "@dh/shared";
import Phaser from "phaser";
import { SceneKey } from "./keys.ts";

/** Overlay that freezes the world scene; Esc resumes. */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Pause);
  }

  create(data: { from?: string }) {
    const from = data.from ?? SceneKey.Dungeon;
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.void, 0.7).setOrigin(0);
    this.add
      .text(width / 2, height / 2, "PAUSED\nEsc to resume", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#cfd8e6",
        align: "center",
      })
      .setOrigin(0.5)
      .setResolution(4);
    this.input.keyboard?.once("keydown-ESC", () => {
      this.scene.resume(from);
      this.scene.stop();
    });
  }
}
