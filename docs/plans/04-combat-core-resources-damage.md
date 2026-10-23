# 04 · Combat Core: Resources and Damage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The pure combat model every actor uses: HP/Shield/Energy, damage order, shield regen, invulnerability windows, enemy health, cooldowns and derived player stats.

**Architecture:** Plain TypeScript in `apps/web/src/game/logic/combat/`. State objects are mutated in place by small functions that return a result record (no allocation-heavy immutability in the hot loop). Time is always passed in as `now` (scene time, ms).

**Tech Stack:** TypeScript, `vp test`.

**Milestone:** M1 · **Depends on:** 02 · **Spec:** `DESIGN.md` §5, §6.2, §7.1; PRD "Resources", "Runners"

## Global Constraints

- No Phaser, React or store imports (lint-enforced).
- Shield absorbs before HP. Regen 1 shield/s after 3 s without damage. Post-hit invulnerability 500 ms.
- All values integer except multipliers.

## Review Focus

- Damage arriving in the same frame as a dash ending must respect whichever invulnerability lasts longer (no shortening).
- Damage larger than shield + HP sets HP to 0 exactly once; further hits on a dead state are ignored (no negative HP, no double death).
- A mod that lowers `maxHp` below current HP clamps HP, but never to 0 (min 1).
- Long frame gaps (tab-out, 5 s delta) must not regenerate more shield than the elapsed whole seconds allow, and never above max.
- Energy spend with insufficient energy spends nothing and returns `false` (no partial spend).

## File Structure

```
apps/web/src/game/logic/combat/
  combatant.ts, combatant.test.ts     # player-like resources
  enemyHealth.ts, enemyHealth.test.ts
  cooldown.ts, cooldown.test.ts
  stats.ts, stats.test.ts             # deriveStats + applyStatChange
```

---

### Task 1: Combatant resources and damage

**Interfaces:**

- Produces:
  - `interface CombatantState { hp: number; maxHp: number; shield: number; maxShield: number; energy: number; maxEnergy: number; lastDamagedAt: number; invulnUntil: number; nextRegenAt: number; dead: boolean }`
  - `createCombatant(base: { hp: number; shield: number; energy: number }): CombatantState` (full resources, `lastDamagedAt = -Infinity`)
  - `applyDamage(s: CombatantState, amount: number, now: number): { ignored: boolean; shieldLost: number; hpLost: number; died: boolean }`
  - `grantInvuln(s, now, ms): void` (extends, never shortens)
  - `tickShieldRegen(s, now): number` (shield gained this tick)
  - `heal(s, n): number`, `spendEnergy(s, n): boolean`, `gainEnergy(s, n): number`
  - Constants `SHIELD_REGEN_DELAY_MS = 3000`, `SHIELD_REGEN_INTERVAL_MS = 1000`, `HIT_INVULN_MS = 500`

- [ ] **Step 1: Write failing tests:**

```ts
const vex = () => createCombatant({ hp: 6, shield: 4, energy: 180 });
test("shield absorbs first", () => {
  const s = vex();
  expect(applyDamage(s, 1, 0)).toMatchObject({ shieldLost: 1, hpLost: 0 });
  expect(s.shield).toBe(3);
});
test("overflow spills into hp", () => {
  const s = vex();
  s.shield = 1;
  applyDamage(s, 3, 0);
  expect([s.shield, s.hp]).toEqual([0, 4]);
});
test("hit grants 500 ms invulnerability", () => {
  const s = vex();
  applyDamage(s, 1, 0);
  expect(applyDamage(s, 1, 499).ignored).toBe(true);
  expect(applyDamage(s, 1, 500).ignored).toBe(false);
});
test("grantInvuln never shortens", () => {
  const s = vex();
  grantInvuln(s, 0, 800);
  grantInvuln(s, 0, 200);
  expect(s.invulnUntil).toBe(800);
});
test("death happens once and hp never negative", () => {
  const s = vex();
  expect(applyDamage(s, 99, 0).died).toBe(true);
  expect(s.hp).toBe(0);
  expect(applyDamage(s, 1, 10_000)).toMatchObject({ ignored: true, died: false });
});
test("regen waits 3 s then +1/s", () => {
  const s = vex();
  applyDamage(s, 2, 0);
  expect(tickShieldRegen(s, 2999)).toBe(0);
  expect(tickShieldRegen(s, 3000)).toBe(1);
  expect(tickShieldRegen(s, 3999)).toBe(0);
  expect(tickShieldRegen(s, 4000)).toBe(1);
});
test("long gap regenerates whole seconds only, capped at max", () => {
  const s = vex();
  s.shield = 0;
  s.lastDamagedAt = 0;
  s.nextRegenAt = 3000;
  expect(tickShieldRegen(s, 5500)).toBe(3);
  expect(tickShieldRegen(s, 60_000)).toBe(1);
  expect(s.shield).toBe(4);
});
test("spendEnergy is all-or-nothing", () => {
  const s = vex();
  s.energy = 2;
  expect(spendEnergy(s, 3)).toBe(false);
  expect(s.energy).toBe(2);
});
```

