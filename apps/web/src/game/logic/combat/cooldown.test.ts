import { expect, test } from "vite-plus/test";
import { ChargePool, Cooldown } from "./cooldown.ts";

test("cooldown timing and progress", () => {
  const c = new Cooldown(20_000);
  expect(c.trigger(0)).toBe(true);
  expect(c.ready(19_999)).toBe(false);
  expect(c.trigger(19_999)).toBe(false);
  expect(c.ready(20_000)).toBe(true);
  expect(c.progress(10_000)).toBe(0.5);
  c.reset();
  expect(c.ready(1)).toBe(true);
});
test("charge pool recharges sequentially", () => {
  const p = new ChargePool(2, 600);
  expect(p.use(0)).toBe(true);
  expect(p.use(0)).toBe(true);
  expect(p.use(0)).toBe(false);
  expect(p.charges(599)).toBe(0);
  expect(p.charges(600)).toBe(1);
  expect(p.charges(1200)).toBe(2);
});
test("charge pool setMax adds a ready charge", () => {
  const p = new ChargePool(1, 600);
  p.use(0);
  p.setMax(2);
  expect(p.charges(0)).toBe(1);
});
