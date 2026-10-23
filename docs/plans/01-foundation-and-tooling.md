# 01 · Foundation and Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Vite+ starter into a working monorepo where `vp run dev` starts web and api, every package runs tests, lint enforces the architecture boundaries, and CI runs `vp run ready`.

**Architecture:** Keep the Vite+ toolchain (Oxlint, Oxfmt, `vp test`). Internal packages are consumed from source. Lint rules encode the DESIGN.md §2.2 dependency rules so violations fail CI, not review.

**Tech Stack:** Vite+ 1.3 (`vp`), pnpm workspaces, TypeScript, Wrangler, GitHub Actions (`voidzero-dev/setup-vp`).

**Milestone:** M0 · **Depends on:** none · **Spec:** `DESIGN.md` §2–§3, PRD "Technical architecture", `docs/SETUP.md`

## Global Constraints

- Node `>=22.18.0`, pnpm 12.15 via `devEngines` (already in root `package.json`).
- Tests import from `vite-plus/test`, never `vitest`.
- `apps/web` never depends on `@supabase/supabase-js`.
- No secrets committed: `.dev.vars`, `.env` stay gitignored; only `*.example` files are tracked.

## Review Focus

- A fresh clone with only `vp install` must reach a green `vp run ready`; any step relying on a prior local build is a bug.
- `vp run dev` must start both servers even when Supabase is not running (api health must not touch the DB).
- Importing `phaser` from `game/logic/**` must fail `vp check`, including type-only imports.
- The Vite `/api` proxy must forward cookies (same-origin in dev).
- Windows/macOS path casing: file names must match imports exactly (CI is Linux).

## File Structure

- Modify: `package.json` (root scripts)
- Modify: `packages/shared/package.json`, `packages/utils/package.json` (source exports, test script)
- Modify: `apps/web/package.json` (test script), `apps/web/vite.config.ts` (test block, restricted imports)
- Modify: `apps/api/package.json` (dev port, test script), `apps/api/wrangler.jsonc` (name, vars), `apps/api/src/index.ts`
- Create: `apps/api/vite.config.ts`, `apps/api/src/index.test.ts`
- Create: `apps/web/src/game/logic/README.md`, `apps/web/src/game/logic/sanity.test.ts`
- Create: `.github/workflows/ci.yml`
- Delete: starter demo content in `apps/web/src/App.tsx`, `App.css`, `assets/*` (replaced by a placeholder screen)

---

### Task 1: Consume internal packages from source

**Files:** Modify `packages/shared/package.json`, `packages/utils/package.json`, `packages/shared/src/index.ts`, `packages/utils/src/index.ts`, their `tests/index.test.ts`

**Interfaces:**

- Produces: `@dh/shared` and `@dh/utils` resolvable by web and api without a build; each has `"test": "vp test"`.

- [ ] **Step 1:** In both package.json files set `"exports": { ".": "./src/index.ts", "./package.json": "./package.json" }` and `"files": ["src"]`. Remove `publishConfig`, `prepublishOnly`, `bumpp`, placeholder homepage/bugs/repository fields (private packages).
- [ ] **Step 2:** Add `@dh/utils: workspace:*` to `@dh/shared` dependencies (shared will use the RNG in plan 02).
- [ ] **Step 3:** Replace the `fn()` placeholder in `@dh/utils` with `export const VERSION = '0.0.1'` and update its test to `expect(VERSION).toBe('0.0.1')`. Do the same in `@dh/shared` (re-export `VERSION` from utils to prove the dependency resolves): test `shared re-exports utils VERSION`.
- [ ] **Step 4:** Run `vp test` in each package. Expected: PASS.
- [ ] **Step 5:** Commit `chore: consume internal packages from source`.

### Task 2: API skeleton with health route and tests

**Files:** Modify `apps/api/package.json`, `apps/api/wrangler.jsonc`, `apps/api/src/index.ts`; Create `apps/api/vite.config.ts`, `apps/api/src/index.test.ts`, `apps/api/src/env.ts`

**Interfaces:**

- Produces: `type Bindings = { SUPABASE_URL: string; SUPABASE_SECRET_KEY: string; WEB_ORIGIN: string }` in `env.ts`; `app` default export with `basePath('/api')`; `export type AppType`.

- [ ] **Step 1: Write the failing test** in `apps/api/src/index.test.ts`:

