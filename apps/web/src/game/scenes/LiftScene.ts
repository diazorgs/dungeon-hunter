import Phaser from "phaser";
import { SceneKey } from "./keys.ts";

/** Between sectors: heal, pick a mod, descend (plan 15). */
export class LiftScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Lift);
  }

  create() {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, "LIFT", {
        fontFamily: "monospace",
        fontSize: "8px",
        color: "#cfd8e6",
      })
      .setOrigin(0.5)
      .setResolution(4);
  }
}
