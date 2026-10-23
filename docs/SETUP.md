# Dungeon Hunter: Development Setup

Manual setup guide for the local dev environment. Follow it top to bottom once; after that, daily work is just `pnpm dev`.

**Stack:** Phaser + React + Vite + Tailwind + Zustand + TanStack Query (frontend) · Hono on Cloudflare Workers + Zod (API) · Supabase (DB + Auth, accessed only by the API) · Vitest · pnpm workspaces · TypeScript everywhere.

---

## 0. Architecture in one picture

```
Browser
 ├─ React (menus, lobby, shop, leaderboard)  ── TanStack Query + Hono RPC client
 └─ Phaser (the actual run: player, enemies, rooms, HUD)
            │  httpOnly session cookie
            ▼
Hono API (Cloudflare Workers)  ── Zod validation, business logic, anti-cheat checks
            │  secret key (server only)
            ▼
Supabase (Postgres + Auth)     ── RLS ON, zero policies = deny-all to the public
```

Rules that never break:

- `apps/web` **never** imports `@supabase/supabase-js` and never sees a Supabase key.
- Game logic during a run is 100% local (Phaser). The API is only called at checkpoints: load profile, end of run, shop/unlock, autosave between sectors.
- Shared types and Zod schemas live in `packages/shared`.

---

## 1. Install tools (once per machine)

| Tool                                          | Why                                   | Install                                                                       |
| --------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------- |
| **Git**                                       | version control                       | https://git-scm.com                                                           |
| **Node.js LTS** (22+; use current LTS)        | runtime                               | https://nodejs.org, or `nvm`/`fnm` (recommended)                              |
| **pnpm**                                      | package manager + workspaces          | `corepack enable` then `corepack prepare pnpm@latest --activate`              |
| **Docker Desktop**                            | required by Supabase CLI for local DB | https://www.docker.com/products/docker-desktop                                |
| **Supabase CLI**                              | local Supabase, migrations, type gen  | installed as a dev dependency below (or `brew install supabase/tap/supabase`) |
| **VS Code**                                   | editor                                | https://code.visualstudio.com                                                 |
| **Tiled**                                     | room/tilemap editor                   | https://www.mapeditor.org                                                     |
| **Aseprite** (paid) or **LibreSprite** (free) | pixel art + animations                | https://www.aseprite.org / https://libresprite.github.io                      |
| **Chrome or Firefox**                         | testing + devtools                    |                                                                               |

Check versions:

```bash
node -v      # v22 or newer
pnpm -v
docker -v
git --version
```

### VS Code extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Vitest
- Error Lens (optional, shows errors inline)

### Accounts (free tier is enough, needed later for deploy)

