# 02 · Shared Contracts and Game Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build everything both the game and the API read: the seeded RNG, Zod schemas and JSON for all MVP content, the API payload schemas, and the pure rules for payout, run validation and the Armory catalog.

**Architecture:** `@dh/utils` holds framework-free math and RNG. `@dh/shared` holds `schemas/` (Zod), `data/` (JSON, validated in tests), `rules/` (pure functions) and `palette.ts`. ID sets are `as const` tuples so IDs are literal unions everywhere.

**Tech Stack:** TypeScript, Zod 4, `vp test`.

**Milestone:** M0 (finish before M1 gameplay) · **Depends on:** 01 · **Spec:** `DESIGN.md` §5.1, §6, §7, §9.1, §11.2; PRD "Runners", "Weapons and Vault Mods", "Guardians", "Economy", "Anti-cheat rules"

## Global Constraints

- Zod 4 API (`z.object`, `z.enum`, `z.discriminatedUnion`, `z.infer`). Same Zod version in every package (catalog).
- JSON imported with `with { type: 'json' }`.
- PRD numbers are copied verbatim; numbers the PRD leaves open use the starting values in this plan and are marked `// tune` nowhere in code (they live in JSON only).
- No I/O in `@dh/shared`. No `Math.random()` in `@dh/utils/rng.ts`.

## Review Focus

- Empty seed string or non-ASCII seed must still produce a deterministic RNG (hash handles any string).
- `rng.int(min, max)` with `min === max` returns `min`; with `min > max` throws.
- `validateRun` for a death in Sector 1 with 0 rooms and 0 s must be accepted (a quick death is legal) and pay 0 shards.
- `logsFound` with duplicates must be rejected, not double-counted.
- A run that kills the Warden (`bossesKilled: 3`) but reports `victory: false` (died during shutdown?) must be rejected as inconsistent; victory is derived from the Warden kill.

## File Structure

```
packages/utils/src/   rng.ts, rng.test.ts, math.ts, math.test.ts, seed.ts, seed.test.ts, index.ts
packages/shared/src/
  schemas/  ids.ts, content.ts, settings.ts, api.ts, run.ts, index.ts
  data/     runners.json, weapons.json, guardians.json, bosses.json, mods.json, armory.json,
            radio.json (stub: 1 line), logs.json (stub: 9 placeholders)
  rules/    payout.ts, validateRun.ts, catalog.ts, *.test.ts
  content.ts       # parsed, typed exports: RUNNERS, WEAPONS, GUARDIANS, BOSSES, MODS, ARMORY, RADIO, LOGS
  content.test.ts
  palette.ts
  index.ts
```

---

### Task 1: Seeded RNG, seeds and math helpers (`@dh/utils`)

**Interfaces:**

- Produces:
  - `createRng(seed: string): Rng` where `Rng = { next(): number; int(min: number, maxInclusive: number): number; pick<T>(arr: readonly T[]): T; weighted<T>(entries: readonly { item: T; weight: number }[]): T; shuffle<T>(arr: readonly T[]): T[]; chance(p: number): boolean; fork(label: string): Rng }`
  - `generateSeed(random?: () => number): string` (8 chars, Crockford base32), `isValidSeed(s: string): boolean`, `SEED_REGEX = /^[0-9A-HJKMNP-TV-Z]{8}$/`
  - `clamp`, `lerp`, `angleBetween(ax, ay, bx, by)`, `angleDiff(a, b)` (signed, in (-π, π]), `rotateToward(from, to, maxStep)`, `distSq`, `degToRad`, `radToDeg`

- [ ] **Step 1: Write failing tests** `rng.test.ts`:

