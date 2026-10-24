# Launch checklist (M7)

Gate (PRD M7): public URL live; no crash in 20 consecutive runs. Tick each box with a date and initials.

## 1. Name and branding

- [ ] Public name chosen (PRD suggests _Hollow Vault_ or _Vault Runner_; working title is _Dungeon Hunter_).
- [ ] Applied to: Title screen (`apps/web/src/ui/screens/TitleScreen.tsx`), `<title>` (`apps/web/index.html`), README, Ending credits line (`EndingScreen.tsx`), `DESIGN.md` §16.
- [ ] No Soul Knight assets, names or recognisable designs anywhere (sprites, copy, SFX).
- [ ] Every entry in `apps/web/public/assets/CREDITS.md` re-checked (font licence file present).

## 2. Database (Supabase cloud)

- [x] `vp run db:link` (needs the project ref and DB password), then `vp run db:push`: both migrations applied. _2026-10-24, project `rvimlhgtkseiadjjkqqs`._
- [x] Add `SUPABASE_PUBLISHABLE_KEY` to `apps/api/.dev.vars`, run `vp run db:check-rls`: every table and function prints `denied`, exit 0. _2026-10-24: 5 tables + 4 functions denied._
- [ ] Auth settings: email signups through the API only (`supabase/config.toml` `enable_signup = false` for the public endpoint), password minimum 8.

## 3. API (Cloudflare Workers)

- [ ] Replace `PUBLIC_HOST` / `PUBLIC_ZONE` in `apps/api/wrangler.jsonc` (`env.production`). `WEB_ORIGIN` must equal the site origin exactly.
- [ ] `cd apps/api && vp exec wrangler secret put SUPABASE_URL --env production`
- [ ] `cd apps/api && vp exec wrangler secret put SUPABASE_SECRET_KEY --env production`
- [ ] Route `<host>/api/*` points at the Worker (same site as the web app, so `SameSite=Lax` cookies work).

## 4. Web (Cloudflare Pages)

- [ ] Pages project `dungeon-hunter`, custom domain = `PUBLIC_HOST`.
- [ ] Build: `vp run @dh/web#build`, output `apps/web/dist`, `VITE_API_URL=/`.
- [ ] `apps/web/scripts/check-prod-bundle.sh` prints `production bundle clean`.

## 5. CI deploy

- [ ] GitHub secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- [ ] GitHub environment `production` with the owner as required reviewer (first deploy needs the owner's OK).
- [ ] Tag `v1.0.0` → `.github/workflows/deploy.yml` runs `vp run ready`, the bundle check, then deploys API and web.

## 6. Verify on the public URL

- [ ] Register, play to a death, shards credited on Results.
- [ ] DevTools → Application → Cookies: `dh_at` and `dh_rt` are `HttpOnly; Secure; SameSite=Lax; Path=/api`.
- [ ] Clear site data, log in again: shards, unlocks, Vault Logs and settings are back (M6 gate).
- [ ] In the console, a forged run is rejected with 422 and the balance does not change:
      `fetch('/api/runs', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runnerId: 'vex', seed: 'ABCD1234', sectorReached: 1, roomsCleared: 18, bossesKilled: 0, durationSec: 999, kills: 0, victory: false, logsFound: [] }) }).then(r => r.status)`
- [ ] Leaderboard loads for an account; guests see the "requires an account" panel.
- [ ] Cold load on Chrome DevTools "Fast 4G": Title screen interactive in < 5 s.

## 7. Success metrics (fill with measured values)

| Metric                                      | Target        | Measured | Owner / follow-up |
| ------------------------------------------- | ------------- | -------- | ----------------- |
| FPS, sandbox stress (300 bullets, 20 Bleed) | ≥ 58 for 60 s |          |                   |
| First load to Title (Fast 4G)               | < 5 s         |          |                   |
| Average run length                          | 20–30 min     |          |                   |
| First-time Core Warden win rate             | 10–20%        |          |                   |
| Testers starting a 2nd run unprompted       | ≥ 70%         |          |                   |
| Crashes in 20 consecutive runs (public URL) | 0             |          |                   |

Misses get an owner and a follow-up issue before launch.
