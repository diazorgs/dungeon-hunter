# M7 balance pass and launch playtest

## Tools

- DEV builds log every finished run to `localStorage['dh.telemetry.dev']` (last 200, never sent anywhere).
  The Staging Bay shows a summary panel in DEV: runs, median minutes, win rate, deaths per sector, deadliest rooms.
- Clear it with `localStorage.removeItem('dh.telemetry.dev')` before a fresh pass.

## Targets

Run 20–30 min (Sector pacing about 8 / 9 / 10 min), first-time Core Warden win rate 10–20%.

## Balance pass (≥ 15 internal runs)

Tune JSON only: `guardians.json` (HP, `budgetCost`), `SECTOR_BASE` in `encounter/budget.ts`, `bosses.json` (HP, params),
`weapons.json` (damage, energy), `vendor.json`, `armory.json`. Log every change here.

| Date | Change (file: field old → new) | Reason (telemetry numbers) |
| ---- | ------------------------------ | -------------------------- |
|      |                                |                            |

Telemetry snapshot before / after:

| When   | Runs | Median min | Win rate | Deaths S1/S2/S3 | Deadliest |
| ------ | ---- | ---------- | -------- | --------------- | --------- |
| Before |      |            |          |                 |           |
| After  |      |            |          |                 |           |

## Performance (reference mid-range laptop)

- Sandbox stress: `?scene=sandbox`, 300-bullet button, spawn 20 Bleed guardians in Sector 3 atmosphere; read the FPS overlay for 60 s.
- Result: ___ fps (≥ 58 required). If short, trim filters and particles first.

## Launch playtest (10+ people, public URL)

| Tester | Run length | Reached | Won Warden? | 2nd run unprompted? | Crash? | Notes |
| ------ | ---------- | ------- | ----------- | ------------------- | ------ | ----- |
|        |            |         |             |                     |        |       |

## 20 consecutive runs (public URL, 0 crashes required)

| #   | Outcome | Sector | Crash? |
| --- | ------- | ------ | ------ |
| 1   |         |        |        |
