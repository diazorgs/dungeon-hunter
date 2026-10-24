import { createRng, degToRad } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { phaseIndex } from "./phases.ts";
import { ring, spiralStep, spread } from "./patterns.ts";
import { AttackScheduler } from "./schedule.ts";
import type { AttackStep } from "./schedule.ts";

const close = (a: number[], b: number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i]!));

test("ring", () => {
  close(ring(4), [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]);
  close(ring(4, Math.PI / 4), [
    Math.PI / 4,
    (3 * Math.PI) / 4,
    (5 * Math.PI) / 4,
    (7 * Math.PI) / 4,
  ]);
});
test("spread", () => {
  close(spread(0, 3, 30), [degToRad(-15), 0, degToRad(15)]);
  expect(spread(1.2, 1, 40)).toEqual([1.2]);
});
test("spiral step is a rotated ring", () => close(spiralStep(3, 1, 10), ring(3, degToRad(10))));

test("phase index", () => {
  expect(phaseIndex(0.5, [0.5])).toBe(1);
  expect(phaseIndex(0.51, [0.5])).toBe(0);
  expect(phaseIndex(0.2, [0.66, 0.33])).toBe(2);
});

const A: AttackStep = { id: "a", telegraphMs: 100, runMs: 200, recoverMs: 50, weight: 1 };
const B: AttackStep = { id: "b", telegraphMs: 100, runMs: 200, recoverMs: 50, weight: 1 };

test("stages advance at exact boundaries", () => {
  const s = new AttackScheduler(createRng("s"));
  s.setPhase([A]);
  expect(s.update(0)).toMatchObject({ stage: "telegraph", changed: true });
  expect(s.update(99).stage).toBe("telegraph");
  expect(s.update(100)).toMatchObject({ stage: "run", enteredAt: 100, changed: true });
  expect(s.update(300)).toMatchObject({ stage: "recover", enteredAt: 300 });
  expect(s.update(350)).toMatchObject({ stage: "telegraph", enteredAt: 350 });
});
test("phase change applies after the current step", () => {
  const s = new AttackScheduler(createRng("p"));
  s.setPhase([A]);
  s.update(0);
  s.setPhase([B]);
  expect(s.update(200).step.id).toBe("a");
  expect(s.update(350).step.id).toBe("b");
});
test("no step three times in a row", () => {
  const s = new AttackScheduler(createRng("r"));
  s.setPhase([A, B]);
  const ids: string[] = [];
  for (let t = 0; ids.length < 1000; t += 350) ids.push(s.update(t).step.id);
  for (let i = 2; i < ids.length; i++)
    expect(ids[i] === ids[i - 1] && ids[i] === ids[i - 2]).toBe(false);
});
test("endStageEarly moves run to recover", () => {
  const s = new AttackScheduler(createRng("e"));
  s.setPhase([A]);
  s.update(0);
  s.update(150);
  s.endStageEarly(160);
  expect(s.update(160)).toMatchObject({ stage: "recover", enteredAt: 160 });
});

test("cancel drops the current step and applies a pending phase", () => {
  const s = new AttackScheduler(createRng("c"));
  s.setPhase([A]);
  s.update(0);
  s.setPhase([B]);
  s.cancel();
  expect(s.update(10)).toMatchObject({ step: { id: "b" }, stage: "telegraph", enteredAt: 10 });
});

test("a newer phase set after cancel beats an older pending one", () => {
  const s = new AttackScheduler(createRng("n"));
  const C: AttackStep = { ...A, id: "c" };
  s.setPhase([A]);
  s.update(0);
  s.setPhase([B]);
  s.cancel();
  s.setPhase([C]);
  expect(s.update(10).step.id).toBe("c");
});
