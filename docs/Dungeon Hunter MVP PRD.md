# Dungeon Hunter: MVP PRD

Oct 23, 2026 · @diaz

## Overview

The MVP is one complete, replayable run through the Hollow Vault: three sectors, two sector bosses, and the Core Warden, playable in a desktop browser in 20 to 30 minutes.

Dungeon Hunter is a top-down pixel roguelite shooter in the style of Soul Knight, rebuilt for mouse and keyboard. Each run is a new Runner deployment into a facility that reshuffles itself; death ends the run, Core Shards carry over.

**Pillars**

1. **Guns feel great.** Every shot has recoil, sound, shake, and hit feedback. If shooting a wall isn't fun, nothing else matters.
2. **Short runs, endless replay.** Procedural sectors, random weapons and Vault Mods. A run takes under 30 minutes.
3. **Story told by the Vault.** Light narrative through radio lines, terminal logs, and environments. Never blocks gameplay.

**Target player:** desktop players who enjoy Soul Knight, Enter the Gungeon, or Nuclear Throne and want a quick session in the browser with no install.

**MVP is done when:** a new player can sign up, pick a Runner, clear all three sectors, beat the Core Warden, see the ending, earn Core Shards, unlock something, and appear on the leaderboard.

**Open question:** "Dungeon Hunter" is already a well-known game franchise (Gameloft). Fine as a working title, but pick a different public name before launch. _Hollow Vault_ or _Vault Runner_ fit the story.

## Story and world

The story is your premise, kept intact, with three additions that make it work as a roguelite: a voice on the radio, a villain inside the system, and a reason dying is part of the fiction.

**World**

- **Veyra:** a dense city whose lights run on power drawn from below.
- **The Hollow Vault:** an old underground energy-storage facility under Veyra, built in three levels: Storage Wing, Conduit Works, Core Approach.
- **The Core:** the energy source at the bottom. It is corrupting, and the corruption (called **the Bleed**, a magenta glow that warps machines) is climbing toward the surface.
- **VIGIL:** the Vault's security system. Its malfunction woke the guardian machines and sealed the paths to the Core.

**Characters**

| Name        | Role                                                                                | How the player meets them                                         |
| ----------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| The Runner  | Player character, a specialist sent by Veyra's Grid Authority to shut the Core down | Playable; each run is a new deployment ("Runner Unit 047")        |
| Ops         | Grid Authority handler on the radio                                                 | Short text lines at sector starts, boss fights, death, ending     |
| VIGIL       | Malfunctioning security system                                                      | Terminal logs and warnings on screen ("INTRUDER. SECTOR SEALED.") |
| Core Warden | Final guardian, fused with the corrupted Core                                       | Final boss in the Core Chamber                                    |

**Why death fits the story:** Ops deploys a new Runner after each lost signal. The results screen reads "Runner signal lost. Deploying next unit." Core Shards are what the Grid Authority salvaged from the last attempt.

**The small twist (Sector 3 logs):** VIGIL didn't just glitch. The Bleed reached VIGIL first, and it now protects the Core because it reads the corruption as the Core's "normal" state. The Core Warden isn't defending the city, it's defending the infection. Shutting the Core down also frees VIGIL.

**Story beats in a run**

| Moment                 | What the player sees                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| First launch           | 4 text cards over pixel art, following your Pixar beats (Veyra, the Vault, the malfunction, the Runner) |
| Sector 1 entry         | Ops: mission briefing. VIGIL: "INTRUDER DETECTED."                                                      |
| Gatekeeper defeated    | Ops: path to the Conduit Works open                                                                     |
| Sector 2 entry         | Ops notices the Bleed spreading in the machines                                                         |
| Conduit Hydra defeated | VIGIL message glitches, first hint of the twist                                                         |
| Sector 3 entry         | Environment turns magenta; Ops loses signal clarity                                                     |
| Core Chamber           | VIGIL speaks directly before the Warden wakes                                                           |
| Victory                | Core shuts down, VIGIL's last clean message, Veyra's lights steady. Ending card + credits               |
| Death                  | Ops: signal lost. Results screen                                                                        |

**Vault Logs:** 9 collectible terminals (3 per sector, one may spawn per sector per run). Each is 2 to 4 lines of lore. Collected logs are saved to the profile and readable in the Staging Bay. This is the main way the twist is told.

