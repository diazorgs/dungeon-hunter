# 03 · Game Shell and Scene Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mount Phaser inside React with a clean lifecycle, define every scene and the typed React↔Phaser bridge, abstract input (keyboard/mouse/gamepad), load placeholder assets, and provide a dev sandbox.

**Architecture:** React's Zustand `screen` decides whether `<PhaserGame>` is mounted. `RunConfig` enters Phaser once through `game.registry`; results leave through the bridge's `run:ended`. Scenes are thin; systems hold behaviour. Pure helpers (input normalization, dev params) live in `game/logic/`.

**Tech Stack:** Phaser 4.2, React 19, Zustand 5, Tailwind 4.

**Milestone:** M1 · **Depends on:** 01, 02 · **Spec:** `DESIGN.md` §4, §11.1; PRD "Controls", "Screens and UX flow"; SETUP.md §5, §10

## Global Constraints

- `width: 480, height: 270, pixelArt: true`, `Phaser.Scale.FIT`, `autoCenter: CENTER_BOTH`, `input: { gamepad: true }`, `backgroundColor: '#0b0d12'`. Set camera `roundPixels` explicitly (Phaser 4 default is `false`).
- Phaser 4 APIs only (see `.claude/skills/pnpm-phaser-*`): `setTintMode`, Filters, `Vector2` (no `Geom.Point`).
- `game.destroy(true)` on unmount (StrictMode double-mount must not leave two games).
- `this.input.mouse?.disableContextMenu()` in `boot`.

## Review Focus

- Unmounting `<PhaserGame>` mid-run (e.g. browser back, HMR) must not leak listeners on the bridge; listener count returns to 0.
- Window resize and devtools open/close keep integer scaling and centred letterbox.
- Tab-out (blur) must release held keys/mouse so the Runner does not keep walking or firing on return.
- Gamepad connected after the scene started must be picked up; disconnect falls back to keyboard/mouse without a crash.
- Arrow keys and Space must not scroll the page while the canvas has focus.

## File Structure

```
apps/web/src/
  stores/session.ts                  # useSessionStore: screen, selectedRunnerId, lastRunSummary
  app/AppRouter.tsx, app/DevMenu.tsx # dev-only start screen until plan 22
  game/
    PhaserGame.tsx, config.ts
    bridge/emitter.ts, bridge/emitter.test.ts, bridge/bus.ts, bridge/types.ts
    scenes/keys.ts, BootScene.ts, PreloadScene.ts, DungeonScene.ts, HudScene.ts, PauseScene.ts, LiftScene.ts, SandboxScene.ts
    systems/InputSystem.ts
    content/textures.ts              # data id → texture/frame key
    logic/input.ts, logic/input.test.ts, logic/devParams.ts, logic/devParams.test.ts
  public/assets/sprites/placeholder.{png,json}, public/assets/CREDITS.md
```

---

### Task 1: Typed bridge emitter

**Interfaces:**

- Produces:
  - `createEmitter<E extends Record<string, (...a: never[]) => void>>(): { on<K>(k, fn): () => void; emit<K>(k, ...args): void; listenerCount(k?): number; clear(): void }`
  - `bus = createEmitter<BridgeEvents>()` with `BridgeEvents` and `RunConfig` exactly as DESIGN.md §4.3; `RunSummary = { result: RunResult; outcome: 'victory' | 'death' | 'abandon'; scrapEarned: number; newLogIds: LogId[] }`

