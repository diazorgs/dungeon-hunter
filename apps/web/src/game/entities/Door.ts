import Phaser from "phaser";
import { WALL_TOP_DEPTH } from "../content/rooms.ts";
import type { Dir } from "../logic/dungeon/types.ts";

const TILE = 16;

/**
 * A room door: invisible and passable until locked. Locked, it reads as a wall block in 3/4
 * view: N/S doors show a gate face on their own cells and a cap one tile up; W/E doors, like
 * side walls, show only the raised cap.
 */
export class Door extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;
  readonly roomId: number;
  readonly dir: Dir;
  private readonly cap: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, roomId: number, dir: Dir) {
    const across = dir === "N" || dir === "S";
    super(scene, x, y, across ? "ph-door-h" : "ph-door-v");
    this.roomId = roomId;
    this.dir = dir;
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.setDepth(15).setAlpha(across ? 1 : 0);
    this.cap = scene.add
      .image(x, y - TILE, across ? "ph-door-cap-h" : "ph-door-v")
      .setDepth(WALL_TOP_DEPTH);
    this.unlock();
  }

  get locked(): boolean {
    return this.body.enable;
  }

  lock(): void {
    this.setVisible(true);
    this.cap.setVisible(true);
    this.body.enable = true;
  }

  unlock(): void {
    this.setVisible(false);
    this.cap.setVisible(false);
    this.body.enable = false;
  }
}