- [ ] **Step 2:** `vp test src/game/logic/combat` → FAIL. **Step 3:** Implement. Damage resets `lastDamagedAt` and `nextRegenAt = now + 3000` even when fully absorbed by shield. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(logic): combatant resources and damage`.

### Task 2: Enemy health, stun and cooldowns

**Interfaces:**

- Produces:
  - `interface EnemyHealth { hp: number; maxHp: number; dead: boolean; stunnedUntil: number }`, `createEnemyHealth(hp: number, hpMul = 1): EnemyHealth` (`Math.round(hp × hpMul)`, min 1)
  - `damageEnemy(e: EnemyHealth, amount: number): { dealt: number; killed: boolean }` (ignores when dead)
  - `stun(e, now, ms)`, `isStunned(e, now)`
  - `class Cooldown { constructor(durationMs: number); ready(now): boolean; trigger(now): boolean; remaining(now): number; progress(now): number /* 0..1 */; setDuration(ms): void; reset(): void }`
  - `class ChargePool { constructor(maxCharges: number, rechargeMs: number); use(now): boolean; charges(now): number; setMax(n): void }` (dash charges)

- [ ] **Step 1: Tests:** elite `createEnemyHealth(8, 2).hp === 16`; Bleed `createEnemyHealth(6, 1.4).hp === 8`; `damageEnemy` returns `killed: true` exactly once; `Cooldown(20000)` triggered at 0 is not ready at 19 999 and ready at 20 000, `progress(10000) === 0.5`; `ChargePool(2, 600)` allows 2 uses at t=0, third fails, one recharges at 600 (sequential, not parallel).
- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(logic): enemy health, stun, cooldown, charge pool`.

### Task 3: Derived player stats

**Interfaces:**

- Consumes: `Runner`, `Mod`, `ModEffect` from `@dh/shared`.
- Produces:
  - `interface PlayerStats { maxHp: number; maxShield: number; maxEnergy: number; fireRateMul: number; damageMul: number; pickupRadiusMul: number; dashCharges: number; chestLuck: number; flags: ReadonlySet<'bulletsBounce' | 'thornContact'>; hooks: { onBossKilled: { action: 'heal'; value: number }[] } }`
  - `deriveStats(runner: Runner, mods: readonly Mod[]): PlayerStats` (base dash charges 1, multipliers start at 1, `chestLuck` 0)
  - `applyStatChange(s: CombatantState, before: PlayerStats, after: PlayerStats): void` (raises current by any max increase; clamps to new max; `maxHp` floor 1, `hp` floor 1 if alive)

- [ ] **Step 1: Tests:**

```ts
test("no mods = runner base", () =>
  expect(deriveStats(RUNNERS.vex, [])).toMatchObject({
    maxHp: 6,
    maxShield: 4,
    maxEnergy: 180,
    fireRateMul: 1,
    dashCharges: 1,
  }));
test("two cooling fins multiply", () =>
  expect(
    deriveStats(RUNNERS.vex, [MODS["cooling-fins"], MODS["cooling-fins"]]).fireRateMul,
  ).toBeCloseTo(1.44));
test("overclock core: +25% damage, -1 max hp", () =>
  expect(deriveStats(RUNNERS.vex, [MODS["overclock-core"]])).toMatchObject({
    damageMul: 1.25,
    maxHp: 5,
  }));
test("maxHp never below 1", () => {
  /* 6 overclocks on vex → maxHp 1 */
});
test("spare cell raises current shield too", () => {
  const s = createCombatant({ hp: 6, shield: 4, energy: 180 });
  s.shield = 2;
  applyStatChange(s, deriveStats(RUNNERS.vex, []), deriveStats(RUNNERS.vex, [MODS["spare-cell"]]));
  expect([s.shield, s.maxShield]).toEqual([3, 5]);
});
test("overclock at full hp clamps hp to new max", () => {
  /* hp 6 → 5 */
});
test("flags and hooks collected", () => {
  /* ricochet-chip → flags has bulletsBounce; field-patch → hooks.onBossKilled[0].value === 1 */
});
```

- [ ] **Step 2:** → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(logic): derived player stats from runner and mods`.

## Acceptance

- [ ] `vp test` in `apps/web` green; coverage of `logic/combat` ≥ 90% lines (`vp test run --coverage`).
