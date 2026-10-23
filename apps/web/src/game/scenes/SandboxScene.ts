import { GUARDIAN_IDS, RUNNERS, WEAPON_IDS } from "@dh/shared";
import type { GuardianId, WeaponId } from "@dh/shared";
import Phaser from "phaser";
import type { RunConfig } from "../bridge/types.ts";
import { isActive } from "../logic/combat/buffs.ts";
import { parseDevParams } from "../logic/devParams.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { buildPlaceholderRoom } from "../systems/placeholderRoom.ts";
import { CombatWorld } from "../systems/CombatWorld.ts";
import { SceneKey } from "./keys.ts";

const RING = 300;

/** DEV only (`?scene=sandbox`): one room, FPS readout, bullet stress test, input debug. */
export class SandboxScene extends Phaser.Scene {
  private input$!: InputSystem;
  private info!: Phaser.GameObjects.Text;
  private world!: CombatWorld;
  private runConfig!: RunConfig;

  constructor() {
    super(SceneKey.Sandbox);
  }

  create() {
    this.cameras.main.setRoundPixels(true);
    this.runConfig = this.registry.get("runConfig") as RunConfig;
    const room = buildPlaceholderRoom(this, 15, 11);
    // An inner pillar to test wall collision and line of sight.
    room.walls.create(room.inner.centerX + 48, room.inner.centerY, "ph-wall").setDepth(10);
    this.input$ = new InputSystem(this);
    this.world = new CombatWorld(
      this,
      RUNNERS[this.runConfig.runnerId],
      this.runConfig.settings,
      room.walls,
      {
        x: room.inner.centerX,
        y: room.inner.centerY,
      },
      room.blocked,
    );
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.input$.reset());
    this.world.player.god = parseDevParams(location.search).god ?? false;
    const spawn = parseDevParams(location.search).spawn ?? [];
    spawn
      .filter((id): id is WeaponId => (WEAPON_IDS as readonly string[]).includes(id))
      .forEach((id, i) =>
        this.world.weapons.dropOnFloor(id, room.inner.x + 24 + i * 24, room.inner.bottom - 16),
      );
    spawn
      .filter((id): id is GuardianId => (GUARDIAN_IDS as readonly string[]).includes(id))
      .forEach((id, i) =>
        this.world.guardians.spawn(id, room.inner.right - 24, room.inner.y + 24 + i * 20),
      );
    const rand = () => ({
      x: Phaser.Math.Between(room.inner.x + 8, room.inner.right - 8),
      y: Phaser.Math.Between(room.inner.y + 8, room.inner.bottom - 8),
    });
    this.input.keyboard!.on("keydown-THREE", () => {
      const p = rand();
      this.world.guardians.spawn("crawler", p.x, p.y);
    });
    this.input.keyboard!.on("keydown-FOUR", () => {
      const p = rand();
      this.world.guardians.spawn("sentry-drone", p.x, p.y);
    });
    this.info = this.add
      .text(4, 4, "", { fontFamily: "monospace", fontSize: "8px", color: "#a9b8d1" })
      .setDepth(6000)
      .setResolution(4);

    const kb = this.input.keyboard!;
    kb.on("keydown-ONE", () => this.spawnRing());
    kb.on("keydown-TWO", () => this.world.enemyBullets.clear());
    kb.on("keydown-G", () => (this.world.player.god = !this.world.player.god));
  }

  private spawnRing() {
    const { x, y } = this.world.player;
    // Lifetime long enough to cross the screen; walls stop most of them anyway.
    for (let i = 0; i < RING; i++)
      this.world.enemyBullets.spawn(x, y, (i / RING) * Math.PI * 2, 60, {
        damage: 1,
        texture: "ph-bullet-enemy",
        lifetimeMs: 8000,
      });
  }

  update(time: number, delta: number) {
    const input = this.input$.read(this.cameras.main, this.world.player);
    this.world.update(input, time, delta / 1000, this.runConfig.settings.aimMode);
    if (input.pause) {
      this.scene.launch(SceneKey.Pause, { from: SceneKey.Sandbox });
      this.scene.pause();
    }
    const m = input.move;
    this.info.setText(
      [
        `FPS ${this.game.loop.actualFps.toFixed(0)}  bullets ${this.world.enemyBullets.activeCount() + this.world.playerBullets.activeCount()}  god ${this.world.player.god ? "on" : "off"}  guardians ${this.world.guardians.aliveCount()}  HP ${this.world.player.combat.hp} SH ${this.world.player.combat.shield}`,
        `1 ring  2 clear  3 crawler  4 drone  G god  Esc pause  E pick up  ${this.world.weapons.loadout.slots.join("/")} [${this.world.weapons.loadout.active}] EN ${this.world.player.combat.energy}`,
        `${input.device} move ${m.x.toFixed(2)},${m.y.toFixed(2)} aim ${input.aimWorld.x.toFixed(0)},${input.aimWorld.y.toFixed(0)}`,
        `fire ${+input.fire} skill ${+input.skill} dash ${+input.dash} swap ${+input.swap} use ${+input.interact} map ${+input.map}`,
        `skill ${(this.world.skills.cooldown.remaining(time) / 1000).toFixed(1)}s  overcharge ${isActive(this.world.player.buffs, "overcharge", time) ? "ON" : "-"}  dash ${this.world.player.dashCharges(time)}`,
      ].join("\n"),
    );
  }
}