```ts
test("same seed, same sequence", () => {
  const a = createRng("ABCD1234"),
    b = createRng("ABCD1234");
  expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
});
test("fork streams are independent of parent consumption", () => {
  const a = createRng("S");
  a.next();
  a.next();
  const b = createRng("S");
  expect(a.fork("layout:s1").next()).toBe(b.fork("layout:s1").next());
});
test("different fork labels diverge", () => {
  const r = createRng("S");
  expect(r.fork("a").next()).not.toBe(r.fork("b").next());
});
test("int is inclusive and bounded over 10k draws", () => {
  const r = createRng("x");
  const seen = new Set<number>();
  for (let i = 0; i < 10_000; i++) seen.add(r.int(1, 3));
  expect([...seen].sort()).toEqual([1, 2, 3]);
});
test("int(min,max) with min>max throws", () => expect(() => createRng("x").int(3, 1)).toThrow());
test("empty and unicode seeds are deterministic", () => {
  expect(createRng("").next()).toBe(createRng("").next());
  expect(createRng("ヴェイラ").next()).toBe(createRng("ヴェイラ").next());
});
test("weighted respects zero weights", () => {
  const r = createRng("w");
  for (let i = 0; i < 1000; i++)
    expect(
      r.weighted([
        { item: "a", weight: 0 },
        { item: "b", weight: 1 },
      ]),
    ).toBe("b");
});
```

Plus `seed.test.ts` (`generateSeed` output matches `SEED_REGEX` 100×; `isValidSeed('ILOU0000') === false`) and `math.test.ts` (`angleDiff(degToRad(350), degToRad(10))` ≈ `degToRad(20)`; `rotateToward` never overshoots).

- [ ] **Step 2:** Run `vp test` in `packages/utils`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement. `fork(label)` derives a new generator from `cyrb128(originalSeed + '|' + label)`, so it ignores how much the parent consumed.

```ts
// cyrb128 → 4×u32, then sfc32
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
```

- [ ] **Step 4:** Run `vp test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(utils): seeded rng with forkable streams, seeds, math`.

### Task 2: ID tuples and content schemas

**Files:** `schemas/ids.ts`, `schemas/content.ts`, `schemas/settings.ts`

**Interfaces:**

- Produces (exact tuples):
  - `RUNNER_IDS = ['vex', 'kit']`
  - `WEAPON_IDS = ['rust-pistol', 'shock-baton', 'rivet-smg', 'breach-shotgun', 'line-rifle', 'arc-carbine', 'scatter-coil', 'pulse-lance', 'grid-cutter', 'fuse-launcher', 'static-repeater', 'null-cannon']`
  - `GUARDIAN_IDS = ['sentry-drone', 'crawler', 'turret-node', 'shield-bot', 'arc-spider', 'mortar-unit', 'bleed-wraith']`
  - `BOSS_IDS = ['gatekeeper', 'conduit-hydra', 'core-warden']`
  - `MOD_IDS = ['cooling-fins', 'spare-cell', 'battery-pack', 'overclock-core', 'ricochet-chip', 'scrap-magnet', 'dash-coil', 'field-patch', 'thorn-plating', 'lucky-seal']`
  - `LOG_IDS = ['s1-log-1', 's1-log-2', 's1-log-3', 's2-log-1', …, 's3-log-3']`
  - Types `RunnerId`, `WeaponId`, `GuardianId`, `BossId`, `ModId`, `LogId`, `SectorId = 1 | 2 | 3`
  - Schemas `RunnerSchema`, `WeaponSchema`, `GuardianSchema`, `BossSchema`, `ModSchema`, `ModEffectSchema`, `ArmoryItemSchema`, `RadioLineSchema`, `VaultLogSchema`, `SettingsSchema` (fields per DESIGN.md §6 and §8.2), `DEFAULT_SETTINGS`
  - `WeaponSchema` also carries `shake: { intensity: number; durationMs: number }`, `sfx: string`, `sprite: string` (values tuned in plans 08 and 17); `GuardianSchema` carries `attack: z.record(z.string(), z.number())` and `energyOrbChance: number` (values set in plans 07, 12, 16)
  - `WeaponSchema.behaviour` enum: `bullet | pierce | bounce | explosive | chain | beam | charge-orb | melee-swing | burst`; `behaviourParams: z.record(z.string(), z.union([z.number(), z.boolean()]))`; optional `energyPerSecond`
  - `GuardianSchema.ai` enum: `hover-shooter | rusher | turret | shield | spider | mortar | wraith`

