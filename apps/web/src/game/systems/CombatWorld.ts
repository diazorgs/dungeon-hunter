import { PALETTE } from "@dh/shared";
import type { Runner, Settings } from "@dh/shared";
import type Phaser from "phaser";
import { Player } from "../entities/Player.ts";
import type { InputState, Vec2 } from "../logic/input.ts";
import { AimAssist } from "./AimAssist.ts";
import { AudioSystem } from "./AudioSystem.ts";
import { DamageNumbers } from "./DamageNumbers.ts";
import { JuiceSystem } from "./JuiceSystem.ts";
import { BossSystem } from "./BossSystem.ts";
import { BulletPool } from "./BulletPool.ts";
import { GuardianSystem } from "./GuardianSystem.ts";
import { HazardSystem } from "./HazardSystem.ts";
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
  readonly hazards: HazardSystem;
  readonly audio: AudioSystem;
  readonly juice: JuiceSystem;
  readonly bosses: BossSystem;
  readonly walls: Phaser.Types.Physics.Arcade.ArcadeColliderType;
  private readonly scene: Phaser.Scene;
  private readonly shadows: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    runner: Runner,
    settings: Settings,
    walls: Phaser.Types.Physics.Arcade.ArcadeColliderType,
    at: Vec2,
    blocked: (x: number, y: number) => boolean,
  ) {
    this.scene = scene;
    this.walls = walls;
    this.player = new Player(scene, at.x, at.y, runner);
    this.skills = new SkillSystem(createSkill(runner));
    this.playerBullets = new BulletPool(scene, "player", 512);
    this.enemyBullets = new BulletPool(scene, "enemy", 768);
    this.weapons = new WeaponSystem(scene, this.player, this.playerBullets, {
      all: () => [
        ...this.guardians.alive().map((g) => GuardianSystem.asTarget(g)),
        ...this.bosses.targets(),
      ],
      enemyBullets: this.enemyBullets,
      blocked,
    });
    this.hazards = new HazardSystem(scene, this.player);
    this.guardians = new GuardianSystem(
      scene,
      this.player,
      { player: this.playerBullets, enemy: this.enemyBullets },
      walls,
      blocked,
      this.hazards,
    );
    this.aim.setBlocked(blocked);
    this.aim.setTargetsProvider(() => [
      ...this.guardians.targets(),
      ...this.bosses.targets().map((t) => ({ id: t.id, x: t.x, y: t.y, visible: true })),
    ]);
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
    // Above floor and decor (10), below every actor (y + 1000).
    this.shadows = scene.add.graphics().setDepth(11);
    this.bosses = new BossSystem(scene, this);
  }

  update(input: InputState, now: number, dt: number): void {
    this.juice.tickHitStop(performance.now());
    if (this.juice.hitStopped) return;
    const ctx = { scene: this.scene, player: this.player, world: this };
    this.player.aimAngle = this.aim.update(this.player, input.aimWorld);
    this.player.tick(input, now, dt);
    if (input.skill) this.skills.tryActivate(ctx, now);
    this.skills.update(ctx, now, dt);
    this.weapons.update(input, now, dt);
    this.guardians.update(now, dt);
    this.bosses.update(now, dt);
    this.hazards.update(now);
    this.playerBullets.update(now);
    this.enemyBullets.update(now);
    this.drawShadows();
  }

  /** 3/4 view: a soft ellipse at each actor's feet grounds it on the floor. */
  private drawShadows(): void {
    const g = this.shadows.clear().fillStyle(PALETTE.ink, 0.45);
    const actors: Phaser.GameObjects.Sprite[] = [this.player, ...this.guardians.alive()];
    if (this.bosses.boss) actors.push(this.bosses.boss);
    for (const a of actors)
      if (a.active && a.visible)
        g.fillEllipse(a.x, a.y + a.displayHeight / 2 - 1, a.displayWidth * 0.75, 4);
  }
}
