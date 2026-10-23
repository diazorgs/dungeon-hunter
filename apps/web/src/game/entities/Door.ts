import Phaser from "phaser";
import type { Dir } from "../logic/dungeon/types.ts";

/** A room door: invisible and passable until locked. */
export class Door extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;
  readonly roomId: number;
  readonly dir: Dir;

  constructor(scene: Phaser.Scene, x: number, y: number, roomId: number, dir: Dir) {
    super(scene, x, y, dir === "N" || dir === "S" ? "ph-door-h" : "ph-door-v");
    this.roomId = roomId;
    this.dir = dir;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(15);
    this.unlock();
  }

  get locked(): boolean {
    return this.body.enable;
  }

  lock(): void {
    this.setVisible(true);
    this.body.enable = true;
  }

  unlock(): void {
    this.setVisible(false);
    this.body.enable = false;
  }
}
