import { PALETTE, SECTORS } from "@dh/shared";
import type { ModId, SectorId } from "@dh/shared";
import Phaser from "phaser";
import { hudText } from "../hud/text.ts";
import type { DungeonScene } from "./DungeonScene.ts";
import { SceneKey } from "./keys.ts";

const DESCENT_MS = 1200;

/** Between sectors, over the frozen dungeon: pick 1 of 3 mods (no cancel), then descend. Esc does nothing here. */
export class LiftScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Lift);
  }

  async create(data: { choices: ModId[]; from: SectorId }) {
    const dungeon = this.scene.get(SceneKey.Dungeon) as DungeonScene;
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.ink, 0.85).setOrigin(0);
    const next = SECTORS[Math.min(3, data.from + 1) as SectorId];
    hudText(this, width / 2, 24, "#e08a2e")
      .setOrigin(0.5, 0)
      .setText(`LIFT  ·  ${SECTORS[data.from].name.toUpperCase()}  →  ${next.name.toUpperCase()}`);
    // The HUD (running in parallel) owns the card overlay; draw it above this scene.
    this.scene.bringToTop(SceneKey.Hud);
    const id = await dungeon.pickMod(data.choices, false);
    if (id) dungeon.mods.apply(id);

    hudText(this, width / 2, height / 2 - 8, "#cfd8e6")
      .setOrigin(0.5)
      .setText("DESCENDING");
    const bar = this.add
      .rectangle(width / 2 - 60, height / 2 + 6, 0, 3, PALETTE["amber-500"])
      .setOrigin(0, 0.5);
    this.tweens.add({
      targets: bar,
      width: 120,
      duration: DESCENT_MS,
      onComplete: () => {
        this.scene.stop();
        dungeon.scene.resume();
        dungeon.descend();
      },
    });
  }
}
