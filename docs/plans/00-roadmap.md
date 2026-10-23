# Dungeon Hunter MVP: Development Roadmap

The PRD (`docs/Dungeon Hunter MVP PRD.md`) broken into 26 feature plans, ordered by system dependency. Read `DESIGN.md` first: every plan uses its names, folders and numbers.

**How the order was chosen**

1. **Contracts before consumers.** Shared schemas, data and the RNG come first because the game, the generator and the API all read them.
2. **Pure logic before Phaser.** Each gameplay plan starts with tested logic in `game/logic/`, then wires Phaser on top.
3. **Feel before content.** M1 proves combat feel (PRD risk: "combat feels flat") before any room is built.
4. **One vertical slice before breadth.** Sector 1 is completed end to end (M3) before Sectors 2–3 multiply the content.
5. **Offline before online.** Meta progression ships against a local repository (M5); the backend (M6) replaces it behind the same interface.
6. **Cut-order items are isolated.** Kit, Vendor, Vault Logs and gamepad each live in a plan or task that can be dropped without touching others.

---

## Sequence

| #   | Plan                                                                          | Milestone | Depends on     | Delivers                                                                   |
| --- | ----------------------------------------------------------------------------- | --------- | -------------- | -------------------------------------------------------------------------- |
| 01  | [Foundation and tooling](01-foundation-and-tooling.md)                        | M0        | none           | Working `vp run dev`, test runners in every package, CI, lint boundaries   |
| 02  | [Shared contracts and game data](02-shared-contracts-and-game-data.md)        | M0        | 01             | Zod schemas, JSON content, RNG, payout and validation rules                |
| 03  | [Game shell and scene architecture](03-game-shell-and-scenes.md)              | M1        | 01, 02         | Phaser mounted in React, scenes, bridge, input, assets, sandbox            |
| 04  | [Combat core: resources and damage](04-combat-core-resources-damage.md)       | M1        | 02             | HP/Shield/Energy model, damage, i-frames, derived stats                    |
| 05  | [Player controller](05-player-controller.md)                                  | M1        | 03, 04         | Movement, dash, aim + assist, skill framework, Vex Overcharge              |
| 06  | [Weapons and projectiles](06-weapons-and-projectiles.md)                      | M1        | 03, 04, 05     | Bullet pools, behaviour registry, 3 weapons, carry-2 + swap                |
| 07  | [Guardian AI foundation](07-guardian-ai-foundation.md)                        | M1        | 04, 06         | Guardian base, AI state machine, Sentry Drone, Crawler                     |
| 08  | [Combat feel and SFX](08-combat-feel-and-sfx.md)                              | M1        | 05, 06, 07     | Full juice checklist, AudioSystem with pitch jitter, crosshair             |
| 09  | [Dungeon generator](09-dungeon-generator.md)                                  | M2        | 02             | Seeded 5×5 layout, rules, reachability, 1000-seed test                     |
| 10  | [Room templates and encounters](10-room-templates-and-encounters.md)          | M2        | 07, 09         | Tiled pipeline, room streaming, doors, waves, difficulty budget            |
| 11  | [HUD and minimap](11-hud-and-minimap.md)                                      | M2–M3     | 03, 10         | Minimap (M2), full HUD (M3), radio box slot, boss bar slot                 |
| 12  | [Run state, loot and pickups](12-run-state-loot-pickups.md)                   | M3        | 06, 10         | RunState, Scrap, orbs, crates, chests, weapon drop pool, RunSummary        |
| 13  | [Vault Mods](13-vault-mods.md)                                                | M3        | 04, 12         | Mod effects pipeline, 1-of-3 pick UI, gold chests                          |
| 14  | [Boss framework and Gatekeeper](14-boss-framework-gatekeeper.md)              | M3        | 07, 08, 10     | Phase machine, bullet pattern library, boss bar, Gatekeeper                |
| 15  | [Sector 1 vertical slice](15-sector-1-vertical-slice.md)                      | M3        | 11–14          | Turret Node, Sector 1 rooms + theme, Lift scene, death/victory flow        |
| 16  | [Guardian roster, Bleed variants, elites](16-guardian-roster-bleed-elites.md) | M4        | 07, 15         | Shield Bot, Arc Spider, Mortar, Bleed Wraith, Bleed modifier, elites       |
| 17  | [Full weapon roster](17-full-weapon-roster.md)                                | M4        | 06, 08         | Remaining 9 weapons and their behaviours                                   |
| 18  | [Conduit Hydra](18-conduit-hydra.md)                                          | M4        | 14             | Sector 2 boss                                                              |
| 19  | [Sectors 2 and 3, Vendor](19-sectors-2-3-and-vendor.md)                       | M4        | 15, 16, 18     | Themes, 10 room templates, Vendor terminal, 3-sector run flow              |
| 20  | [Core Warden](20-core-warden.md)                                              | M4        | 14, 16, 19     | Three-phase final boss, Lockdown floor, shutdown trigger                   |
| 21  | [Story and narrative](21-story-and-narrative.md)                              | M5        | 11, 19, 20     | Radio beats, VIGIL banner, Vault Logs, log rooms                           |
| 22  | [React screens and local profile](22-react-screens-local-profile.md)          | M5        | 02, 03, 12, 21 | All React screens, settings, LocalProfileRepository, Armory offline        |
| 23  | [Kit and original art pass](23-kit-and-art-pass.md)                           | M5        | 05, 22         | Kit + Patch Drone, original Runner/boss art, font, credits                 |
| 24  | [Backend: database and auth](24-backend-database-auth.md)                     | M6        | 02             | Supabase schema + RLS lockdown, register/login/logout, session middleware  |
| 25  | [Backend: gameplay API and web integration](25-backend-gameplay-api.md)       | M6        | 22, 24         | /me, /runs + anti-cheat, Armory, leaderboard, import, ApiProfileRepository |
| 26  | [Audio, balance, polish and launch](26-audio-balance-launch.md)               | M7        | all            | Music, balance pass, perf profiling, playtests, deploy                     |