**Rule:** story text never pauses combat. Radio lines appear as a small box at the bottom of the screen and fade on their own.

## Core gameplay loop

A run goes down through three sectors to the Core Chamber; it ends in the Core Warden's defeat or the Runner's death, and either way the player returns to the Staging Bay with Core Shards.

&#91;embedded content: run loop · 3 sectors, 1 final boss\]

Every sector repeats the same rhythm: clear combat rooms, grab side-room loot, beat the boss, take the Lift down. Death anywhere ends the run.

**Target pacing:** Sector 1 about 8 minutes, Sector 2 about 9, Sector 3 plus the Warden about 10. A death in Sector 1 should still feel worth it because Core Shards are paid per room cleared.

## Runners, controls, combat feel

The MVP ships two Runners with different skills; both use the same three resources Soul Knight players already understand: HP, Shield, Energy.

**Resources**

- **HP:** lost only after Shield is empty. Restored by health capsules and Lift rooms.
- **Shield:** absorbs hits, regenerates 1 point per second after 3 seconds without damage.
- **Energy:** ammo for every weapon except the starter pistol and melee. Dropped as orbs by enemies and crates.

**Runners (all numbers are starting values, tuned in playtest)**

| Runner        | HP  | Shield | Energy | Skill (right click)                                                      | Unlock          |
| ------------- | --- | ------ | ------ | ------------------------------------------------------------------------ | --------------- |
| Vex, Breacher | 6   | 4      | 180    | **Overcharge:** double fire rate, no energy cost for 5 s. Cooldown 20 s  | Free            |
| Kit, Tinker   | 5   | 5      | 200    | **Patch Drone:** deploys a turret that auto-fires for 8 s. Cooldown 22 s | 300 Core Shards |

**Controls**

| Action                | Keyboard + mouse     | Gamepad       |
| --------------------- | -------------------- | ------------- |
| Move                  | WASD                 | Left stick    |
| Aim                   | Mouse                | Right stick   |
| Shoot                 | Left click (hold)    | Right trigger |
| Skill                 | Right click or Space | Left trigger  |
| Dash (short i-frames) | Shift                | A / Cross     |
| Swap weapon           | Q or mouse wheel     | Y / Triangle  |
| Interact, pick up     | E                    | X / Square    |
| Pause                 | Esc                  | Start         |

Carry 2 weapons. Picking up a third drops the current one on the floor.

**Aim assist:** mouse aim by default, with soft assist (bullets bend up to 8 degrees toward an enemy near the cursor). Settings has "Full auto-aim" for the mobile-style experience.

**Combat feel checklist (must ship in M1, not polish)**

- Screen shake per weapon (small for SMG, big for launcher)
- Enemy hit flash (white, 50 ms) + knockback
- Hit-stop on boss hits and kills (30 ms)
- Muzzle flash, shell casings, impact sparks
- Distinct sound per weapon type, pitch-randomized
- Custom crosshair cursor
- Damage numbers off by default (toggle in settings)

## Weapons and Vault Mods

The MVP has 12 weapons and 10 Vault Mods, all defined in JSON in `packages/shared/src/data` so new ones need no new code.

**Weapons**

| Weapon          | Type      | Rarity  | Energy per shot | Behaviour                                 |
| --------------- | --------- | ------- | --------------- | ----------------------------------------- |
| Rust Pistol     | Pistol    | Starter | 0               | Reliable, infinite ammo                   |
| Shock Baton     | Melee     | Common  | 0               | Short swing, stuns 0.5 s                  |
| Rivet SMG       | Automatic | Common  | 1               | High fire rate, wide spread               |
| Breach Shotgun  | Shotgun   | Common  | 3               | 5 pellets, strong knockback               |
| Line Rifle      | Rifle     | Common  | 2               | Pierces 1 enemy                           |
| Arc Carbine     | Burst     | Rare    | 2               | 3-round burst                             |
| Scatter Coil    | Shotgun   | Rare    | 4               | Pellets bounce off walls once             |
| Pulse Lance     | Beam      | Rare    | 5 per second    | Continuous laser, ramps damage            |
| Grid Cutter     | Melee     | Rare    | 0               | Swing deletes enemy bullets               |
| Fuse Launcher   | Launcher  | Rare    | 6               | Explosive shell, area damage, self-safe   |
| Static Repeater | Automatic | Epic    | 1               | Shots chain lightning to 2 nearby enemies |
| Null Cannon     | Charge    | Epic    | 10              | Hold to charge, huge piercing orb         |

