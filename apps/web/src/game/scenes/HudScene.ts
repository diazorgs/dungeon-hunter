import Phaser from "phaser";
import { SceneKey } from "./keys.ts";

/** Screen-space HUD, runs parallel to the dungeon (filled in plan 11). */
export class HudScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Hud);
  }

  create() {
    this.add
      .text(4, 4, "HUD", { fontFamily: "monospace", fontSize: "8px", color: "#8296b8" })
      .setResolution(4);
  }
}
