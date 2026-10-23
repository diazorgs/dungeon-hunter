import { createRng } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { assignTemplates } from "./templates.ts";
import type { TemplateMeta } from "./templates.ts";
import type { DungeonLayout, RoomNode } from "./types.ts";

const ALL = ["N", "E", "S", "W"] as const;
const room = (
  id: number,
  type: RoomNode["type"],
  doors: RoomNode["doors"] = [...ALL],
): RoomNode => ({
  id,
  gx: 0,
  gy: 0,
  type,
  doors,
  depth: id,
});
const layout = (rooms: RoomNode[]): DungeonLayout => ({
  seed: "S",
  sector: 1,
  rooms,
  edges: [],
  attempts: 1,
});
const t = (
  id: string,
  roomType: TemplateMeta["roomType"],
  doors: TemplateMeta["doors"] = [...ALL],
): TemplateMeta => ({
  id,
  roomType,
  sectors: [1],
  doors,
});

test("at most one combat template repeats with 5 templates for 6 rooms", () => {
  const catalog = [1, 2, 3, 4, 5].map((i) => t(`c${i}`, "combat"));
  const out = assignTemplates(
    layout([1, 2, 3, 4, 5, 6].map((i) => room(i, "combat"))),
    catalog,
    createRng("t"),
  );
  expect(new Set(out.rooms.map((r) => r.templateId)).size).toBe(5);
});
test("door support is respected", () => {
  const out = assignTemplates(
    layout([room(0, "boss", ["W"])]),
    [t("east-only", "boss", ["E"]), t("west", "boss", ["W"])],
    createRng("d"),
  );
  expect(out.rooms[0]!.templateId).toBe("west");
});
test("missing template throws naming the room type and sector", () =>
  expect(() => assignTemplates(layout([room(0, "vendor")]), [], createRng("m"))).toThrow(
    /vendor.*sector 1/,
  ));
