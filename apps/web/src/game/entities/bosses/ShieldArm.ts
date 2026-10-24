import Phaser from "phaser";

/** A rotating blocker on the Core Warden's orbit: eats player bullets from the front. */
export class ShieldArm extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "ph-arm");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.pushable = false;
  }
}