Starter pool: the 5 Common weapons + Rust Pistol. Rare and Epic weapons enter the drop pool once unlocked in the Armory.

**Vault Mods** are passive upgrades. After each sector boss and from gold chests, the player picks 1 of 3.

| Mod            | Effect                             |
| -------------- | ---------------------------------- |
| Cooling Fins   | +20% fire rate                     |
| Spare Cell     | +1 max Shield                      |
| Battery Pack   | +60 max Energy                     |
| Overclock Core | +25% damage, -1 max HP             |
| Ricochet Chip  | Bullets bounce off walls once      |
| Scrap Magnet   | Pickup radius doubled              |
| Dash Coil      | +1 dash charge                     |
| Field Patch    | Heal 1 HP when a sector boss dies  |
| Thorn Plating  | Enemies that touch you take damage |
| Lucky Seal     | Higher rarity chance on chests     |

Rule for adding content later: a new weapon or mod is a JSON entry plus, at most, one new projectile behaviour.

## Guardians and bosses

The MVP has 7 guardian machine types, 2 sector bosses, and the Core Warden; Sector 3 reuses earlier guardians as Bleed-corrupted variants instead of needing all-new enemies.

**Guardian machines**

| Guardian     | Sector | Behaviour                                        | Teaches the player              |
| ------------ | ------ | ------------------------------------------------ | ------------------------------- |
| Sentry Drone | 1+     | Hovers, fires a single slow bolt                 | Dodge and shoot back            |
| Crawler      | 1+     | Rushes at the player, explodes on contact        | Keep moving, prioritize threats |
| Turret Node  | 1+     | Stationary, fires 3-way spread                   | Use cover                       |
| Shield Bot   | 2+     | Frontal shield blocks bullets                    | Flank or use bouncing shots     |
| Arc Spider   | 2+     | Fast, leaves an electric trail                   | Control space                   |
| Mortar Unit  | 2+     | Lobs shells at your position, telegraphed circle | Don't stand still               |
| Bleed Wraith | 3      | Teleports, fires a ring of bullets               | Read patterns                   |

**Bleed variants (Sector 3):** magenta tint, +40% HP, faster bullets, and on death they leave a short-lived damaging puddle. One shader + stat multiplier, no new art.

**Elites:** any guardian can spawn as an elite (bigger, 2x HP, drops a guaranteed energy orb). 1 per room maximum.

**Sector bosses**

- **Gatekeeper (Sector 1):** a heavy security tank guarding the Storage Wing lift. Pattern A: charges in a straight line and stuns itself on walls (damage window). Pattern B: stationary bullet ring. Below 50% HP: charges twice in a row.
- **Conduit Hydra (Sector 2):** a core with 3 cable heads. Each head fires a different pattern (aimed shots, spread, beam sweep). Destroying a head removes its pattern; the core becomes vulnerable after all 3.

**Core Warden (final boss)**

The Warden is fused with the Core and fights in three phases, each longer and harder:

1. **Shielded:** 2 rotating shield arms block shots from the front. Fires spiral patterns. Players must circle around to hit the body.
2. **Lockdown:** VIGIL seals the arena edges (shrinking floor of electrified tiles) and the Warden summons 2 waves of Bleed guardians.
3. **Core Exposed:** the arms break, the Core is visible. Dense bullet-hell spirals, faster as HP drops. At 15% HP, a 3-second scream telegraph, then a final enraged pattern.

Winning triggers the shutdown sequence and the ending. Target: first-time victory rate around 10 to 20% in playtests; experienced players should win most runs.

## Dungeon structure

Each sector is generated from hand-made Tiled room templates placed on a 5x5 grid with a seeded RNG, so every run differs but every room is designed.

**Sectors**

| Sector | Name          | Look                                | Guardians                                        | Boss                       |
| ------ | ------------- | ----------------------------------- | ------------------------------------------------ | -------------------------- |
| 1      | Storage Wing  | Rust and amber, crates, cargo rails | Drone, Crawler, Turret                           | Gatekeeper                 |
| 2      | Conduit Works | Teal pipes, steam, cable bundles    | All of Sector 1 + Shield Bot, Arc Spider, Mortar | Conduit Hydra              |
| 3      | Core Approach | Magenta Bleed glow, warped metal    | Bleed variants + Bleed Wraith                    | Core Warden (Core Chamber) |

