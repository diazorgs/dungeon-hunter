import type Phaser from "phaser";
import { cameraTarget } from "../logic/camera.ts";
import type { ComposedRoom } from "../logic/dungeon/compose.ts";
import type { Vec2 } from "../logic/input.ts";

const LERP = 0.12;

/** Frames the current room; follows the player through corridors. */
export class CameraDirector {
  private readonly cam: Phaser.Cameras.Scene2D.Camera;
  private readonly rooms: readonly ComposedRoom[];
  private snapped = false;

  constructor(
    cam: Phaser.Cameras.Scene2D.Camera,
    rooms: readonly ComposedRoom[],
    width: number,
    height: number,
  ) {
    this.cam = cam;
    this.rooms = rooms;
    cam.setBounds(0, 0, width, height);
  }

  update(player: Vec2, dt: number): void {
    const t = cameraTarget(player, this.rooms);
    const sx = t.x - this.cam.width / 2;
    const sy = t.y - this.cam.height / 2;
    // Frame-rate independent version of "move 12% of the way each 60 Hz frame".
    const k = this.snapped ? 1 - (1 - LERP) ** (dt * 60) : 1;
    this.snapped = true;
    this.cam.setScroll(
      this.cam.scrollX + (sx - this.cam.scrollX) * k,
      this.cam.scrollY + (sy - this.cam.scrollY) * k,
    );
  }
}
