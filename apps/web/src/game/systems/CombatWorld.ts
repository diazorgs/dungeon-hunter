import type { Runner } from "@dh/shared";
import type Phaser from "phaser";
import { Player } from "../entities/Player.ts";
import type { InputState, Vec2 } from "../logic/input.ts";
import { AimAssist } from "./AimAssist.ts";
import { BulletPool } from "./BulletPool.ts";
import { createSkill, SkillSystem } from "./SkillSystem.ts";
import { WeaponSystem } from "./weapons/WeaponSystem.ts";

/** Everything combat needs in one room-agnostic bundle, ticked in DESIGN.md §4.4 order. */
export class CombatWorld {
  readonly player: Player;
  readonly aim = new AimAssist();
  readonly skills: SkillSystem;
  readonly playerBullets: BulletPool;
  readonly enemyBullets: BulletPool;
  readonly weapons: WeaponSystem;
  private readonly scene: Phaser.Scene;
  // shortcut: bare crosshair so the hidden cursor is usable; plan 08 owns the real one.
  private readonly crosshair: Phaser.GameObjects.Image;

  constructor(
    scene: Phaser.Scene,
    runner: Runner,
    walls: Phaser.Physics.Arcade.StaticGroup,
    at: Vec2,
  ) {
    this.scene = scene;
    this.player = new Player(scene, at.x, at.y, runner);
    this.skills = new SkillSystem(createSkill(runner));
    this.playerBullets = new BulletPool(scene, "player", 512);
    this.enemyBullets = new BulletPool(scene, "enemy", 768);
    this.weapons = new WeaponSystem(scene, this.player, this.playerBullets);
    this.aim.setWalls(walls);
    scene.physics.add.collider(this.player, walls);
    this.playerBullets.collideWith(walls);
    this.enemyBullets.collideWith(walls);
    this.crosshair = scene.add.image(at.x, at.y, "ph-crosshair").setDepth(6000);
  }

  update(input: InputState, now: number, dt: number, aimMode: "soft" | "full"): void {
    const ctx = { scene: this.scene, player: this.player };
    this.player.aimAngle = this.aim.update(this.player, input.aimWorld, aimMode);
    this.player.tick(input, now, dt);
    if (input.skill) this.skills.tryActivate(ctx, now);
    this.skills.update(ctx, now, dt);
    this.weapons.update(input, now, dt);
    this.playerBullets.update(now);
    this.enemyBullets.update(now);
    this.crosshair.setPosition(Math.round(input.aimWorld.x), Math.round(input.aimWorld.y));
  }
}
