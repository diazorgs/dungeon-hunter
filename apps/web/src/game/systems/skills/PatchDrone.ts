import { assistAngle } from "../../logic/combat/aim.ts";
import { distSq } from "@dh/utils";
import { Drone } from "../../entities/Drone.ts";
import type { DroneOpts } from "../../entities/Drone.ts";
import type { Skill, SkillContext } from "./Skill.ts";

const OPTS = { fireRate: 5, damage: 2, range: 120, bulletSpeed: 260 } as const;
const OFFSETS = [
  [16, 0],
  [-16, 0],
  [0, 16],
  [0, -16],
  [16, 16],
  [-16, 16],
  [16, -16],
  [-16, -16],
] as const;

/** Kit: deploys a turret beside the Runner that auto-fires at visible enemies. */
export class PatchDrone implements Skill {
  readonly id = "patch-drone";
  readonly cooldownMs: number;
  private readonly opts: DroneOpts;
  private drone: Drone | null = null;
  private listening = false;

  constructor(cooldownMs: number, durationMs: number) {
    this.cooldownMs = cooldownMs;
    this.opts = { durationMs, ...OPTS };
  }

  activate(ctx: SkillContext, now: number): void {
    const { scene, player, world } = ctx;
    if (!this.listening) {
      this.listening = true;
      // A cleared room, a new sector or a dead boss ends the drone early: no orphan shots.
      for (const e of ["room:cleared", "sector:entered", "boss:dead"])
        scene.events.on(e, () => this.drone?.expire());
    }
    this.drone?.expire();
    const free = OFFSETS.find(([dx, dy]) => !world.aim.isBlocked(player.x + dx, player.y + dy));
    const [dx, dy] = free ?? [0, 0];
    this.drone = new Drone(scene, player.x + dx, player.y + dy, this.opts);
    this.drone.nextShotAt = now;
    scene.events.emit("skill:activated", { id: this.id, x: player.x, y: player.y });
  }

  update({ world }: SkillContext, now: number): void {
    const d = this.drone;
    if (!d?.active) return;
    if (now >= d.expiresAt) {
      d.expire();
      this.drone = null;
      return;
    }
    d.update(now);
    if (now < d.nextShotAt) return;
    const r2 = d.opts.range * d.opts.range;
    const targets = world.aim.visibleFrom(d).filter((t) => distSq(d.x, d.y, t.x, t.y) <= r2);
    if (!targets.some((t) => t.visible)) return;
    d.aim = assistAngle(d, d, targets, d.aim);
    d.nextShotAt = now + 1000 / d.opts.fireRate;
    world.playerBullets.spawn(d.x, d.y, d.aim, d.opts.bulletSpeed, {
      damage: d.opts.damage,
      texture: "ph-bullet-player",
      lifetimeMs: 1000,
    });
    world.audio.play("sfx.pistol", { volume: 0.4 });
  }
}
