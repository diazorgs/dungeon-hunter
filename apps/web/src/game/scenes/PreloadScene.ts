import { PALETTE } from "@dh/shared";
import Phaser from "phaser";
import { queueRoomAssets } from "../content/rooms.ts";
import { parseDevParams } from "../logic/devParams.ts";
import { SFX_NAMES } from "../systems/AudioSystem.ts";
import { SceneKey } from "./keys.ts";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Preload);
  }

  preload() {
    const { width, height } = this.scale;
    const w = 160;
    const x = (width - w) / 2;
    const y = height / 2;
    this.add.rectangle(x - 2, y - 2, w + 4, 8, PALETTE["steel-700"]).setOrigin(0);
    const fill = this.add.rectangle(x, y, 0, 4, PALETTE["amber-500"]).setOrigin(0);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => (fill.width = w * p));
    queueRoomAssets(this.load);
    for (const name of SFX_NAMES) this.load.audio(`sfx.${name}`, `assets/audio/sfx/${name}.wav`);
  }

  create() {
    if (import.meta.env.DEV && parseDevParams(location.search).scene === "sandbox") {
      this.scene.start(SceneKey.Sandbox);
      return;
    }
    this.scene.launch(SceneKey.Hud);
    this.scene.start(SceneKey.Dungeon);
  }
}
