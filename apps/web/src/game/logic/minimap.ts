import type { Dir, DungeonLayout, RoomType } from "./dungeon/types.ts";

export type MinimapIcon = "chest" | "vendor" | "boss" | "log";

export interface MinimapCell {
  roomId: number;
  gx: number;
  gy: number;
  state: "current" | "visited" | "known";
  icon: MinimapIcon | null;
  doors: Dir[];
}

const ICONS: Partial<Record<RoomType, MinimapIcon>> = {
  chest: "chest",
  vendor: "vendor",
  boss: "boss",
  log: "log",
};

/** Fog of war: visited rooms plus their direct neighbours (seen through open doors). */
export function minimapCells(
  layout: DungeonLayout,
  visited: ReadonlySet<number>,
  current: number | null,
): MinimapCell[] {
  const known = new Set<number>(visited);
  for (const [a, b] of layout.edges) {
    if (visited.has(a)) known.add(b);
    if (visited.has(b)) known.add(a);
  }
  return layout.rooms
    .filter((r) => known.has(r.id))
    .map((r) => ({
      roomId: r.id,
      gx: r.gx,
      gy: r.gy,
      state: r.id === current ? "current" : visited.has(r.id) ? "visited" : "known",
      icon: ICONS[r.type] ?? null,
      doors: r.doors,
    }));
}
