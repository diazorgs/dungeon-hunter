import Phaser from "phaser";

/** Appears in the boss arena when a sector boss dies; E to ride down. */
export class LiftPad extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "ph-lift");
    scene.add.existing(this);
    this.setDepth(5).setAlpha(0);
    scene.tweens.add({ targets: this, alpha: 1, duration: 600 });
  }
}