```
M0  01 ─ 02
M1        └─ 03 ─┬─ 05 ─ 06 ─ 07 ─ 08
            04 ──┘
M2  09 ─ 10 ─ 11(minimap)
M3  12 ─ 13 ─ 14 ─ 11(HUD) ─ 15            ← vertical slice gate
M4  16 ─ 17 ─ 18 ─ 19 ─ 20                 ← full offline run gate
M5  21 ─ 22 ─ 23
M6  24 ─ 25                                 (24 can start any time after 02)
M7  26
```

### Work that can run in parallel

- **04** (pure combat logic) alongside **03** (Phaser shell).
- **09** (pure generator) any time after 02; it has no Phaser dependency.
- **24** (database and auth) any time after 02 if a second person joins; it touches only `apps/api` and `supabase/`.
- **17** (weapons) alongside **16** (guardians); different folders.

---

## Milestone gates

| Gate | Done when (from PRD)                                               | Verified by                                     |
| ---- | ------------------------------------------------------------------ | ----------------------------------------------- |
| M0   | `vp run dev` runs web + api; a test passes in CI                   | Plan 01 Task 4, plan 02 green                   |
| M1   | Shooting a Crawler feels good to 3 testers; 300 bullets at 60 fps  | Plan 08 playtest checklist; sandbox stress test |
| M2   | 100 generated seeds all pass reachability tests                    | Plan 09 seed sweep (we test 1000)               |
| M3   | A full Sector 1 run start to boss, 8 to 10 minutes                 | Plan 15 acceptance                              |
| M4   | A complete offline run is winnable                                 | Plan 20 acceptance                              |
| M5   | First-time player understands the goal without explanation         | Plan 23 hallway test                            |
| M6   | Shards survive a browser wipe; a forged run submission is rejected | Plan 25 acceptance                              |
| M7   | Public URL live; no crash in 20 consecutive runs                   | Plan 26 launch checklist                        |

## Cut order (PRD) and where each item lives

| Cut | Item       | Remove by skipping                               |
| --- | ---------- | ------------------------------------------------ |
| 1   | Kit        | Plan 23 Tasks 1–2; Armory hides runner unlocks   |
| 2   | Vendor     | Plan 19 Task 4; generator `includeVendor: false` |
| 3   | Vault Logs | Plan 21 Task 3; keep radio lines                 |
| 4   | Gamepad    | Plan 03 Task 4 pad branch                        |
| ✗   | Never cut  | Plan 08 (combat feel), plan 20 (Core Warden)     |

## Out of scope (do not plan, do not build)

Multiplayer/co-op, mobile/touch, more than 2 Runners, mid-run save/resume, pets, cosmetics, achievements, voice acting, localization, keybind remapping, real-money purchases.
