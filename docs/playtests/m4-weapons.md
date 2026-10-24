# M4 weapon roster feel notes

Plan 17 Task 4. **Status: not run yet.**

`vp run dev`, open `http://localhost:5173/?scene=sandbox&spawn=crawler,crawler,sentry-drone,shield-bot`, **Start run**. Press `R` to cycle the active weapon through all 12 (energy refills on each press); `3`/`4` spawn more guardians, `G` toggles god mode.

Spend ~30 s per weapon and note how it feels against its PRD "Behaviour" column.

| Weapon          | Expected behaviour                        | Feel (1–5) | Notes |
| --------------- | ----------------------------------------- | ---------- | ----- |
| Rust Pistol     | Reliable, infinite ammo                   |            |       |
| Shock Baton     | Short swing, stuns 0.5 s                  |            |       |
| Rivet SMG       | High fire rate, wide spread               |            |       |
| Breach Shotgun  | 5 pellets, strong knockback               |            |       |
| Line Rifle      | Pierces 1 enemy                           |            |       |
| Arc Carbine     | 3-round burst                             |            |       |
| Scatter Coil    | Pellets bounce off walls once             |            |       |
| Pulse Lance     | Continuous laser, ramps damage            |            |       |
| Grid Cutter     | Swing deletes enemy bullets               |            |       |
| Fuse Launcher   | Explosive shell, area damage, self-safe   |            |       |
| Static Repeater | Shots chain lightning to 2 nearby enemies |            |       |
| Null Cannon     | Hold to charge, huge piercing orb         |            |       |

Tuning lives in `packages/shared/src/data/weapons.json` (`damage`, `fireRate`, `spreadDeg`, `shake`, `behaviourParams`).