```ts
import { expect, test } from "vite-plus/test";
import app from "./index.ts";

const env = { SUPABASE_URL: "", SUPABASE_SECRET_KEY: "", WEB_ORIGIN: "http://localhost:5173" };

test("GET /api/health returns ok", async () => {
  const res = await app.request("/api/health", {}, env);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});

test("CORS allows only WEB_ORIGIN with credentials", async () => {
  const res = await app.request("/api/health", { headers: { Origin: "http://evil.test" } }, env);
  expect(res.headers.get("access-control-allow-origin")).not.toBe("http://evil.test");
});
```

- [ ] **Step 2:** Run `vp test` in `apps/api`. Expected: FAIL (route missing).
- [ ] **Step 3:** Implement `index.ts`: `new Hono<{ Bindings }>().basePath('/api')`, CORS middleware reading `c.env.WEB_ORIGIN` with `credentials: true`, `.get('/health', …)`, `export type AppType = typeof routes`. Add `apps/api/vite.config.ts` with `defineConfig({ test: { include: ['src/**/*.test.ts'] } })`. Scripts: `"dev": "wrangler dev --port 8787"`, `"test": "vp test"`, `"typecheck": "tsc --noEmit"`. Wrangler `name: "dungeon-hunter-api"`. Remove `jsxImportSource: hono/jsx` from tsconfig (no JSX in api). Use `hono: "catalog:"`.
- [ ] **Step 4:** Run `vp test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(api): health route, cors, test harness`.

### Task 3: Web placeholder, test runner and logic boundary

**Files:** Modify `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/src/App.tsx`, `apps/web/src/index.css`; Delete `apps/web/src/App.css`, `apps/web/src/assets/*`; Create `apps/web/src/game/logic/README.md`, `apps/web/src/game/logic/sanity.test.ts`

**Interfaces:**

- Produces: `vp test` in `apps/web` picks up `src/**/*.test.ts`; lint forbids `phaser`, `react`, `zustand`, `@tanstack/*` in `src/game/logic/**`, and forbids `@supabase/*` anywhere in web.

- [ ] **Step 1:** Add to `apps/web/vite.config.ts`: `test: { include: ['src/**/*.test.ts'], environment: 'node' }` and a lint override `{ files: ['src/game/logic/**'], rules: { 'no-restricted-imports': ['error', { patterns: ['phaser', 'phaser/*', 'react', 'react-*', 'zustand*', '@tanstack/*'] }] } }` plus a global `no-restricted-imports` for `@supabase/*`.
- [ ] **Step 2:** Write `sanity.test.ts`: `test('logic folder runs without Phaser', () => expect(typeof globalThis.window).toBe('undefined'))`.
- [ ] **Step 3:** Add `"test": "vp test"` to web scripts. Run `vp test`. Expected: PASS.
- [ ] **Step 4:** Verify the boundary: temporarily add `import 'phaser'` to `logic/sanity.test.ts`, run `vp check`. Expected: error naming `no-restricted-imports`. Revert.
- [ ] **Step 5:** Replace `App.tsx` with a single centred "DUNGEON HUNTER · dev" placeholder, `index.css` with `@import "tailwindcss";` only. Delete starter assets.
- [ ] **Step 6:** `logic/README.md`: two lines stating the rule from DESIGN.md §2.2.
- [ ] **Step 7:** Commit `chore(web): test runner, logic import boundary, clean starter`.

### Task 4: Root dev script and CI

**Files:** Modify root `package.json`; Create `.github/workflows/ci.yml`

- [ ] **Step 1:** Root scripts: `"dev": "vp run --parallel --filter @dh/web --filter @dh/api dev"` (confirm the parallel flag name with `vp run --help`; if absent, use two `vp run` tasks with `dependsOn` per `node_modules/vite-plus/docs/guide/run.md`). Keep `ready`.
- [ ] **Step 2:** Verify: `vp run dev`, then `curl -s http://localhost:5173/api/health`. Expected: `{"ok":true}` through the Vite proxy.
- [ ] **Step 3:** `ci.yml`: on push/PR to `main`, ubuntu-latest, `voidzero-dev/setup-vp@<exact release>` with `node-version: '24'`, `cache: true`, then `vp run ready`. Pin an exact setup-vp version (not `v1`, per Vite+ CI docs).
- [ ] **Step 4:** Run `vp run ready` locally. Expected: check, tests, builds all pass.
- [ ] **Step 5:** Commit `ci: run vp ready on push`.

## Acceptance (M0 gate)

- [ ] `vp run dev` serves web on 5173 and api on 8787; `/api/health` works through the proxy.
- [ ] `vp run ready` is green locally and in CI.
- [ ] Lint rejects Phaser imports in `game/logic/**` and Supabase imports in web.
