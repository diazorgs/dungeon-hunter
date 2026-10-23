import Phaser from "phaser";

export interface BulletOpts {
  damage: number;
  texture: string;
  knockback?: number;
  pierce?: number;
  bounces?: number;
  lifetimeMs?: number;
  scale?: number;
  /** Stun applied on hit (Shock Baton style), ms. */
  stunMs?: number;
}

/** Pooled projectile; never constructed per shot (see BulletPool). */
export class Bullet extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;
  owner: "player" | "enemy" = "player";
  damage = 0;
  knockback = 0;
  pierceLeft = 0;
  bouncesLeft = 0;
  stunMs = 0;
  behaviourId = "bullet";
  dieAt = 0;
  /** Guardians already hit by this bullet, so piercing shots hit each target once. */
  readonly hitIds = new Set<number>();

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "ph-bullet-player");
  }

  fire(x: number, y: number, angle: number, speed: number, opts: BulletOpts): void {
    this.enableBody(true, x, y, true, true);
    this.setTexture(opts.texture)
      .setScale(opts.scale ?? 1)
      .setRotation(angle)
      .setDepth(5000);
    this.body.setSize(this.width, this.height);
    this.damage = opts.damage;
    this.knockback = opts.knockback ?? 0;
    this.pierceLeft = opts.pierce ?? 0;
    this.bouncesLeft = opts.bounces ?? 0;
    this.stunMs = opts.stunMs ?? 0;
    this.body.setBounce(this.bouncesLeft > 0 ? 1 : 0);
    this.dieAt = this.scene.time.now + (opts.lifetimeMs ?? 3000);
    this.hitIds.clear();
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  kill(): void {
    this.disableBody(true, true);
  }
}
