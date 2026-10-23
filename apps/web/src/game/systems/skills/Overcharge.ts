import { addBuff } from "../../logic/combat/buffs.ts";
import type { Skill, SkillContext } from "./Skill.ts";

/** Vex: double fire rate and free shots for the duration. */
export class Overcharge implements Skill {
  readonly id = "overcharge";
  readonly cooldownMs: number;
  private readonly durationMs: number;

  constructor(cooldownMs: number, durationMs: number) {
    this.cooldownMs = cooldownMs;
    this.durationMs = durationMs;
  }

  activate({ scene, player }: SkillContext, now: number): void {
    addBuff(player.buffs, "overcharge", now, this.durationMs);
    scene.events.emit("skill:activated", this.id);
  }
}
