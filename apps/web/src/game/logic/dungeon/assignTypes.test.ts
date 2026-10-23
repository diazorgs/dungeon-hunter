import { createRng } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { assignTypes } from "./assignTypes.ts";
import type { Cell } from "./types.ts";

// Straight line east from Start then wrapping south: 8 cells, depths 0..7.
const line: Cell[] = [
  { gx: 2, gy: 2 },
  { gx: 3, gy: 2 },
  { gx: 4, gy: 2 },
  { gx: 4, gy: 3 },
  { gx: 4, gy: 4 },
  { gx: 3, gy: 4 },
  { gx: 2, gy: 4 },
  { gx: 1, gy: 4 },
];
const lineEdges = line.slice(1).map((_, i) => [i, i + 1] as [number, number]);

test("boss is the far end of a line", () => {
  const rooms = assignTypes(createRng("a"), line, lineEdges, 1, {})!;
  expect(rooms[7]!.type).toBe("boss");
  expect(rooms[7]!.doors).toEqual(["E"]);
});
test("a star with only depth-1 leaves fails", () => {
  const star: Cell[] = [
    { gx: 2, gy: 2 },
    { gx: 2, gy: 1 },
    { gx: 3, gy: 2 },
    { gx: 2, gy: 3 },
    { gx: 1, gy: 2 },
  ];
  expect(
    assignTypes(
      createRng("s"),
      star,
      [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
      ],
      1,
      {},
    ),
  ).toBeNull();
});
test("chest never adjacent to start; vendor only from sector 2", () => {
  for (let i = 0; i < 50; i++) {
    const s1 = assignTypes(createRng(`x${i}`), line, lineEdges, 1, {})!;
    expect(s1.find((r) => r.type === "chest")!.depth).toBeGreaterThanOrEqual(2);
    expect(s1.some((r) => r.type === "vendor")).toBe(false);
    const s2 = assignTypes(createRng(`x${i}`), line, lineEdges, 2, {})!;
    expect(s2.filter((r) => r.type === "vendor")).toHaveLength(1);
  }
});
test("includeLog false never makes a log room", () => {
  for (let i = 0; i < 50; i++)
    expect(
      assignTypes(createRng(`l${i}`), line, lineEdges, 1, { includeLog: false })!.some(
        (r) => r.type === "log",
      ),
    ).toBe(false);
});