- GitHub
- Supabase (https://supabase.com)
- Cloudflare (https://dash.cloudflare.com), for Workers + Pages

You do **not** need the cloud accounts to start developing. Everything runs locally.

---

## 2. Create the monorepo

```bash
mkdir dungeon-hunter && cd dungeon-hunter
git init
pnpm init
mkdir -p apps packages
```

**`pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Root `package.json`** (replace the generated one)

```json
{
  "name": "dungeon-hunter",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel --filter ./apps/** dev",
    "build": "pnpm -r build",
    "test": "vitest",
    "typecheck": "pnpm -r typecheck",
    "lint": "eslint .",
    "format": "prettier --write .",
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types typescript --local > packages/shared/src/db.types.ts"
  }
}
```

**`tsconfig.base.json`** (root)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**`.gitignore`**

```
node_modules
dist
.wrangler
.dev.vars
.env
.env.local
supabase/.temp
coverage
.DS_Store
```

Dev tooling at the root:

```bash
pnpm add -D -w typescript vitest prettier eslint @eslint/js typescript-eslint supabase
```

**`.prettierrc`**

```json
{ "singleQuote": true, "semi": true, "printWidth": 100 }
```

**`eslint.config.js`**

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist", "**/.wrangler", "**/db.types.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
```

---

## 3. `packages/shared`: types, schemas, game data

```bash
mkdir -p packages/shared/src/data
cd packages/shared
pnpm init
pnpm add zod
cd ../..
```

**`packages/shared/package.json`**

```json
{
  "name": "@dh/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": { "typecheck": "tsc --noEmit" },
  "dependencies": { "zod": "^3" }
}
```

> Use whatever major version of Zod `pnpm add zod` installed; just keep it identical across packages.

**`packages/shared/tsconfig.json`**

```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

**`packages/shared/src/index.ts`** (starter)

```ts
import { z } from "zod";

// The client reports what happened. It never sends how many shards it earned;
// the API computes the payout.
export const RunResultSchema = z.object({
  runnerId: z.string(),
  seed: z.string(),
  sectorReached: z.number().int().min(1).max(3),
  roomsCleared: z.number().int().min(0),
  bossesKilled: z.number().int().min(0).max(3),
  durationSec: z.number().int().min(0),
  kills: z.number().int().min(0),
  victory: z.boolean(),
  logsFound: z.array(z.string()).max(3),
});
export type RunResult = z.infer<typeof RunResultSchema>;
```

Game content (`weapons.json`, `enemies.json`, `runners.json`, `mods.json`) goes in `packages/shared/src/data/` so both the game and the API (for validation) read the same numbers.

---

## 4. `apps/api`: Hono on Cloudflare Workers

```bash
cd apps
pnpm create hono@latest api
# template: cloudflare-workers
# package manager: pnpm
cd api
pnpm add zod @hono/zod-validator @supabase/supabase-js @dh/shared@workspace:*
pnpm add -D wrangler @cloudflare/workers-types
cd ../..
```

Rename the package in `apps/api/package.json` to `"name": "@dh/api"` and make sure it has:

```json
"scripts": {
  "dev": "wrangler dev --port 8787",
  "deploy": "wrangler deploy --minify",
  "typecheck": "tsc --noEmit"
},
"exports": { ".": { "types": "./src/index.ts" } }
```

The `exports` entry is only so the frontend can import the **type** `AppType` for Hono RPC. No runtime code from the API ends up in the browser.

**`apps/api/.dev.vars`** (local secrets, gitignored; values come from step 6)

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SECRET_KEY=<secret / service_role key from `supabase status`>
WEB_ORIGIN=http://localhost:5173
```

**`apps/api/src/index.ts`** (starter)

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { createClient } from "@supabase/supabase-js";
import { RunResultSchema } from "@dh/shared";

type Bindings = { SUPABASE_URL: string; SUPABASE_SECRET_KEY: string; WEB_ORIGIN: string };

const app = new Hono<{ Bindings: Bindings }>().basePath("/api");

app.use("*", (c, next) => cors({ origin: c.env.WEB_ORIGIN, credentials: true })(c, next));

const routes = app
  .get("/health", (c) => c.json({ ok: true }))
  .post("/runs", zValidator("json", RunResultSchema), async (c) => {
    const run = c.req.valid("json");
    // TODO: auth middleware sets userId, sanity checks, insert via service client
    const db = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SECRET_KEY);
    void db;
    return c.json({ accepted: true, run });
  });

export type AppType = typeof routes;
export default app;
```

Run it: `pnpm --filter @dh/api dev` then open http://localhost:8787/api/health.

---

## 5. `apps/web`: Vite + React + Phaser

```bash
cd apps
pnpm create vite@latest web -- --template react-ts
cd web
pnpm add phaser phaser3-rex-plugins @tanstack/react-query zustand hono @dh/shared@workspace:*
pnpm add -D tailwindcss @tailwindcss/vite @dh/api@workspace:* @tanstack/react-query-devtools
cd ../..
```

Rename to `"name": "@dh/web"` and add `"typecheck": "tsc -b --noEmit"` to scripts.

> `phaser3-rex-plugins` is optional on desktop; keep it for UI helpers and in case you add touch support later.

**`apps/web/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Same-origin in dev: /api/* is forwarded to Wrangler, so cookies just work.
    proxy: { "/api": "http://localhost:8787" },
  },
});
```

**`apps/web/src/index.css`**

```css
@import "tailwindcss";
```

**`apps/web/.env`**

```
VITE_API_URL=/
```

**`apps/web/src/lib/api.ts`**

```ts
import { hc } from "hono/client";
import type { AppType } from "@dh/api";

export const api = hc<AppType>(import.meta.env.VITE_API_URL, {
  init: { credentials: "include" },
});
// usage: (await api.api.health.$get()).json()  -- fully typed
```

**`apps/web/src/game/PhaserGame.tsx`** (mount Phaser inside React, StrictMode-safe)

```tsx
import { useLayoutEffect, useRef } from "react";
import Phaser from "phaser";
import { createGameConfig } from "./config";

export function PhaserGame() {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const game = new Phaser.Game(createGameConfig(host.current!));
    return () => game.destroy(true); // StrictMode mounts twice in dev; this prevents 2 games
  }, []);
  return <div ref={host} className="w-full h-full" />;
}
```

**`apps/web/src/game/config.ts`**

```ts
import Phaser from "phaser";

export const createGameConfig = (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: 480,
  height: 270,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: "#0b0d12",
  physics: { default: "arcade", arcade: { debug: import.meta.env.DEV } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  scene: [], // Boot, Preload, Dungeon, Hud go here
});
```

In the first scene's `create()`, call `this.input.mouse?.disableContextMenu()` so right-click (skill) doesn't open the browser menu.

Wrap the app in a `QueryClientProvider` in `main.tsx`. Use Zustand for client-only state (settings, selected Runner). Server data lives only in TanStack Query.

---

## 6. Supabase (local)

Docker Desktop must be running.

```bash
pnpm supabase init        # creates supabase/ folder
pnpm db:start             # first run downloads images, takes a few minutes
pnpm supabase status      # prints API URL, Studio URL, and keys
```

- Copy the **secret / service_role** key into `apps/api/.dev.vars`.
- **Ignore the anon/publishable key.** The frontend never uses it.
- Studio (DB UI) runs at http://127.0.0.1:54323.

Create the first migration:

```bash
pnpm supabase migration new init
```

Starter SQL in the generated file under `supabase/migrations/`:

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  core_shards int not null default 0,
  created_at timestamptz not null default now()
);

create table unlocks (
  profile_id uuid references profiles on delete cascade,
  item_type text not null,          -- 'runner' | 'weapon' | 'mod'
  item_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (profile_id, item_type, item_id)
);

create table saves (
  profile_id uuid references profiles on delete cascade,
  slot int not null default 0,
  data jsonb not null,              -- includes a "version" field
  updated_at timestamptz not null default now(),
  primary key (profile_id, slot)
);

create table vault_logs (
  profile_id uuid references profiles on delete cascade,
  log_id text not null,
  found_at timestamptz not null default now(),
  primary key (profile_id, log_id)
);

create table runs (
  id bigint generated always as identity primary key,
  profile_id uuid references profiles on delete cascade,
  runner_id text not null,
  seed text not null,
  sector_reached int not null,
  rooms_cleared int not null,
  bosses_killed int not null,
  duration_sec int not null,
  kills int not null,
  victory boolean not null,
  shards_awarded int not null,      -- computed by the API, never by the client
  created_at timestamptz not null default now()
);
create index runs_leaderboard_idx on runs (victory desc, duration_sec asc);

-- Deny-all to public keys. Only the API's secret key (bypasses RLS) can touch these.
alter table profiles enable row level security;
alter table unlocks  enable row level security;
alter table saves      enable row level security;
alter table runs       enable row level security;
alter table vault_logs enable row level security;
```

Apply and generate types:

```bash
pnpm db:reset    # re-runs all migrations on the local DB
pnpm db:types    # writes packages/shared/src/db.types.ts
```

Run `pnpm db:types` every time you add a migration.

---

## 7. Vitest

**`vitest.config.ts`** (root)

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/api/**/*.test.ts", "apps/web/src/**/*.test.ts"],
  },
});
```

Example API test without starting a server:

```ts
// apps/api/src/index.test.ts
import { describe, it, expect } from "vitest";
import app from "./index";

describe("api", () => {
  it("health", async () => {
    const res = await app.request(
      "/api/health",
      {},
      {
        SUPABASE_URL: "",
        SUPABASE_SECRET_KEY: "",
        WEB_ORIGIN: "*",
      },
    );
    expect(res.status).toBe(200);
  });
});
```

Test priorities: damage math, dungeon generator (every layout reachable), run validation rules, save migration. Don't unit-test Phaser rendering.

---

## 8. Daily workflow

```bash
# terminal 1 (only if you need the backend today)
pnpm db:start

# terminal 2
pnpm dev          # starts web (5173) and api (8787) together
```

- Game + menus: http://localhost:5173
- API health: http://localhost:5173/api/health (through the Vite proxy)
- DB Studio: http://127.0.0.1:54323

Before committing: `pnpm typecheck && pnpm lint && pnpm test`.

---

## 9. Final layout

```
dungeon-hunter/
  apps/
    web/
      src/
        game/            # Phaser: scenes/, entities/, systems/, config.ts
        ui/              # React screens: Title, Lobby, Shop, Leaderboard
        stores/          # Zustand
        lib/api.ts       # Hono RPC client
    api/
      src/
        routes/          # auth, profile, runs, saves, shop
        middleware/      # session auth, rate limit
        index.ts
      .dev.vars
  packages/
    shared/
      src/
        data/            # weapons.json, enemies.json, runners.json, mods.json
        schemas/         # zod
        db.types.ts      # generated
  public assets:  apps/web/public/assets/{sprites,tilemaps,audio,fonts}
  supabase/migrations/
  SETUP.md
```

---

## 10. Things you need to know (gotchas)

**Phaser**

- Multiply all movement by `delta / 1000`. A 144Hz monitor runs `update()` more than twice as often as 60Hz.
- Pool bullets: `this.physics.add.group({ classType: Bullet, maxSize: 300 })` + `group.get()`. Never `new Bullet()` per shot.
- `sprite.setDepth(sprite.y)` each frame for correct top-down overlap.
- HUD lives in its own scene launched on top of the Dungeon scene so camera shake doesn't move it.
- Tiled: export JSON, embed tilesets, mark wall tiles with a `collides` property, then `layer.setCollisionByProperty({ collides: true })`.

**React + Phaser**

- React handles screens _outside_ a run. During a run, only Phaser renders (including HUD).
- Communicate through an event emitter (`Phaser.Events.EventEmitter` exported as a singleton). Emit on meaningful events (`run:ended`, `weapon:picked`), never per frame.
- Don't put Zustand or TanStack calls inside Phaser `update()`.

**Security**

- The secret key exists only in `.dev.vars` locally and as a Wrangler secret in prod (`wrangler secret put SUPABASE_SECRET_KEY`). Never `VITE_`-prefix it, or Vite bundles it into the browser.
- Auth: Hono calls Supabase Auth, sets an `httpOnly; Secure; SameSite=Lax` cookie. Auth middleware reads the cookie and puts `userId` on the context. Never trust a `userId` from a request body.
- Score validation in Hono: check `durationSec`, `roomsCleared`, `sectorReached`, `bossesKilled` against plausible limits, then compute Core Shards server-side. Rules are in the PRD's architecture section.

**Cookies in production**

- Easiest: serve API and web on the same site (e.g. `game.example.com` and `api.example.com` under one domain, or a Workers route on `game.example.com/api/*`). Cross-site cookies get blocked by browsers.

---

## 11. Deploy (later, not now)

1. Supabase: create a cloud project, `pnpm supabase link`, `pnpm supabase db push`.
2. API: `cd apps/api && pnpm wrangler login && pnpm wrangler secret put SUPABASE_SECRET_KEY` (repeat for other vars), then `pnpm deploy`.
3. Web: Cloudflare Pages, build command `pnpm --filter @dh/web build`, output `apps/web/dist`, env `VITE_API_URL` set to the API origin (or `/` with a same-domain route).

---

## 12. Build order reminder

1. Movement (WASD) + mouse aim + pooled bullets
2. One enemy that chases, takes damage, dies
3. One hand-made room with walls and doors
4. Procedural room linking, doors lock during fights
5. Weapons from JSON, pickup + swap
6. HUD (HP, shield, energy)
7. Only then: backend, auth, saves, leaderboard

Gameplay first. The backend is easy; making the gun feel good is the hard part.