- [ ] **Step 1: Write failing test** `schemas/content.test.ts`: `SettingsSchema.parse({})` fails; `SettingsSchema.parse(DEFAULT_SETTINGS)` returns `aimMode: 'soft'`, `damageNumbers: false`, `screenShake: 1`; `ModEffectSchema` rejects `{ kind: 'stat', stat: 'luck' }`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(shared): id tuples and content schemas`.

### Task 3: Content JSON and typed content module

**Files:** `data/*.json`, `content.ts`, `content.test.ts`

**Interfaces:**

- Produces: `RUNNERS: Record<RunnerId, Runner>`, `WEAPONS: Record<WeaponId, Weapon>`, `GUARDIANS`, `BOSSES`, `MODS`, `ARMORY: ArmoryItem[]`, `RADIO: RadioLine[]`, `LOGS: Record<LogId, VaultLog>`, `STARTER_WEAPON_POOL: WeaponId[]` (rust-pistol + 5 commons), `BASE_MOD_POOL: ModId[]` (7, excluding thorn-plating, lucky-seal, dash-coil).

Starting values (PRD values verbatim; the rest are first-pass numbers):

| Weapon          | rarity  | energy   | dmg | rate/s | spread° | speed | behaviour (params)                                      |
| --------------- | ------- | -------- | --- | ------ | ------- | ----- | ------------------------------------------------------- |
| rust-pistol     | starter | 0        | 3   | 4      | 3       | 280   | bullet                                                  |
| shock-baton     | common  | 0        | 4   | 2.5    | 0       | 0     | melee-swing (arcDeg 100, range 22, stunSec 0.5)         |
| rivet-smg       | common  | 1        | 2   | 12     | 12      | 300   | bullet                                                  |
| breach-shotgun  | common  | 3        | 2   | 1.6    | 30      | 260   | bullet, pellets 5, knockback 120                        |
| line-rifle      | common  | 2        | 6   | 2.5    | 1       | 420   | pierce (count 1)                                        |
| arc-carbine     | rare    | 2        | 3   | 2      | 2       | 340   | burst (count 3, intervalMs 60)                          |
| scatter-coil    | rare    | 4        | 2   | 1.4    | 34      | 260   | bounce (bounces 1), pellets 6                           |
| pulse-lance     | rare    | 0 (+5/s) | —   | —      | 0       | —     | beam (baseDps 8, maxDps 20, rampSec 1.5, range 160)     |
| grid-cutter     | rare    | 0        | 5   | 2.2    | 0       | 0     | melee-swing (arcDeg 120, range 26, deletesBullets true) |
| fuse-launcher   | rare    | 6        | 10  | 1      | 2       | 200   | explosive (radius 32, selfSafe true)                    |
| static-repeater | epic    | 1        | 2   | 10     | 6       | 320   | chain (jumps 2, range 48, dmgMul 0.5)                   |
| null-cannon     | epic    | 10       | 30  | 0.8    | 0       | 180   | charge-orb (chargeSec 1, radius 10, pierceAll true)     |

| Guardian     | sectorMin | hp  | speed | budgetCost | ai            | scrap |
| ------------ | --------- | --- | ----- | ---------- | ------------- | ----- |
| sentry-drone | 1         | 8   | 40    | 1          | hover-shooter | 1     |
| crawler      | 1         | 6   | 90    | 1          | rusher        | 1     |
| turret-node  | 1         | 14  | 0     | 2          | turret        | 2     |
| shield-bot   | 2         | 16  | 35    | 3          | shield        | 2     |
| arc-spider   | 2         | 8   | 110   | 2          | spider        | 2     |
| mortar-unit  | 2         | 12  | 20    | 3          | mortar        | 3     |
| bleed-wraith | 3         | 18  | 60    | 4          | wraith        | 3     |

Runners: vex (6/4/180, skill `overcharge` cooldown 20 duration 5, unlockCost 0), kit (5/5/200, skill `patch-drone` cooldown 22 duration 8, unlockCost 300). Bosses: gatekeeper hp 400, conduit-hydra hp 750 (3 heads × 150 + core 300), core-warden hp 1200; phases filled in plans 14, 18, 20. Mods: effects per DESIGN.md §6.2. Armory: kit 300; arc-carbine, scatter-coil, pulse-lance, grid-cutter, fuse-launcher 80; static-repeater, null-cannon 150; thorn-plating, lucky-seal, dash-coil 60.

- [ ] **Step 1: Write failing tests** `content.test.ts`:

```ts
test.each([
  ["weapons", WEAPON_IDS, Object.keys(WEAPONS)],
  ["guardians", GUARDIAN_IDS, Object.keys(GUARDIANS)],
  ["mods", MOD_IDS, Object.keys(MODS)],
  ["runners", RUNNER_IDS, Object.keys(RUNNERS)],
  ["logs", LOG_IDS, Object.keys(LOGS)],
])("%s JSON ids match tuple", (_n, ids, keys) => expect([...keys].sort()).toEqual([...ids].sort()));
test("starter pool is pistol + 5 commons", () => expect(STARTER_WEAPON_POOL).toHaveLength(6));
test("base mod pool excludes the three armory mods", () =>
  expect(BASE_MOD_POOL).not.toEqual(expect.arrayContaining(["thorn-plating"])));
test("every non-starter, non-common weapon has an armory price", () => {
  /* rare→80, epic→150 */
});
test("vex values match PRD", () =>
  expect(RUNNERS.vex).toMatchObject({ hp: 6, shield: 4, energy: 180 }));