**Room types per sector (7 to 9 rooms)**

| Room            | Count               | Purpose                                                        |
| --------------- | ------------------- | -------------------------------------------------------------- |
| Start           | 1                   | Safe, radio line from Ops                                      |
| Combat          | 4 to 6              | Doors lock, 2 to 3 waves, unlock on clear, drop Scrap and orbs |
| Chest           | 1                   | Weapon chest (sometimes gold: Vault Mod choice)                |
| Vendor terminal | 1 (Sectors 2 and 3) | Spend Scrap on weapons, health, energy                         |
| Log terminal    | 0 or 1              | Vault Log collectible                                          |
| Boss            | 1                   | Farthest from Start, dead end                                  |
| Lift            | after boss          | Heal 2 HP, choose 1 of 3 Vault Mods, go down                   |

**Generation rules**

- Start at grid center; random walk places rooms; corridors are 3 tiles wide.
- Boss room = farthest room by path length, minimum 4 rooms from Start.
- Chest and Vendor never adjacent to Start.
- Validate every layout with a reachability check; regenerate on failure (unit-tested).
- Difficulty budget per room = sector base + rooms cleared. Waves spend the budget on guardians (Drone = 1, Crawler = 1, Shield Bot = 3, and so on).
- Seed shown on the results screen so players can share runs.

**Content target:** 15 combat room templates (5 per sector theme), 1 template each for the special rooms, 3 boss arenas. Rooms are 15x11 tiles of 16 px, fitting the 480x270 view with a small margin.

## Economy and meta progression

Two currencies: Scrap lives and dies inside a run, Core Shards persist and are the only thing the server awards.

| Currency    | Earned from                              | Spent on                                   | Persists                |
| ----------- | ---------------------------------------- | ------------------------------------------ | ----------------------- |
| Scrap       | Guardians, crates, rooms cleared         | Vendor terminals (weapons, health, energy) | No, reset each run      |
| Core Shards | End-of-run payout, calculated by the API | Armory unlocks in the Staging Bay          | Yes, stored in Supabase |

**Core Shard payout (server-side, starting formula)**

- 2 per room cleared
- 25 per sector boss
- 100 for defeating the Core Warden
- Capped by run duration and rooms cleared (see anti-cheat rules in the architecture section)

**Armory unlocks (starting prices, tuned in playtest)**

| Unlock                                                                | Cost    |
| --------------------------------------------------------------------- | ------- |
| Kit, Tinker (Runner)                                                  | 300     |
| Each Rare weapon into the drop pool                                   | 80      |
| Each Epic weapon into the drop pool                                   | 150     |
| Extra Vault Mods into the pool (Thorn Plating, Lucky Seal, Dash Coil) | 60 each |

Also persistent, but free: collected Vault Logs, best time, total runs, total victories.

No real-money purchases, no energy timers, no gacha in the MVP.

## Screens and UX flow

React owns every screen outside a run; Phaser owns the run itself, including the HUD, so the two never render at the same time.

| Screen              | Built with | Contents                                                                                |
| ------------------- | ---------- | --------------------------------------------------------------------------------------- |
| Title               | React      | Logo, Play, Continue as guest, Log in, Settings                                         |
| Intro cards         | React      | 4 story cards on first launch, skippable                                                |
| Login / Register    | React      | Email + password through the API; guest mode keeps progress locally                     |
| Staging Bay (lobby) | React      | Runner select, Armory, Vault Logs, Leaderboard, Start run                               |
| Armory              | React      | Unlock Runners, weapons, mods with Core Shards                                          |
| Leaderboard         | React      | Weekly and all-time; fastest victories, deepest runs                                    |
| Settings            | React      | Volume, aim mode, screen shake, damage numbers, keybind reference                       |
| In run              | Phaser     | Dungeon scene + HUD scene (HP, Shield, Energy, weapons, skill cooldown, minimap, Scrap) |
| Pause               | Phaser     | Resume, settings, abandon run                                                           |
| Results             | React      | Victory or signal lost, stats, Core Shards earned, seed, new Vault Logs                 |
| Ending              | React      | Shutdown sequence cards + credits, shown on first victory                               |

