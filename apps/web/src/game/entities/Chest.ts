import Phaser from "phaser";

/** Weapon chest, or gold chest that offers a Vault Mod pick (plan 13). */
export class Chest extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;
  readonly kind: "weapon" | "gold";
  opened = false;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: "weapon" | "gold") {
    super(scene, x, y, kind === "gold" ? "ph-chest-gold" : "ph-chest");
    this.kind = kind;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(y + 1000);
  }

  open(): void {
    this.opened = true;
    this.setTexture("ph-chest-open");
  }

  /** A declined gold-chest pick leaves it re-openable. */
  reclose(): void {
    this.opened = false;
    this.setTexture(this.kind === "gold" ? "ph-chest-gold" : "ph-chest");
  }
}
