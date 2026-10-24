import { expect, test } from "vite-plus/test";
import { CARDS, LOGS, RADIO } from "./content.ts";
import { RADIO_BEATS } from "./schemas/content.ts";

test.each(RADIO_BEATS.filter((b) => b !== "intro"))("beat %s has at least one line", (beat) =>
  expect(RADIO.some((l) => l.beat === beat)).toBe(true),
);
test("radio lines are short enough for the radio box", () => {
  for (const l of RADIO) {
    expect(l.text.length).toBeLessThanOrEqual(70);
    expect(l.durationMs).toBeGreaterThanOrEqual(1500);
    expect(l.durationMs).toBeLessThanOrEqual(4500);
  }
});
test("fixed PRD strings appear verbatim", () => {
  const texts = RADIO.map((l) => l.text);
  expect(texts).toContain("INTRUDER DETECTED.");
  expect(texts).toContain("INTRUDER. SECTOR SEALED.");
});
test("3 logs per sector with 2-4 lines", () => {
  for (const s of [1, 2, 3])
    expect(Object.values(LOGS).filter((l) => l.sector === s)).toHaveLength(3);
  for (const l of Object.values(LOGS)) expect(l.lines.length).toBeGreaterThanOrEqual(2);
});
test("4 intro cards and an ending", () => {
  expect(CARDS.intro).toHaveLength(4);
  expect(CARDS.ending.length).toBeGreaterThan(0);
});
