import { expect, test } from "vite-plus/test";
import { createRateLimiter, jitterRate, scaledShake, shouldReplaceShake } from "./juice.ts";

const w = { shake: { intensity: 0.004, durationMs: 60 } };

test("shake setting 0 disables, 0.5 halves", () => {
  expect(scaledShake(w, 0)).toBeNull();
  expect(scaledShake(w, 0.5)?.intensity).toBe(0.002);
});
test("weaker shake waits for the stronger one to end", () => {
  const cur = { intensity: 0.006, endsAt: 100 };
  expect(shouldReplaceShake(cur, { intensity: 0.002 }, 50)).toBe(false);
  expect(shouldReplaceShake(cur, { intensity: 0.01 }, 50)).toBe(true);
  expect(shouldReplaceShake(cur, { intensity: 0.002 }, 100)).toBe(true);
});
test("rate limiter", () => {
  const ok = createRateLimiter(120);
  expect([ok(0), ok(119), ok(120)]).toEqual([true, false, true]);
});
test("jitter stays within ±5%", () => {
  expect(jitterRate(() => 0)).toBeCloseTo(0.95);
  expect(jitterRate(() => 1 - 1e-9)).toBeLessThan(1.05);
});
