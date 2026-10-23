import type { SectorId } from "@dh/shared";
import { createRng } from "@dh/utils";
import { assignTypes, hasVendor } from "./assignTypes.ts";
import type { DungeonLayout, GenerateOpts } from "./types.ts";
import { validateLayout } from "./validate.ts";
import { randomWalk } from "./walk.ts";

const MAX_ATTEMPTS = 50;

export class GenerationError extends Error {
  override name = "GenerationError";
}

/** Deterministic sector layout for `(seed, sector, opts)`; regenerates up to 50 times. */
export function generateSector(
  seed: string,
  sector: SectorId,
  opts: GenerateOpts = {},
): DungeonLayout {
  const root = createRng(seed);
  // Start + boss + chest + 4 combat, plus the vendor when present.
  const minRooms = 7 + (hasVendor(sector, opts) ? 1 : 0);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = root.fork(`layout:s${sector}:a${attempt}`);
    const walk = randomWalk(rng, opts.roomCount ?? rng.int(minRooms, 9));
    if (!walk) continue;
    const rooms = assignTypes(rng, walk.cells, walk.edges, sector, opts);
    if (!rooms) continue;
    const layout: DungeonLayout = { seed, sector, rooms, edges: walk.edges, attempts: attempt + 1 };
    if (validateLayout(layout).length === 0) return layout;
  }
  throw new GenerationError(
    `No valid layout for seed ${seed} sector ${sector} in ${MAX_ATTEMPTS} attempts`,
  );
}
