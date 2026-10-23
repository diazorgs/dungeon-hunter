import Phaser from "phaser";
import type { DungeonScene } from "./DungeonScene.ts";
import { SceneKey } from "./keys.ts";

/** Screen-space HUD, runs parallel to the dungeon (filled in plan 11). */
export class HudScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Hud);
  }

  private text!: Phaser.GameObjects.Text;

  create() {
    this.text = this.add
      .text(4, 4, "", { fontFamily: "monospace", fontSize: "8px", color: "#a9b8d1" })
      .setResolution(4);
  }

  // shortcut: placeholder text readout; plan 11 replaces it with bars and the cooldown ring.
  update(time: number) {
    const rig = (this.scene.get(SceneKey.Dungeon) as DungeonScene).rig;
    if (!rig) return;
    const c = rig.player.combat;
    const cd = rig.skills.cooldown.remaining(time);
    this.text.setText(
      `HP ${c.hp}/${c.maxHp}  SH ${c.shield}/${c.maxShield}  EN ${c.energy}\n` +
        `SKILL ${cd > 0 ? `${Math.ceil(cd / 1000)}s` : "ready"}`,
    );
  }
}