test("logs: 3 per sector, 2–4 lines each", () => {
  /* … */
});
```

- [ ] **Step 2:** Run → FAIL. **Step 3:** Write the JSON files and `content.ts` (parse each file with its schema at module load; throw with the file name on failure). Radio and log text are placeholders until plan 21. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(shared): mvp content data`.

### Task 4: Run result, payout and validation rules

**Files:** `schemas/run.ts`, `rules/payout.ts`, `rules/validateRun.ts`, tests

**Interfaces:**

- Produces:
  - `RunResultSchema` = `{ runnerId: RunnerId; seed: string (SEED_REGEX); sectorReached: 1..3; roomsCleared: int ≥ 0; bossesKilled: int 0..3; durationSec: int ≥ 0; kills: int ≥ 0; victory: boolean; logsFound: LogId[] (max 3) }`
  - `MAX_COMBAT_ROOMS_PER_SECTOR = 6`, `MIN_SEC_PER_ROOM = 8`, `MIN_VICTORY_SEC = 360`, `MAX_SHARDS_PER_RUN = 186`
  - `computeShardPayout(run: RunResult): number`
  - `type RunRejectReason = 'ROOMS_EXCEED_SECTOR' | 'BOSSES_EXCEED_SECTOR' | 'VICTORY_INCONSISTENT' | 'TOO_FAST_PER_ROOM' | 'VICTORY_TOO_FAST' | 'UNKNOWN_LOG' | 'DUPLICATE_LOG'`
  - `validateRun(run: RunResult): { ok: true } | { ok: false; reason: RunRejectReason }`

- [ ] **Step 1: Write failing tests:**

```ts
const base: RunResult = {
  runnerId: "vex",
  seed: "ABCD1234",
  sectorReached: 1,
  roomsCleared: 0,
  bossesKilled: 0,
  durationSec: 0,
  kills: 0,
  victory: false,
  logsFound: [],
};
test("instant sector-1 death is valid and pays 0", () => {
  expect(validateRun(base)).toEqual({ ok: true });
  expect(computeShardPayout(base)).toBe(0);
});
test("payout: 5 rooms + gatekeeper", () =>
  expect(computeShardPayout({ ...base, roomsCleared: 5, bossesKilled: 1, durationSec: 400 })).toBe(
    35,
  ));
test("payout: full victory", () =>
  expect(
    computeShardPayout({
      ...base,
      sectorReached: 3,
      roomsCleared: 15,
      bossesKilled: 3,
      victory: true,
      durationSec: 1500,
    }),
  ).toBe(180));
test("payout never exceeds MAX_SHARDS_PER_RUN", () =>
  expect(
    computeShardPayout({
      ...base,
      sectorReached: 3,
      roomsCleared: 18,
      bossesKilled: 3,
      victory: true,
      durationSec: 2000,
    }),
  ).toBe(186));
test.each([
  [{ roomsCleared: 7 }, "ROOMS_EXCEED_SECTOR"],
  [{ bossesKilled: 2 }, "BOSSES_EXCEED_SECTOR"],
  [{ roomsCleared: 3, durationSec: 23 }, "TOO_FAST_PER_ROOM"],
  [
    { sectorReached: 3, roomsCleared: 12, bossesKilled: 3, victory: true, durationSec: 359 },
    "VICTORY_TOO_FAST",
  ],
  [{ victory: true }, "VICTORY_INCONSISTENT"],
  [
    { sectorReached: 3, roomsCleared: 12, bossesKilled: 3, victory: false, durationSec: 900 },
    "VICTORY_INCONSISTENT",
  ],
  [{ logsFound: ["s2-log-1"] }, "UNKNOWN_LOG"],
  [{ logsFound: ["s1-log-1", "s1-log-1"] }, "DUPLICATE_LOG"],
])("rejects %o as %s", (patch, reason) =>
  expect(validateRun({ ...base, ...patch } as RunResult)).toEqual({ ok: false, reason }),
);
```

