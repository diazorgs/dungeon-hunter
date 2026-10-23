import Phaser from "phaser";
import { Bullet } from "../entities/Bullet.ts";
import type { BulletOpts } from "../entities/Bullet.ts";

/** Fixed-size bullet pool (DESIGN.md §4.5): exhaustion skips the shot, never allocates. */
export class BulletPool {
  readonly group: Phaser.Physics.Arcade.Group;
  private readonly scene: Phaser.Scene;
  private readonly owner: Bullet["owner"];

  constructor(scene: Phaser.Scene, owner: Bullet["owner"], maxSize: number) {
    this.scene = scene;
    this.owner = owner;
    this.group = scene.physics.add.group({ classType: Bullet, maxSize, runChildUpdate: false });
  }

  spawn(x: number, y: number, angle: number, speed: number, opts: BulletOpts): Bullet | null {
    const b = this.group.get(x, y) as Bullet | null;
    if (!b) return null;
    b.owner = this.owner;
    b.fire(x, y, angle, speed, opts);
    return b;
  }

  /** Bullets die on walls unless they still have bounces (Arcade reflects them via bounce 1). */
  collideWith(walls: Phaser.Types.Physics.Arcade.ArcadeColliderType): void {
    this.scene.physics.add.collider(this.group, walls, (obj) => {
      const b = obj as Bullet;
      if (b.bouncesLeft > 0) {
        b.bouncesLeft--;
        if (b.bouncesLeft === 0) b.body.setBounce(0);
        return;
      }
      this.scene.events.emit("bullet:wall", { x: b.x, y: b.y, owner: b.owner });
      b.kill();
    });
  }

  /** Expire by lifetime and world bounds; call once per frame. */
  update(now: number): void {
    const bounds = this.scene.physics.world.bounds;
    this.forEachActive((b) => {
      if (now >= b.dieAt || !bounds.contains(b.x, b.y)) b.kill();
    });
  }

  forEachActive(fn: (b: Bullet) => void): void {
    for (const b of this.group.getChildren() as Bullet[]) if (b.active) fn(b);
  }

  activeCount(): number {
    return this.group.countActive(true);
  }

  clear(): void {
    this.forEachActive((b) => b.kill());
  }
}
