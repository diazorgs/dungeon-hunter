import Phaser from "phaser";
import { createPlaceholderTextures } from "../content/textures.ts";
import { parseDevParams } from "../logic/devParams.ts";
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
    const sandbox = import.meta.env.DEV && parseDevParams(location.search).scene === "sandbox";
    this.scene.start(sandbox ? SceneKey.Sandbox : SceneKey.Preload);
  }
}
