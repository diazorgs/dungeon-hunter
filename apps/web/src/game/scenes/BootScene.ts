import Phaser from "phaser";
import { createPlaceholderTextures } from "../content/textures.ts";
import { SceneKey } from "./keys.ts";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Boot);
  }

  create() {
    this.input.mouse?.disableContextMenu();
    if (!this.registry.get("runConfig"))
      throw new Error("BootScene: runConfig missing from registry");
    createPlaceholderTextures(this.textures);
    this.scene.start(SceneKey.Preload);
  }
}
