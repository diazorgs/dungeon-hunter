import { LOGS } from "@dh/shared";
import { createRng } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { BeatLog, beatForEvent } from "./beats.ts";
import { degradeText } from "./degrade.ts";
import { pickLogForRoom } from "./logs.ts";

test("beatForEvent maps scene events to beats", () => {
  expect(beatForEvent({ type: "sector:entered", sector: 1 })).toBe("s1-enter");
  expect(beatForEvent({ type: "room:entered", roomType: "boss", sector: 3 })).toBe("core-chamber");
  expect(beatForEvent({ type: "room:entered", roomType: "boss", sector: 1 })).toBeNull();
  expect(beatForEvent({ type: "boss:dead", id: "gatekeeper" })).toBe("gatekeeper-dead");
  expect(beatForEvent({ type: "run:death" })).toBe("death");
});
test("BeatLog fires each beat once", () => {
  const log = new BeatLog();
  expect(log.fire("s1-enter")).toBe(true);
  expect(log.fire("s1-enter")).toBe(false);
});

const line = "Core Approach. Your signal is breaking up, Runner.";
test("degradeText level 0 is the identity", () =>
  expect(degradeText(line, 0, createRng("x"))).toBe(line));
test("degradeText level 2 keeps the first word and corrupts at most 25%", () => {
  const out = degradeText(line, 2, createRng("x"));
  expect(out.startsWith("Core ")).toBe(true);
  const nonSpace = line.split("").filter((c) => c !== " ").length;
  const changed = line.split("").filter((c, i) => out[i] !== c).length;
  expect(changed).toBeGreaterThan(0);
  expect(changed).toBeLessThanOrEqual(nonSpace * 0.25);
  expect(degradeText(line, 2, createRng("x"))).toBe(out);
});

const rng = () => createRng("logs");
test("pickLogForRoom prefers uncollected logs of the sector", () => {
  expect(LOGS[pickLogForRoom(1, [], [], rng())].sector).toBe(1);
  expect(pickLogForRoom(1, ["s1-log-1", "s1-log-2"], [], rng())).toBe("s1-log-3");
});
test("pickLogForRoom falls back to any log of that sector, never another sector", () => {
  for (let i = 0; i < 20; i++) {
    const id = pickLogForRoom(2, ["s2-log-1", "s2-log-2", "s2-log-3"], [], createRng(`r${i}`));
    expect(LOGS[id].sector).toBe(2);
  }
  expect(
    pickLogForRoom(3, ["s3-log-1", "s3-log-2", "s3-log-3"], ["s3-log-1", "s3-log-2"], rng()),
  ).toBe("s3-log-3");
});
