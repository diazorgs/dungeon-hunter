# Dungeon Hunter

A top-down pixel roguelite shooter for desktop browsers. A Runner descends through three sectors of the Vault, fights guardians and three bosses, and tries to shut down the Core. Progress (Core Shards, Armory unlocks, Vault Logs) carries over between runs, for guests in the browser and for accounts on the server.

- **Web** (`apps/web`): React 19 (with the React Compiler, via its Babel plugin) for every menu, Phaser 4 for the run, Tailwind 4, Zustand, TanStack Query.
- **API** (`apps/api`): Hono on Cloudflare Workers (run locally with Wrangler), talking to Supabase (Postgres + Auth).
- **Shared** (`packages/shared`, `packages/utils`): Zod schemas, game content as JSON, payout and anti-cheat rules, seeded RNG.
- **Toolchain:** [Vite+](https://vite.plus) (`vp`), which wraps Vite, Vitest, Oxlint, Oxfmt and a task runner, on a pnpm workspace.

The game is fully playable without any backend. Set up Supabase only if you want accounts, the leaderboard and server-side progress.

This README is the single setup guide for the whole repo; the apps and packages have no READMEs of their own.

---

## 1. Prerequisites

| Need                                                   | For                                    |
| ------------------------------------------------------ | -------------------------------------- |
| macOS, Linux or Windows, Git                           | Everything                             |
| Vite+ CLI (`vp`), installed below                      | Installing, running, testing, building |
| A desktop browser (Chrome recommended)                 | Playing                                |
| A [Supabase](https://supabase.com) project (free tier) | Accounts, leaderboard (optional)       |
| A Cloudflare account                                   | Deploying (optional, see section 8)    |

You don't need to install Node.js or pnpm yourself: `vp` manages the versions this repo pins (Node ≥ 22.18, pnpm 12).

## 2. Install the Vite+ CLI

macOS / Linux:

```bash
curl -fsSL https://vite.plus | bash
```

Windows (PowerShell):

```powershell
irm https://vite.plus/ps1 | iex
```

Open a new terminal and check it works:

```bash
vp --version
```

If `vp` is not found, add `~/.local/share/vite-plus/bin` to your `PATH`.

## 3. Get the code and install dependencies

```bash
git clone <this-repo-url> dungeon-hunter
cd dungeon-hunter
vp install
```

`vp install` also sets up the pre-commit hook (it runs `vp check --fix` on staged files). Run it again whenever you pull new changes.

## 4. Play as a guest (no backend)

```bash
vp run @dh/web#dev
```

Open <http://localhost:5173>. The title screen says "Playing as guest": progress is saved in this browser's localStorage. Everything works except logging in and the leaderboard.

Controls (keyboard only, auto-aim): WASD or arrows move, J attack (hold), K skill, Space or Shift dash, Q swap weapon, E interact, Tab map, Esc pause. A gamepad works too.

## 5. Set up the backend (accounts, leaderboard)

### 5.1 Create a Supabase project

Create a project in the [Supabase dashboard](https://supabase.com/dashboard). Note its **project ref**: the 20 lowercase letters in its URL (`https://<ref>.supabase.co`).

### 5.2 Log in and link the CLI

The Supabase CLI is a dev dependency of this repo. Run these in your own terminal (login opens a browser):

```bash
vp exec supabase login
```

```bash
vp exec supabase link --project-ref <your-project-ref>
```

### 5.3 Apply the database schema

```bash
vp run db:push
```

This applies `supabase/migrations/` (five tables with Row Level Security locked down, plus the SQL functions for runs, purchases, guest import and the leaderboard). To see what would change first: `vp exec supabase db push --linked --dry-run`.

### 5.4 Give the API its keys

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

Fill in `apps/api/.dev.vars` from **Dashboard → Project Settings → API Keys**:

| Variable                   | Value                                                      |
| -------------------------- | ---------------------------------------------------------- |
| `SUPABASE_URL`             | `https://<your-project-ref>.supabase.co`                   |
| `SUPABASE_SECRET_KEY`      | The **secret** key (`sb_secret_…`)                         |
| `WEB_ORIGIN`               | `http://localhost:5173`                                    |
| `SUPABASE_PUBLISHABLE_KEY` | The **publishable** key (only used by the RLS check below) |

`.dev.vars` is gitignored. The secret key must only ever live here and in Wrangler secrets: the browser never talks to Supabase, and no Supabase key may go in a `VITE_` variable.

### 5.5 Prove the database is locked down

```bash
vp run db:check-rls
```

Every table and function must print `denied` (exit code 0). If anything prints `LEAK`, stop and fix it before going further.

### 5.6 Run web and API together

```bash
vp run dev
```

This starts the web app on <http://localhost:5173> and the API (Wrangler) on <http://localhost:8787>. Vite proxies `/api` to the API, so cookies stay same-origin. On the title screen choose **Log in → New? Register**. If the browser already has guest progress, you're offered a one-time import (Core Shards capped at 1000).

Quick checks:

```bash
curl -s localhost:8787/api/health
```

```bash
curl -s "localhost:8787/api/leaderboard?period=all&kind=fastest"
```

## 6. Everyday commands

| Command                        | What it does                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| `vp run dev`                   | Web (5173) + API (8787)                                                            |
| `vp run @dh/web#dev`           | Web only (guest mode)                                                              |
| `vp check`                     | Format, lint (type-aware) and type-check; `--fix` to apply                         |
| `vp run -r test`               | All tests in every package                                                         |
| `vp test path/to/file.test.ts` | One test file (run inside its package)                                             |
| `vp run -r build`              | Build everything                                                                   |
| `vp run ready`                 | What CI runs: check, all tests, all builds                                         |
| `vp run db:push`               | Apply new migrations to the linked Supabase project                                |
| `vp run db:check-rls`          | Prove the public key can read, write and call nothing                              |
| `vp run @dh/web#rooms`         | Rebuild the room catalog after editing Tiled rooms                                 |
| `vp run @dh/web#art`           | Regenerate the Runner and boss sprite atlases                                      |
| `vp run @dh/web#music`         | Regenerate the six music loops                                                     |
| `vp run @dh/api#cf-typegen`    | Regenerate Worker binding types after adding bindings to `apps/api/wrangler.jsonc` |

Tests import from `vite-plus/test`, never from `vitest`.

## 7. Development tools (dev builds only)

URL parameters on <http://localhost:5173>:

| Parameter                                                | Effect                                              |
| -------------------------------------------------------- | --------------------------------------------------- |
| `?seed=ABCD1234`                                         | Fixed dungeon seed (8 chars, Crockford base32)      |
| `?runner=kit`                                            | Play Kit without the Armory unlock                  |
| `?scene=sandbox`                                         | One-room sandbox with a stress test and FPS readout |
| `&spawn=crawler,sentry-drone` / `&spawn=boss:gatekeeper` | Spawn guardians or a boss in the sandbox            |
| `&god=1`                                                 | Ignore all damage in the sandbox                    |

In a run: **F6** clears the room, **F8** rebuilds the sector, **F9** abandons the run. `window.__dh` exposes the bridge and the Phaser game in the console. The Staging Bay shows a telemetry panel summarising your local runs, for balancing. None of this ships in production builds.

## 8. Deploying

Production serves the web app on Cloudflare Pages and the API as a Worker on the same site under `/api/*`. Follow [`docs/launch-checklist.md`](docs/launch-checklist.md): choose the public name, set the host in `apps/api/wrangler.jsonc` (`env.production`), add the Wrangler secrets and GitHub secrets, then push a `v*` tag to run [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## 9. Project layout

```
apps/
  web/            React screens (src/ui), Phaser game (src/game), profile repositories (src/profile)
    src/game/logic/   pure, unit-tested game rules (no Phaser/React imports)
    public/assets/    sprites, tilemaps, audio, font, CREDITS.md
    scripts/          generators: rooms, art, music, sfx; production bundle check
  api/            Hono routes (src/routes), Supabase + in-memory repositories (src/db)
packages/
  shared/         Zod schemas, game content JSON (src/data), payout and validation rules
  utils/          seeded RNG and math helpers
supabase/
  migrations/     schema, RLS lockdown, gameplay SQL functions
docs/
  Dungeon Hunter MVP PRD.md   what to build
  plans/                      the 26 feature plans (start with 00-roadmap.md)
  playtests/                  playtest protocols and results
DESIGN.md         how it's built: architecture, names, numbers, palette (wins over plans)
```

## 10. Troubleshooting

| Symptom                                                   | Fix                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `vp: command not found`                                   | Add `~/.local/share/vite-plus/bin` to `PATH` and open a new terminal                                                            |
| Commit fails with `exec: node: not found` in the hook     | Same `PATH` fix; the hook runs `vp` through `node_modules/.bin`                                                                 |
| API returns 500 and logs `Invalid supabaseUrl`            | `apps/api/.dev.vars` still has placeholder values (section 5.4)                                                                 |
| Log in or Register says "Could not reach the server"      | The API isn't running: use `vp run dev`, not `vp run @dh/web#dev`                                                               |
| Logged in, but the session is lost on reload              | Open the game at `http://localhost:5173`, not `127.0.0.1`: the cookies are `Secure` and browsers allow that only on `localhost` |
| Port 5173 or 8787 already in use                          | Stop the other process (`lsof -ti tcp:8787 \| xargs kill`)                                                                      |
| `vp exec supabase link` says the ref is not a project ref | Use the 20-letter ref from your project URL, not a placeholder                                                                  |
| `db:check-rls` prints `LEAK`                              | Re-run `vp run db:push`; never add RLS policies or grants for `anon` / `authenticated`                                          |

## Further reading

- [`docs/Dungeon Hunter MVP PRD.md`](docs/Dungeon%20Hunter%20MVP%20PRD.md): the product requirements.
- [`DESIGN.md`](DESIGN.md): architecture, conventions, gameplay numbers, API, palette.
- [`docs/plans/00-roadmap.md`](docs/plans/00-roadmap.md): the build order, milestone by milestone.
- [`CLAUDE.md`](CLAUDE.md): rules for AI coding agents working in this repo.
- [`apps/web/public/assets/CREDITS.md`](apps/web/public/assets/CREDITS.md): asset and font licences.
