import type { SectorId } from "@dh/shared";
import type { DungeonLayout } from "../dungeon/types.ts";

/** Rough sector length: 1.2 min per combat room + 1.5 boss + 0.5 travel. A sanity check, not a rule. */
export function estimateSectorMinutes(layout: DungeonLayout, _sector: SectorId): number {
  const combat = layout.rooms.filter((r) => r.type === "combat").length;
  return combat * 1.2 + 1.5 + 0.5;
}