**Guest vs account:** guests play fully with progress in localStorage. Registering offers a one-time import of local progress (capped values, validated by the API). Leaderboard requires an account.

**Minimap:** top-right, reveals rooms as they're seen, icons for chest, vendor, boss. Toggle full map with Tab.

## Art and audio direction

Cold industrial pixel art with one loud colour for danger: the Bleed's magenta grows from a hint in Sector 1 to the whole screen in Sector 3, so the story is visible without reading.

**Visual specs**

- Internal resolution 480x270, scaled with nearest-neighbour; `pixelArt: true`
- Tiles 16x16; Runners 16x24; guardians 16x16 to 32x32; bosses 64x64 to 96x96
- Palette: 32 colours max. Base greys and steel blues, sector accent (amber, teal), Bleed magenta reserved for corruption and danger
- Enemy bullets always bright and outlined; player bullets warmer and smaller, so threats read instantly
- Pixel font for UI (both React screens and HUD use the same font)

**Asset plan**

- Prototype with free packs (for example 0x72's Dungeon Tileset II on itch.io; check each pack's licence before shipping)
- Replace with original art from M5 onward, Runners and bosses first since they define the game's identity
- Do not use any Soul Knight sprites, names, or recognisable character designs

**Audio**

- Music: synth/chiptune with industrial percussion. 1 lobby track, 1 track per sector, 1 boss track, 1 Core Warden track (6 total)
- SFX priority: weapon shots, hits, enemy deaths, door lock/unlock, pickups, VIGIL alarm
- Every SFX pitch-randomized ±5% so repeated shots don't sound robotic

## Technical architecture

The browser never talks to Supabase: React and Phaser call the Hono API, Hono holds the secret key and every rule about currency, unlocks, and scores. Full setup is in SETUP.md.

| Layer           | Tech                             | Responsibility                                                     |
| --------------- | -------------------------------- | ------------------------------------------------------------------ |
| Game            | Phaser + TypeScript              | The run: movement, combat, AI, generation, HUD. Runs fully offline |
| UI              | React + Vite + Tailwind          | All screens outside a run                                          |
| Client state    | Zustand                          | Settings, selected Runner, menu state                              |
| Server state    | TanStack Query + Hono RPC client | Profile, unlocks, leaderboard, saves                               |
| API             | Hono on Cloudflare Workers + Zod | Auth, validation, Core Shard payouts, purchases                    |
| Database + auth | Supabase (Postgres + Auth)       | RLS on, no public policies; reachable only from the API            |
| Shared          | `packages/shared`                | Types, Zod schemas, weapons/enemies/mods JSON                      |
| Tests           | Vitest                           | Generator, damage math, run validation, API routes                 |

**When the game talks to the API:** app start (load profile), run end (submit result), Armory purchase, register/login. Nothing during combat.

**Data model**

- `profiles`: id, username, core\_shards, created\_at
- `unlocks`: profile\_id, item\_type, item\_id
- `vault_logs`: profile\_id, log\_id, found\_at
- `saves`: profile\_id, slot, data (jsonb with a version field), updated\_at (post-MVP mid-run saves; MVP stores settings only)
- `runs`: profile\_id, runner\_id, seed, sector\_reached, rooms\_cleared, bosses\_killed, duration\_sec, kills, victory, shards\_awarded, created\_at

**API endpoints (MVP)**

| Method | Path                 | Purpose                                           |
| ------ | -------------------- | ------------------------------------------------- |
| POST   | /api/auth/register   | Create account, set httpOnly session cookie       |
| POST   | /api/auth/login      | Log in, set cookie                                |
| POST   | /api/auth/logout     | Clear cookie                                      |
| GET    | /api/me              | Profile, Core Shards, unlocks, Vault Logs         |
| POST   | /api/me/import       | One-time guest progress import (capped)           |
| POST   | /api/runs            | Submit run result, server computes shards awarded |
| POST   | /api/armory/purchase | Buy an unlock; server checks price and balance    |
| GET    | /api/leaderboard     | Weekly or all-time rankings                       |

**Anti-cheat rules in `POST /api/runs`**

