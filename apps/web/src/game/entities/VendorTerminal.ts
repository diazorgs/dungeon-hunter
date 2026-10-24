import Phaser from "phaser";
import type { VendorStock } from "../logic/vendor.ts";

/** Scrap shop terminal (Sectors 2–3). Its stock is rolled once when the sector is built. */
export class VendorTerminal extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;
  readonly stock: VendorStock;

  constructor(scene: Phaser.Scene, x: number, y: number, stock: VendorStock) {
    super(scene, x, y, "ph-vendor");
    this.stock = stock;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(y + 1000);
  }
}
