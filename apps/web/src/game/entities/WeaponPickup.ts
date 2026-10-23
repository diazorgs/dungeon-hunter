import { PALETTE, WEAPONS } from "@dh/shared";
import type { Weapon, WeaponId } from "@dh/shared";
import Phaser from "phaser";
import { textureFor } from "../content/textures.ts";

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
    const tex = textureFor("weapon", weaponId);
    super(scene, x, y, tex.key, tex.frame);
    this.weaponId = weaponId;
    // shortcut: rarity shown as a tint until plan 23 adds outlined weapon sprites.
    this.setTint(RARITY_COLOR[WEAPONS[weaponId].rarity]).setDepth(y + 999);
    scene.add.existing(this);
  }
}
