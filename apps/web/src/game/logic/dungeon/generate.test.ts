import { createRng, generateSeed } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { generateSector } from "./generate.ts";
import { validateLayout } from "./validate.ts";

test("deterministic", () =>
  expect(generateSector("ABCD1234", 1)).toEqual(generateSector("ABCD1234", 1)));
test("sectors differ for the same seed", () =>
  expect(generateSector("ABCD1234", 1).rooms).not.toEqual(generateSector("ABCD1234", 2).rooms));
test("validateLayout catches a broken door", () => {
  const layout = generateSector("ABCD1234", 1);
  const room = layout.rooms.find((r) => r.doors.length > 0)!;
  room.doors = room.doors.slice(1);
  expect(validateLayout(layout).join(" ")).toMatch(/door/);
});
test("includeVendor false drops the vendor in sector 2", () =>
  expect(
    generateSector("ABCD1234", 2, { includeVendor: false }).rooms.some((r) => r.type === "vendor"),
  ).toBe(false));

test("1000 seeds × 3 sectors are valid, fast and rarely retried", () => {
  const r = createRng("sweep");
  let attempts = 0;
  let layouts = 0;
  const t0 = performance.now();
  for (let i = 0; i < 1000; i++) {
    const seed = generateSeed(() => r.next());
    for (const s of [1, 2, 3] as const) {
      const layout = generateSector(seed, s);
      expect(validateLayout(layout)).toEqual([]);
      attempts += layout.attempts;
      layouts++;
    }
  }
  const msPer = (performance.now() - t0) / layouts;
  console.info(
    `sweep: ${layouts} layouts, mean attempts ${(attempts / layouts).toFixed(2)}, ${msPer.toFixed(3)} ms each`,
  );
  expect(attempts / layouts).toBeLessThan(5);
  expect(msPer).toBeLessThan(5);
});