- [ ] **Step 1:** Tests: `on` returns an unsubscribe that removes only that listener; `emit` with no listeners is a no-op; `listenerCount()` is 0 after `clear()`; a listener throwing does not stop later listeners (error is rethrown asynchronously via `queueMicrotask`).
- [ ] **Step 2:** `vp test src/game/bridge` → FAIL. **Step 3:** Implement. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(web): typed react-phaser bridge`.

### Task 2: PhaserGame mount and session router

**Interfaces:**

- Consumes: `RunConfig`, `bus`.
- Produces: `<PhaserGame config={RunConfig} />`; `createGameConfig(parent: HTMLElement, run: RunConfig): Phaser.Types.Core.GameConfig` registering scenes `[BootScene, PreloadScene, DungeonScene, HudScene, PauseScene, LiftScene, ...(import.meta.env.DEV ? [SandboxScene] : [])]`; `useSessionStore` with `screen: 'dev-menu' | 'run' | 'results'` (plan 22 extends the union), `startRun(config)`, `endRun(summary)`.

- [ ] **Step 1:** `PhaserGame` creates the game in `useLayoutEffect`, writes `run` to `game.registry.set('runConfig', run)`, subscribes `bus.on('run:ended', endRun)`, and on cleanup unsubscribes and calls `game.destroy(true)`.
- [ ] **Step 2:** Host element: computes the largest integer scale `k` with `480k ≤ innerWidth` and `270k ≤ innerHeight` (min 1), sizes itself `480k × 270k`, centred on `void`. Canvas gets `cursor: none` and `tabindex=0`; focus it on mount. Prevent default on Space/arrow/Tab keydown while focused.
- [ ] **Step 3:** `AppRouter` renders `DevMenu` (runner select vex, "Start run" with `generateSeed()`), `<PhaserGame>` for `run`, and a raw JSON dump of `lastRunSummary` for `results`.
- [ ] **Step 4: Verify manually:** `vp run dev`, start a run, press browser back/forward and toggle HMR twice; in devtools `document.querySelectorAll('canvas').length === 1` and `bus.listenerCount() === 1` (expose `bus` on `window.__dh` in DEV only).
- [ ] **Step 5:** Commit `feat(web): mount phaser in react with session router`.

### Task 3: Scene skeletons and placeholder assets

**Interfaces:**

- Produces: `SceneKey = { Boot: 'boot', Preload: 'preload', Dungeon: 'dungeon', Hud: 'hud', Pause: 'pause', Lift: 'lift', Sandbox: 'sandbox' } as const`; `textureFor(kind: 'weapon' | 'guardian' | 'runner' | 'boss' | 'pickup', id: string): { key: string; frame?: string }` (falls back to a magenta `missing` frame and `console.warn` once per id).

- [ ] **Step 1:** `BootScene`: disable context menu, read `runConfig`, start `preload`. `PreloadScene`: progress bar (steel-700 frame, amber-500 fill), load placeholder atlas, start `dungeon` and `launch` `hud`. `DungeonScene`: empty floor of placeholder tiles, emits `run:ended` with outcome `abandon` on a debug key (F9, DEV only). `PauseScene`: Esc toggles; pauses `dungeon` only. `LiftScene`: placeholder text.
- [ ] **Step 2:** Pick a CC0 / permissive prototype pack (e.g. 0x72 Dungeon Tileset II; verify licence on its page), pack into `placeholder.png/json`. Add entry to `public/assets/CREDITS.md` (name, author, URL, licence, date checked).
- [ ] **Step 3: Verify manually:** start run → floor visible, Esc pauses (world frozen, overlay visible), Esc resumes; F9 returns to results screen with outcome `abandon`.
- [ ] **Step 4:** Commit `feat(web): scene skeletons and placeholder assets`.

### Task 4: Input abstraction

**Interfaces:**

- Produces:
  - `logic/input.ts`: `normalizeMove(up: boolean, down: boolean, left: boolean, right: boolean): { x: number; y: number }`; `stickToMove(x: number, y: number, deadzone = 0.2): { x: number; y: number }`; `padAimPoint(player: Vec2, stick: Vec2, reach = 96, deadzone = 0.25, lastAim: Vec2): Vec2`
  - `systems/InputSystem.ts`: `class InputSystem { constructor(scene: Phaser.Scene); read(camera: Phaser.Cameras.Scene2D.Camera, playerPos: Vec2): InputState }` with `InputState` from DESIGN.md §4.6

- [ ] **Step 1: Tests:** `normalizeMove(true, false, false, true)` has length ≈ 1 (diagonal normalized); opposing keys cancel to `{x:0,y:0}`; `stickToMove(0.1, 0.1)` is zero inside deadzone; `padAimPoint` with a zero stick returns `lastAim` (aim does not snap back).
- [ ] **Step 2:** → FAIL. **Step 3:** Implement logic, then `InputSystem` (keys per DESIGN.md §4.6; wheel delta → `swap`; `dash`/`skill`/`swap`/`interact`/`pause`/`map` edge-triggered; pointer world position from `camera.getWorldPoint`). On `game.events` `blur`, reset all key states. Gamepad branch reads `this.input.gamepad.pad1` when present and sets `device: 'pad'` once any pad input is non-zero. **Step 4:** → PASS.
- [ ] **Step 5: Verify manually:** a debug text in the sandbox shows the live `InputState`; alt-tab while holding W, return → `move` is zero.
- [ ] **Step 6:** Commit `feat(web): input abstraction with keyboard, mouse, gamepad`.

### Task 5: Dev sandbox and dev params

**Interfaces:**

- Produces: `parseDevParams(search: string): { scene?: 'sandbox'; seed?: string; sector?: 1 | 2 | 3; room?: string; god?: boolean; spawn?: string[] }` (invalid values dropped, seed must pass `isValidSeed`); `SandboxScene` with an FPS readout and buttons/keys: `1` spawn 300 dummy enemy bullets in a ring, `2` clear, `G` god mode toggle. Later plans add spawn entries.

- [ ] **Step 1:** Tests: `parseDevParams('?scene=sandbox&sector=4&seed=bad')` → `{ scene: 'sandbox' }`; `'?spawn=crawler,sentry-drone&god=1'` → `{ spawn: ['crawler', 'sentry-drone'], god: true }`.
- [ ] **Step 2:** → FAIL. **Step 3:** Implement; `BootScene` starts `sandbox` instead of `preload → dungeon` when `scene=sandbox` in DEV. **Step 4:** → PASS.
- [ ] **Step 5:** Commit `feat(web): dev sandbox and url params`.

## Acceptance

- [ ] Only one canvas ever exists; no bridge listener leak after 10 start/abandon cycles.
- [ ] Keyboard, mouse and a gamepad all drive `InputState` correctly.
- [ ] `?scene=sandbox` loads in DEV; production build excludes `SandboxScene` (grep the bundle for `sandbox`).
