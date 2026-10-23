# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Dungeon Hunter is a top-down pixel roguelite shooter for desktop browsers. The repo is still at the starter scaffold. Most of the architecture below is **planned**, not built yet. Before you implement anything, read:

- `docs/Dungeon Hunter MVP PRD.md`: what to build (the PDF next to it has the same content).
- `DESIGN.md`: how it's built. Folders, names, gameplay numbers, the API, the palette. When a plan and DESIGN.md disagree, DESIGN.md wins. Update it in the same commit as any change that diverges from it.
- `docs/plans/00-roadmap.md`: 26 feature plans in dependency order (M0 to M7). Each plan names exact files, signatures and test assertions.

## Toolchain: Vite+ (`vp`)

This is a pnpm monorepo driven by the Vite+ CLI `vp`, which wraps Vite, Vitest, Oxlint, Oxfmt and a task runner. Local docs live at `node_modules/vite-plus/docs`.

- `vp install`: install deps (run it after pulling).
- `vp check` (`--fix` to apply): format, lint and type-check together. Lint is type-aware.
- `vp run -r test`: run every package's tests. `vp test` runs the tests of the current package.
- Single test file: from inside the package, `vp test path/to/file.test.ts`.
- `vp run -r build`: build everything.
- `vp run ready`: run everything CI should run (check, then all tests, then all builds).
- `vp run <pkg>#<task>` targets one package, e.g. `vp run @dh/web#dev`.
- `vp <cmd>` is a built-in command; `vp run <name>` runs a `package.json` script. They can differ, e.g. `vp dev` vs `vp run dev`.
- `vp run dev` starts web (5173) and api (8787, Wrangler) in parallel.
- All lint config lives in the root `vite.config.ts` (`lint.overrides` per folder). `vp check` ignores package-level `lint` blocks.
- If `vp` is not on PATH in a non-interactive shell, it lives at `~/.local/share/vite-plus/bin`.
- The pre-commit hook (`.vite-hooks/pre-commit`) runs `vp staged`, which runs `vp check --fix` on staged files.

Tests import from `vite-plus/test`, never from `vitest`. The lint rule `vite-plus/prefer-vite-plus-imports` is set to error.

## Packages

- `apps/web` (`@dh/web`): React 19 with the React Compiler (Babel plugin), Tailwind 4, Zustand, TanStack Query and Phaser 4. The Vite dev server proxies `/api` to `http://localhost:8787`, so cookies are same-origin in dev.
- `apps/api` (`@dh/api`): Hono on Cloudflare Workers via Wrangler. Its `exports` only expose types, so the web app can `import type { AppType }` for the Hono RPC client.
- `packages/shared` (`@dh/shared`): Zod schemas, game content JSON and pure rules shared by web and api. Zod is the only dependency so far.
- `packages/utils` (`@dh/utils`): framework-free helpers (seeded RNG and math, per the plans).
- Versions are pinned in the `catalog:` block of `pnpm-workspace.yaml`. Add dependencies as `catalog:` entries there.

## Architecture rules (DESIGN.md §2.2, §4)

- **The browser never talks to Supabase.** `apps/web` must not import `@supabase/*` or see a Supabase key. Only the API holds `SUPABASE_SECRET_KEY` (in `apps/api/.dev.vars` and Wrangler secrets). Never put the key in a `VITE_` variable.
- **The server owns value.** The client reports what happened in a run. The API computes Core Shards, prices and unlocks with the shared rules.
- **React and Phaser never render at the same time.** React owns every screen outside a run. During a run, Phaser renders everything, including the HUD (its own scene) and the pause menu. They talk only through the typed bridge emitter: `RunConfig` goes in once via `game.registry`, and `run:ended` comes out. Phaser code never calls Zustand or TanStack Query.
- **Pure logic in `apps/web/src/game/logic/**`** has no Phaser, React, Zustand or TanStack imports. All unit-tested game rules live there (damage, generator, budgets, loot, mods). Don't unit-test Phaser rendering.
- **Content is data.** Weapons, guardians, mods, runners and story text are JSON in `packages/shared/src/data`, validated by Zod. A new weapon is a JSON entry plus at most one projectile behaviour class.
- **Phaser 4, not 3.** Use `setTint(...).setTintMode(Phaser.TintModes.FILL)` instead of `setTintFill`, use Filters instead of FX/pipelines, use `Vector2` instead of `Geom.Point`, and set `roundPixels` explicitly (it defaults to `false`). Phaser skills are linked under `.claude/skills/pnpm-phaser-*`.
- **Phaser gameplay:** internal resolution 480×270 with `pixelArt: true`. Scale all movement by `delta / 1000`. Pool bullets with `group.get()`; never create a new bullet per shot.
