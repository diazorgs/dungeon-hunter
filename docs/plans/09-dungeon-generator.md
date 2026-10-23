# 09 · Dungeon Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pure, seeded generator that places 7–9 rooms per sector on a 5×5 grid, assigns room types under the PRD's rules, validates reachability, and regenerates on failure, proven over 1000 seeds.

**Architecture:** `logic/dungeon/` with no Phaser. Input is `(seed, sector, opts)`; output is a `DungeonLayout` graph. Template selection is a separate step (`assignTemplates`) that only needs template metadata, so plan 10 can author templates without touching the generator.

**Tech Stack:** TypeScript, `@dh/utils` RNG, `vp test`.

**Milestone:** M2 · **Depends on:** 02 · **Spec:** `DESIGN.md` §5, §7.3; PRD "Dungeon structure", "Generation rules"

## Global Constraints

- Grid 5×5, Start at (2,2). Random walk places rooms. 7–9 rooms per sector.
- Types: Start 1, Combat 4–6, Chest 1, Vendor 1 (sectors 2–3 only, unless `includeVendor: false`), Log 0–1, Boss 1.
- Boss = farthest by path length, ≥ 4 rooms from Start, exactly one neighbour (dead end). Chest and Vendor never adjacent to Start.
- RNG streams: `fork('layout:s{sector}:a{attempt}')`. Same `(seed, sector, opts)` → identical layout.
- Up to 50 attempts, then throw `GenerationError`.

## Review Focus

- A walk that boxes itself into a corner (no free neighbours) must branch from an earlier room, not stall or loop forever.
- Boss distance ≥ 4 must hold even when the walk is compact; if impossible, the attempt fails and regenerates.
- Log room presence: `0 or 1` must be decided by RNG (≈50%) and forced to 0 when `includeLog: false` (cut order).
- Room counts must sum correctly when Vendor is absent (Sector 1): total still 7–9.
- Two layouts from the same seed in different sectors must differ (stream label includes sector).

## File Structure

```
apps/web/src/game/logic/dungeon/
  types.ts
  walk.ts, walk.test.ts
  assignTypes.ts, assignTypes.test.ts
  validate.ts, validate.test.ts
  generate.ts, generate.test.ts       # includes the 1000-seed sweep
  templates.ts, templates.test.ts     # assignTemplates
```

---

### Task 1: Types and random walk

**Interfaces:**

- Produces (`types.ts`):

```ts
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
export const GRID = 5,
  START = { gx: 2, gy: 2 } as const;
```

- `randomWalk(rng: Rng, roomCount: number): { cells: { gx: number; gy: number }[]; edges: [number, number][] } | null` — tree-shaped (each new cell connects to the cell it grew from); grows from a random existing cell with a free neighbour; returns null if it cannot reach `roomCount`.

- [ ] **Step 1: Tests:** cell 0 is (2,2); all cells inside 0..4; no duplicate cells; `edges.length === cells.length - 1`; every edge joins grid-adjacent cells; same rng label twice → identical output; `roomCount: 25` returns 25 cells or null, never hangs (test timeout 1 s).
- [ ] **Step 2:** `vp test src/game/logic/dungeon` → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): dungeon random walk`.

### Task 2: Room type assignment

**Interfaces:**

- Produces: `assignTypes(rng: Rng, cells, edges, sector: SectorId, opts: GenerateOpts): RoomNode[] | null` — computes BFS depth from Start, sets doors from edges; Boss = max-depth leaf with depth ≥ 4 (ties broken by rng); Chest/Vendor drawn from rooms with depth ≥ 2, excluding Boss; Log from remaining non-start rooms; rest Combat. Returns null if constraints cannot be met (combat count must land in 4–6).
- Room count draw: `roomCount = rng.int(7, 9)` in `generate`; combat = roomCount − (start + boss + chest + vendor? + log?), retry with log 0 if combat would exceed 6, fail attempt if below 4.

- [ ] **Step 1: Tests (fixed hand-built cell sets):** a straight line of 8 cells → boss at the end; a star where all leaves are depth 1 → null; chest never at depth 1; sector 1 has no vendor; sector 2 has exactly one; `includeLog: false` → no log room.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): room type assignment`.

### Task 3: Validation, generate loop and the seed sweep

**Interfaces:**

- Produces:
  - `isReachable(layout): boolean` (BFS from start reaches all rooms)
  - `validateLayout(layout): string[]` (empty = valid; one message per violated rule: count, types, boss depth, boss dead end, chest/vendor adjacency, reachability, door symmetry: A has door to B ⇔ B has door to A)
  - `generateSector(seed: string, sector: SectorId, opts?: GenerateOpts): DungeonLayout`, `class GenerationError extends Error`

- [ ] **Step 1: Tests:**

```ts
test("deterministic", () =>
  expect(generateSector("ABCD1234", 1)).toEqual(generateSector("ABCD1234", 1)));
test("sectors differ for the same seed", () =>
  expect(generateSector("ABCD1234", 1).rooms).not.toEqual(generateSector("ABCD1234", 2).rooms));
test("validateLayout catches a broken door", () => {
  /* remove one side of a door → message mentions 'door' */
});
test("1000 seeds × 3 sectors all valid", () => {
  const r = createRng("sweep");
  for (let i = 0; i < 1000; i++) {
    const seed = generateSeed(() => r.next());
    for (const s of [1, 2, 3] as const) expect(validateLayout(generateSector(seed, s))).toEqual([]);
  }
});
test("average attempts below 5", () => {
  /* record attempts over the sweep; assert mean < 5 so generation stays fast */
});
```

- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS (sweep under 3 s).
- [ ] **Step 5:** Commit `feat(logic): sector generation with validation and seed sweep`.

### Task 4: Template assignment

**Interfaces:**

- Produces:
  - `interface TemplateMeta { id: string; roomType: RoomType; sectors: SectorId[]; doors: Dir[] /* doors the template supports; all 4 for combat */ }`
  - `assignTemplates(layout: DungeonLayout, catalog: readonly TemplateMeta[], rng: Rng): DungeonLayout` — picks a template per room matching type, sector, and a superset of required doors; avoids repeating a combat template within a sector when the catalog allows; throws listing the room if nothing matches.

- [ ] **Step 1: Tests:** with 5 combat templates and 6 combat rooms, at most one template repeats; a boss room needing door `W` never gets a template supporting only `E`; missing catalog entry throws mentioning the room type and sector.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS. **Step 5:** Commit `feat(logic): template assignment`.

## Acceptance (M2 gate, generator half)

- [ ] 1000 seeds × 3 sectors pass `validateLayout` (PRD asks for 100).
- [ ] Generation of one sector takes < 5 ms on average (log in the sweep test).
