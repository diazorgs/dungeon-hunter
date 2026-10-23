# M3 Sector 1 vertical slice playtest

Gate for M3 (plan 15 Task 5). **Status: not run yet.**

## Setup

`vp run dev`, open `http://localhost:5173/`, **Start run**. A random seed is used; note it from the results screen (or force one with `?seed=XXXXXXXX`).

The slice ends at the Lift: after the mod pick the run ends with outcome `abandon` (Sectors 2–3 arrive in plan 19).

## What to record per tester

| Tester | Seed | Time start → Gatekeeper kill | Deaths | Room / cause of each death | Gatekeeper attempts | Notes |
| ------ | ---- | ---------------------------- | ------ | -------------------------- | ------------------- | ----- |
|        |      |                              |        |                            |                     |       |
|        |      |                              |        |                            |                     |       |
|        |      |                              |        |                            |                     |       |

Target: median 8–10 minutes start → boss kill. Tune JSON (`SECTOR_BASE` in `logic/encounter/budget.ts`, guardian HP and fire rates in `guardians.json`, Gatekeeper `params` in `bosses.json`) until it lands, then commit `balance: sector 1 pacing`.

## Things to watch

- Does every attack feel telegraphed? Can testers bait Gatekeeper charges into walls/pillars?
- Do turrets teach "use cover"? Are crawlers dodgeable?
- Is Scrap/energy pacing reasonable (orbs, crates, chest)?
- Was the HUD readable (bars, minimap, weapon slots, skill ring)?

Design estimate (`estimateSectorMinutes`, 200 seeds): min 6.8, median 8.0, max 9.2 minutes. Layouts with only 4 combat rooms estimate 6.8.
