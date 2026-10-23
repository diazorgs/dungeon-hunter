import type { SectorId } from "@dh/shared";

export type Dir = "N" | "E" | "S" | "W";
export type RoomType = "start" | "combat" | "chest" | "vendor" | "log" | "boss";

export interface RoomNode {
  id: number;
  gx: number;
  gy: number;
  type: RoomType;
  doors: Dir[];
  depth: number;
  templateId?: string;
}

export interface DungeonLayout {
  seed: string;
  sector: SectorId;
  rooms: RoomNode[];
  edges: [number, number][];
  attempts: number;
}

export interface GenerateOpts {
  includeVendor?: boolean;
  includeLog?: boolean;
  roomCount?: number;
}

export interface Cell {
  gx: number;
  gy: number;
}

export const GRID = 5;
export const START = { gx: 2, gy: 2 } as const;

export const DIRS: Record<Dir, Cell> = {
  N: { gx: 0, gy: -1 },
  E: { gx: 1, gy: 0 },
  S: { gx: 0, gy: 1 },
  W: { gx: -1, gy: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = { N: "S", E: "W", S: "N", W: "E" };

/** Direction of the step from `a` to the grid-adjacent `b`. */
export function dirBetween(a: Cell, b: Cell): Dir {
  if (b.gx > a.gx) return "E";
  if (b.gx < a.gx) return "W";
  return b.gy > a.gy ? "S" : "N";
}
