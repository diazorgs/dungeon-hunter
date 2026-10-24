import { RUNNER_IDS } from "@dh/shared";
import type { RunnerId } from "@dh/shared";
import { isValidSeed } from "@dh/utils";

export interface DevParams {
  scene?: "sandbox";
  seed?: string;
  sector?: 1 | 2 | 3;
  room?: string;
  god?: boolean;
  spawn?: string[];
  runner?: RunnerId;
}

/** Parses `?scene=sandbox&seed=…` dev overrides; invalid values are dropped. */
export function parseDevParams(search: string): DevParams {
  const q = new URLSearchParams(search);
  const out: DevParams = {};
  if (q.get("scene") === "sandbox") out.scene = "sandbox";
  const seed = q.get("seed");
  if (seed && isValidSeed(seed)) out.seed = seed;
  const sector = Number(q.get("sector"));
  if (sector === 1 || sector === 2 || sector === 3) out.sector = sector;
  const room = q.get("room");
  if (room) out.room = room;
  const god = q.get("god");
  if (god === "1" || god === "true") out.god = true;
  const spawn = q.get("spawn")?.split(",").filter(Boolean);
  if (spawn?.length) out.spawn = spawn;
  const runner = RUNNER_IDS.find((id) => id === q.get("runner"));
  if (runner) out.runner = runner;
  return out;
}
