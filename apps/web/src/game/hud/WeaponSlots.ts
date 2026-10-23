import { PALETTE, WEAPONS } from "@dh/shared";
import type { Weapon, WeaponId } from "@dh/shared";
import type Phaser from "phaser";
import { textureFor } from "../content/textures.ts";
import type { Loadout } from "../logic/weapons/loadout.ts";
import { hudText } from "./text.ts";

export const RARITY_COLOR: Record<Weapon["rarity"], number> = {
  starter: PALETTE["steel-300"],
  common: PALETTE.bone,
  rare: PALETTE["teal-200"],
  epic: PALETTE["bleed-100"],
};

/** Two 24×16 frames; the active one is framed in amber, the energy cost sits under each. */
export class WeaponSlots {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly icons: Phaser.GameObjects.Image[];
  private readonly costs: Phaser.GameObjects.Text[];
  private readonly x: number;
  private readonly y: number;
  private key = "";

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.g = scene.add.graphics();
    this.icons = [0, 1].map((i) => scene.add.image(x + i * 28 + 12, y + 8, "ph-weapon"));
    this.costs = [0, 1].map((i) => hudText(scene, x + i * 28 + 1, y + 17, "#3d7bff"));
  }

  update(loadout: Loadout, energyCost: (id: WeaponId) => number): void {
    const key = `${loadout.slots.join()}/${loadout.active}`;
    if (key === this.key) return;
    this.key = key;
    this.g.clear();
    loadout.slots.forEach((id, i) => {
      const x = this.x + i * 28;
      const color =
        id === null
          ? PALETTE["steel-700"]
          : i === loadout.active
            ? PALETTE["amber-500"]
            : RARITY_COLOR[WEAPONS[id].rarity];
      this.g.fillStyle(PALETTE.ink).fillRect(x, this.y, 24, 16);
      this.g.lineStyle(1, color).strokeRect(x + 0.5, this.y + 0.5, 23, 15);
      const icon = this.icons[i]!;
      icon.setVisible(id !== null);
      if (id) {
        const tex = textureFor("weapon", id);
        icon.setTexture(tex.key, tex.frame).setTint(RARITY_COLOR[WEAPONS[id].rarity]);
      }
      this.costs[i]!.setText(id ? `E${energyCost(id)}` : "");
    });
  }
}
