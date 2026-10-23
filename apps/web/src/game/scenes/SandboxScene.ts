import { RUNNERS } from "@dh/shared";
import Phaser from "phaser";
import type { RunConfig } from "../bridge/types.ts";
import { isActive } from "../logic/combat/buffs.ts";
import { parseDevParams } from "../logic/devParams.ts";
import { InputSystem } from "../systems/InputSystem.ts";
import { buildPlaceholderRoom } from "../systems/placeholderRoom.ts";
import { RunnerRig } from "../systems/RunnerRig.ts";
import { SceneKey } from "./keys.ts";

const RING = 300;

/** DEV only (`?scene=sandbox`): one room, FPS readout, bullet stress test, input debug. */
export class SandboxScene extends Phaser.Scene {
  private input$!: InputSystem;
  private bullets!: Phaser.Physics.Arcade.Group;
  private info!: Phaser.GameObjects.Text;
  private god = false;
  private rig!: RunnerRig;
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
    this.rig = new RunnerRig(this, RUNNERS[this.runConfig.runnerId], room.walls, {
      x: room.inner.centerX,
      y: room.inner.centerY,
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.input$.reset());
    this.god = parseDevParams(location.search).god ?? false;
    this.bullets = this.physics.add.group({ defaultKey: "ph-bullet-enemy", maxSize: 768 });
    this.info = this.add
      .text(4, 4, "", { fontFamily: "monospace", fontSize: "8px", color: "#a9b8d1" })
      .setDepth(6000)
      .setResolution(4);

    const kb = this.input.keyboard!;
    kb.on("keydown-ONE", () => this.spawnRing());
    kb.on("keydown-TWO", () => this.bullets.getChildren().forEach((b) => this.killBullet(b)));
    kb.on("keydown-G", () => (this.god = !this.god));
  }

  private spawnRing() {
    const { width, height } = this.scale;
    for (let i = 0; i < RING; i++) {
      const b = this.bullets.get(width / 2, height / 2) as Phaser.Physics.Arcade.Image | null;
      if (!b) return;
      const a = (i / RING) * Math.PI * 2;
      b.enableBody(true, width / 2, height / 2, true, true).setDepth(5000);
      b.setVelocity(Math.cos(a) * 60, Math.sin(a) * 60);
    }
  }

  private killBullet(b: Phaser.GameObjects.GameObject) {
    (b as Phaser.Physics.Arcade.Image).disableBody(true, true);
  }

  update(time: number, delta: number) {
    const input = this.input$.read(this.cameras.main, this.rig.player);
    this.rig.update(input, time, delta / 1000, this.runConfig.settings.aimMode);
    if (input.pause) {
      this.scene.launch(SceneKey.Pause, { from: SceneKey.Sandbox });
      this.scene.pause();
    }
    const { width, height } = this.scale;
    for (const b of this.bullets.getChildren() as Phaser.Physics.Arcade.Image[])
      if (b.active && (b.x < -8 || b.y < -8 || b.x > width + 8 || b.y > height + 8))
        this.killBullet(b);

    const m = input.move;
    this.info.setText(
      [
        `FPS ${this.game.loop.actualFps.toFixed(0)}  bullets ${this.bullets.countActive()}  god ${this.god ? "on" : "off"}`,
        "1 ring  2 clear  G god  Esc pause",
        `${input.device} move ${m.x.toFixed(2)},${m.y.toFixed(2)} aim ${input.aimWorld.x.toFixed(0)},${input.aimWorld.y.toFixed(0)}`,
        `fire ${+input.fire} skill ${+input.skill} dash ${+input.dash} swap ${+input.swap} use ${+input.interact} map ${+input.map}`,
        `skill ${(this.rig.skills.cooldown.remaining(time) / 1000).toFixed(1)}s  overcharge ${isActive(this.rig.player.buffs, "overcharge", time) ? "ON" : "-"}  dash ${this.rig.player.dashCharges(time)}`,
      ].join("\n"),
    );
  }
}
