import type { Runner } from "@dh/shared";
import { Cooldown } from "../logic/combat/cooldown.ts";
import { Overcharge } from "./skills/Overcharge.ts";
import type { Skill, SkillContext } from "./skills/Skill.ts";

export function createSkill(runner: Runner): Skill {
  const { id, cooldownSec, durationSec } = runner.skill;
  switch (id) {
    case "overcharge":
      return new Overcharge(cooldownSec * 1000, durationSec * 1000);
    case "patch-drone":
      throw new Error("patch-drone: not implemented until plan 23");
  }
}

export class SkillSystem {
  readonly skill: Skill;
  readonly cooldown: Cooldown;

  constructor(skill: Skill) {
    this.skill = skill;
    this.cooldown = new Cooldown(skill.cooldownMs);
  }

  /** Does nothing while paused or on cooldown. */
  tryActivate(ctx: SkillContext, now: number): boolean {
    if (ctx.scene.scene.isPaused() || !this.cooldown.trigger(now)) return false;
    this.skill.activate(ctx, now);
    return true;
  }

  update(ctx: SkillContext, now: number, dt: number): void {
    this.skill.update?.(ctx, now, dt);
  }
}