Note `UNKNOWN_LOG` covers a log from a sector deeper than `sectorReached`.

- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement (`computeShardPayout` = `min(MAX, 2·rooms + 25·min(bosses,2) + (victory?100:0))`). **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(shared): run result schema, payout, validation`.

### Task 5: Armory catalog rules and API schemas

**Files:** `rules/catalog.ts`, `schemas/api.ts`, tests

**Interfaces:**

- Produces:
  - `ArmoryItemRef = { itemType: 'runner' | 'weapon' | 'mod'; itemId: string }`, `findArmoryItem(ref): ArmoryItem | undefined`
  - `dropPool(unlockedWeaponIds: WeaponId[]): WeaponId[]` (starter pool ∪ unlocked), `modPool(unlockedModIds: ModId[]): ModId[]`, `availableRunners(unlocks): RunnerId[]` (vex always)
  - `checkPurchase(profile: { coreShards: number; unlocks: ArmoryItemRef[] }, ref): { ok: true; cost: number } | { ok: false; code: 'UNKNOWN_ITEM' | 'ALREADY_OWNED' | 'INSUFFICIENT_SHARDS' }`
  - API schemas: `RegisterSchema { email, password (min 8), username (3–16, [a-z0-9_]) }`, `LoginSchema`, `MeResponseSchema { profile: { id, username, coreShards }, unlocks: ArmoryItemRef[], vaultLogs: LogId[], stats: { totalRuns, totalVictories, bestVictorySec: number | null }, settings: Settings }`, `RunRewardSchema { shardsAwarded, newLogIds, me: MeResponse }`, `GuestImportSchema { coreShards (≤1000), unlocks, vaultLogs, stats }`, `LeaderboardQuerySchema { period: 'weekly' | 'all', kind: 'fastest' | 'deepest' }`, `LeaderboardResponseSchema { entries: { rank, username, runnerId, durationSec, sectorReached, roomsCleared, createdAt }[] }`, `ApiErrorSchema`

- [ ] **Step 1: Write failing tests:** `checkPurchase` returns `INSUFFICIENT_SHARDS` at 299 shards for kit, `ok` with cost 300 at 300, `ALREADY_OWNED` when owned, `UNKNOWN_ITEM` for `{ itemType: 'weapon', itemId: 'rust-pistol' }` (starter is not for sale); `dropPool([])` equals `STARTER_WEAPON_POOL`; `GuestImportSchema` rejects `coreShards: 1001`; `RegisterSchema` rejects username `'A!'`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(shared): armory catalog rules and api schemas`.

### Task 6: Palette

**Files:** `palette.ts`, `palette.test.ts`

**Interfaces:** Produces `PALETTE: Record<PaletteToken, number>` with exactly the 32 tokens and hex values of DESIGN.md §11.2, and `toCss(n: number): string` (`#rrggbb`).

- [ ] **Step 1:** Test: `Object.keys(PALETTE)` has length 32; `toCss(PALETTE.void) === '#0b0d12'`; `toCss(PALETTE['bleed-500']) === '#d81b8c'`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS. **Step 5:** Commit `feat(shared): palette tokens`.

## Acceptance

- [ ] `vp run -r test` green; `vp check` clean.
- [ ] `import { WEAPONS, validateRun, createRng } from '@dh/shared'/'@dh/utils'` type-checks from both `apps/web` and `apps/api`.
