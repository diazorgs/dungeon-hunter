import type { Runner, Settings } from "@dh/shared";
import type Phaser from "phaser";
import { Player } from "../entities/Player.ts";
import type { InputState, Vec2 } from "../logic/input.ts";
import { AimAssist } from "./AimAssist.ts";
import { AudioSystem } from "./AudioSystem.ts";
import { Crosshair } from "./Crosshair.ts";
import { DamageNumbers } from "./DamageNumbers.ts";
import { JuiceSystem } from "./JuiceSystem.ts";
import { BulletPool } from "./BulletPool.ts";
import { GuardianSystem } from "./GuardianSystem.ts";
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
  readonly guardians: GuardianSystem;
  readonly audio: AudioSystem;
  readonly juice: JuiceSystem;
  private readonly scene: Phaser.Scene;
  private readonly crosshair: Crosshair;

  constructor(
    scene: Phaser.Scene,
    runner: Runner,
    settings: Settings,
    walls: Phaser.Physics.Arcade.StaticGroup,
    at: Vec2,
    blocked: (x: number, y: number) => boolean,
  ) {
    this.scene = scene;
    this.player = new Player(scene, at.x, at.y, runner);
    this.skills = new SkillSystem(createSkill(runner));
    this.playerBullets = new BulletPool(scene, "player", 512);
    this.enemyBullets = new BulletPool(scene, "enemy", 768);
    this.weapons = new WeaponSystem(scene, this.player, this.playerBullets);
    this.guardians = new GuardianSystem(
      scene,
      this.player,
      { player: this.playerBullets, enemy: this.enemyBullets },
      walls,
      blocked,
    );
    this.aim.setWalls(walls);
    this.aim.setTargetsProvider(() => this.guardians.targets());
    scene.physics.add.collider(this.player, walls);
    this.playerBullets.collideWith(walls);
    this.enemyBullets.collideWith(walls);
    this.audio = new AudioSystem(scene, settings);
    this.juice = new JuiceSystem(
      scene,
      settings,
      this.audio,
      new DamageNumbers(scene, settings.damageNumbers),
    );
    this.crosshair = new Crosshair(scene);
  }

  update(input: InputState, now: number, dt: number, aimMode: "soft" | "full"): void {
    this.crosshair.update(input.aimWorld, input.device, input.aimWorld);
    this.juice.tickHitStop(performance.now());
    if (this.juice.hitStopped) return;
    const ctx = { scene: this.scene, player: this.player };
    this.player.aimAngle = this.aim.update(this.player, input.aimWorld, aimMode);
    this.player.tick(input, now, dt);
    if (input.skill) this.skills.tryActivate(ctx, now);
    this.skills.update(ctx, now, dt);
    this.weapons.update(input, now, dt);
    this.guardians.update(now, dt);
    this.playerBullets.update(now);
    this.enemyBullets.update(now);
  }
}
