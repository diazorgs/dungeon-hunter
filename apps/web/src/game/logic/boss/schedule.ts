import type { Rng } from "@dh/utils";

export interface AttackStep {
  id: string;
  telegraphMs: number;
  runMs: number;
  recoverMs: number;
  weight: number;
}

export type Stage = "telegraph" | "run" | "recover";

export interface ScheduleState {
  step: AttackStep;
  stage: Stage;
  enteredAt: number;
  /** True on the update that entered this stage. */
  changed: boolean;
}

/** Weighted telegraph → run → recover loop; a phase change waits for the current step to finish. */
export class AttackScheduler {
  private readonly rng: Rng;
  private steps: readonly AttackStep[] = [];
  private pending: readonly AttackStep[] | null = null;
  private current: { step: AttackStep; stage: Stage; enteredAt: number } | null = null;
  private history: string[] = [];

  constructor(rng: Rng) {
    this.rng = rng;
  }

  setPhase(steps: readonly AttackStep[]): void {
    if (this.current) this.pending = steps;
    else this.steps = steps;
  }

  update(now: number): ScheduleState {
    let changed = false;
    if (!this.current) {
      this.begin(now);
      changed = true;
    }
    // Advance through every boundary we passed (one long frame can cross several).
    for (let c = this.current!; ; c = this.current!) {
      const dur =
        c.stage === "telegraph"
          ? c.step.telegraphMs
          : c.stage === "run"
            ? c.step.runMs
            : c.step.recoverMs;
      if (now < c.enteredAt + dur) break;
      const at = c.enteredAt + dur;
      if (c.stage === "telegraph") this.current = { ...c, stage: "run", enteredAt: at };
      else if (c.stage === "run") this.current = { ...c, stage: "recover", enteredAt: at };
      else this.begin(at);
      changed = true;
    }
    return { ...this.current!, changed };
  }

  /** E.g. a charge hit a wall: run → recover now. */
  endStageEarly(now: number): void {
    if (this.current?.stage === "run")
      this.current = { ...this.current, stage: "recover", enteredAt: now };
  }

  private begin(now: number): void {
    if (this.pending) {
      this.steps = this.pending;
      this.pending = null;
    }
    if (this.steps.length === 0) throw new Error("AttackScheduler: no steps for this phase");
    // Never the same step three times in a row when there is an alternative.
    const [a, b] = this.history.slice(-2);
    const options =
      a !== undefined && a === b && this.steps.length > 1
        ? this.steps.filter((s) => s.id !== a)
        : this.steps;
    const step = this.rng.weighted(options.map((s) => ({ item: s, weight: s.weight })));
    this.history.push(step.id);
    if (this.history.length > 2) this.history.shift();
    this.current = { step, stage: "telegraph", enteredAt: now };
  }
}
