export interface StateDef<S extends string, C> {
  enter?(c: C, now: number): void;
  /** Return the next state to transition, or nothing to stay. */
  update(c: C, now: number, dt: number): S | void;
  exit?(c: C): void;
}

export interface Fsm<S extends string, C> {
  state: S;
  enteredAt: number;
  update(c: C, now: number, dt: number): void;
  force(s: S, c: C, now: number): void;
}

export function createFsm<S extends string, C>(def: {
  initial: S;
  states: Record<S, StateDef<S, C>>;
}): Fsm<S, C> {
  const fsm: Fsm<S, C> = {
    state: def.initial,
    enteredAt: 0,
    update(c, now, dt) {
      const next = def.states[fsm.state].update(c, now, dt);
      if (next && next !== fsm.state) fsm.force(next, c, now);
    },
    force(s, c, now) {
      def.states[fsm.state].exit?.(c);
      fsm.state = s;
      fsm.enteredAt = now;
      def.states[s].enter?.(c, now);
    },
  };
  return fsm;
}
