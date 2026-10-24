import Phaser from "phaser";

/** A rotating blocker on the Core Warden's orbit: eats player bullets from the front. */
export class ShieldArm extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "bosses", "warden-arm/idle/0");
    if (!scene.textures.exists("bosses")) this.setTexture("ph-arm");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.pushable = false;
  }
}
