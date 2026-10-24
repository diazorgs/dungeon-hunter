import { UI_FONT } from "../hud/text.ts";
import { PALETTE } from "@dh/shared";
import Phaser from "phaser";
import { SceneKey } from "./keys.ts";

const MENU = "PAUSED\n\nEsc  resume\nA    abandon run";
const CONFIRM = "ABANDON RUN?\n\nY    yes, end the run\nEsc  no";

/** Overlay that freezes the world scene: resume, or abandon with confirmation. */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Pause);
  }

  create(data: { from?: string }) {
    const from = data.from ?? SceneKey.Dungeon;
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.void, 0.7).setOrigin(0);
    const text = this.add
      .text(width / 2, height / 2, MENU, {
        fontFamily: UI_FONT,
        fontSize: "8px",
        color: "#cfd8e6",
        align: "left",
      })
      .setOrigin(0.5)
      .setResolution(4);
    let confirming = false;
    const kb = this.input.keyboard!;
    kb.on("keydown-ESC", () => {
      if (confirming) {
        confirming = false;
        text.setText(MENU);
        return;
      }
      this.scene.resume(from);
      this.scene.stop();
    });
    kb.on("keydown-A", () => {
      confirming = true;
      text.setText(CONFIRM);
    });
    kb.on("keydown-Y", () => {
      if (!confirming) return;
      const world = this.scene.get(from) as Phaser.Scene & { abandon?: () => void };
      this.scene.stop();
      world.abandon?.();
    });
  }
}
