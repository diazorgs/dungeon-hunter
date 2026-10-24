import { PALETTE, WEAPONS } from "@dh/shared";
import type { Weapon, WeaponId } from "@dh/shared";
import Phaser from "phaser";
import { resolveTexture, textureFor } from "../content/textures.ts";

// DESIGN.md §11.2 rarity colours.
const RARITY_COLOR: Record<Weapon["rarity"], number> = {
  starter: PALETTE["steel-300"],
  common: PALETTE.bone,
  rare: PALETTE["teal-200"],
  epic: PALETTE["bleed-100"],
};

/** A weapon lying on the floor; `E` within range picks it up. */
export class WeaponPickup extends Phaser.GameObjects.Image {
  readonly weaponId: WeaponId;

  constructor(scene: Phaser.Scene, x: number, y: number, weaponId: WeaponId) {
    const tex = resolveTexture(scene.textures, textureFor("weapon", weaponId), "ph-weapon");
    super(scene, x, y, tex.key, tex.frame);
    this.weaponId = weaponId;
    // Rarity reads as a coloured glow around the drawn sprite.
    this.enableFilters().filters?.internal.addGlow(
      RARITY_COLOR[WEAPONS[weaponId].rarity],
      2,
      0,
      1,
      false,
      4,
    );
    this.setDepth(y + 999);
    scene.add.existing(this);
  }
}
