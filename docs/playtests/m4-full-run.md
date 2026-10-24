# M4 full offline run playtest

Gate for M4 (plan 20 Task 4): a complete run (3 sectors, Gatekeeper, Conduit Hydra, Core Warden) is winnable from a fresh start with no DEV flags. **Status: not run yet.**

## Setup

`vp run dev`, open `http://localhost:5173/`, **Start run**. No URL flags. Each tester plays from a fresh run; note the seed from the results screen.

## Record per run

| Tester | Run # | Seed | Outcome | Sector of death | Time | Gatekeeper / Hydra / Warden attempts | Notes |
| ------ | ----- | ---- | ------- | --------------- | ---- | ------------------------------------ | ----- |
|        |       |      |         |                 |      |                                      |       |
|        |       |      |         |                 |      |                                      |       |
|        |       |      |         |                 |      |                                      |       |
|        |       |      |         |                 |      |                                      |       |
|        |       |      |         |                 |      |                                      |       |

Target: first-time Core Warden win rate 10–20 %; ideally one tester wins within three runs.

## Watch for

- Hydra: can testers tell which head fires what, and that the core opens after the last head?
- Warden: are the shield arms readable (circle to hit)? Is the Lockdown safe core obvious? Does the 15 % scream read as a warning?
- Vendor: do testers find and use it? Are prices sensible against Scrap income?
- Sector 3 magenta grade: still readable for enemy bullets?

## Tuning knobs

`bosses.json` `params` (Gatekeeper, Hydra, Warden), `guardians.json` (HP, attack params), `SECTOR_BASE` and `ELITE_CHANCE` in `apps/web/src/game/logic`, `vendor.json` prices.

A real victory summary must pass `validateRun` and pay 2 × rooms + 50 + 100 Core Shards (verified with a scripted Sector 3 kill: 12 rooms → 174).