- Client sends what happened, never how many shards it earned. The server calculates the payout.
- Reject if rooms\_cleared exceeds the maximum for sector\_reached, or bosses\_killed exceeds sector\_reached.
- Reject if duration\_sec is below a minimum per room cleared (start at 8 s per room) or victory comes under 6 minutes.
- Rate limit: 1 run submission per 60 s per account.
- Leaderboard shows only runs that passed validation.

This stops casual devtools cheating, not determined hackers. Good enough for an MVP.

## MVP scope and milestones

Eight milestones, roughly 16 weeks for one developer working part-time; gameplay is fully playable offline by M4, and the backend only starts at M6.

**In scope:** everything listed in this document: 2 Runners, 12 weapons, 10 Vault Mods, 7 guardians, 2 bosses + Core Warden, 3 sectors, story beats and 9 Vault Logs, accounts, Armory, leaderboard, desktop browser with keyboard/mouse and basic gamepad.

**Out of scope for MVP:** multiplayer/co-op, mobile and touch controls, more than 2 Runners, mid-run save and resume, pets, cosmetics, achievements, voice acting, localization, keybind remapping, real-money purchases.

| Milestone                  | Est. | Delivers                                                                                         | Done when                                                          |
| -------------------------- | ---- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| M0 Setup                   | 1 wk | Monorepo per SETUP.md, CI running typecheck, lint, tests                                         | `pnpm dev` runs web + api; a test passes in CI                     |
| M1 Core combat             | 2 wk | Movement, dash, mouse aim + assist, 3 weapons, pooled bullets, 2 guardians, full juice checklist | Shooting a Crawler feels good to 3 testers; 300 bullets at 60 fps  |
| M2 Rooms                   | 2 wk | Tiled templates, door lock/unlock, waves, seeded generator, minimap                              | 100 generated seeds all pass reachability tests                    |
| M3 Sector 1 vertical slice | 2 wk | Sector 1 content, Gatekeeper, chests, Vault Mods, HUD, Lift                                      | A full Sector 1 run start to boss, 8 to 10 minutes                 |
| M4 Full run                | 3 wk | Sectors 2 and 3, remaining guardians, Bleed variants, Hydra, Core Warden, all 12 weapons         | A complete offline run is winnable                                 |
| M5 Story + menus           | 2 wk | Intro cards, radio lines, Vault Logs, ending, React screens, Kit, original Runner and boss art   | First-time player understands the goal without explanation         |
| M6 Backend                 | 2 wk | Hono auth, runs, payouts, Armory, leaderboard, guest import, RLS lockdown                        | Shards survive a browser wipe; a forged run submission is rejected |
| M7 Polish + launch         | 2 wk | Balance pass, audio, playtests (10+ people), deploy to Cloudflare + Supabase                     | Public URL live; no crash in 20 consecutive runs                   |

**Cut order if time runs short:** Kit (ship with 1 Runner), Vendor terminals, Vault Logs (keep radio lines), gamepad. Never cut the combat feel checklist or the Core Warden.

## Risks and success metrics

The biggest risk is scope, not tech: the stack is solid, but content (rooms, art, boss patterns) is what eats solo projects.

| Risk                          | Impact                     | Mitigation                                                                        |
| ----------------------------- | -------------------------- | --------------------------------------------------------------------------------- |
| Scope creep                   | MVP never ships            | Strict out-of-scope list; cut order above; no new features before M7              |
| Combat feels flat             | Nobody replays             | Juice checklist is part of M1, playtest gun feel before building rooms            |
| Art bottleneck                | Delays M5                  | Free packs for prototyping, original art only for Runners and bosses first        |
| Performance with many bullets | Stutter on laptops         | Object pooling from day one, profile on a mid-range laptop every milestone        |
| Leaderboard cheating          | Unfair rankings            | Server-side payout and validation rules; accept that MVP stops only casual cheats |
| Name / IP conflict            | Forced rename after launch | Rename before public launch; no Soul Knight assets or names                       |

**Success metrics for MVP launch**

| Metric                                                  | Target       |
| ------------------------------------------------------- | ------------ |
| Frame rate on a mid-range laptop, 300 bullets on screen | 60 fps       |
| First load time                                         | Under 5 s    |
| Average run length                                      | 20 to 30 min |
| First-time Core Warden victory rate (playtest)          | 10 to 20%    |
| Playtesters who start a second run without being asked  | 70%+         |
| Crashes in 20 consecutive runs                          | 0            |
