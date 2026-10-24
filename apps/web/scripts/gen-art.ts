// Draws the original game art and writes it to public/assets: Runner, guardian, weapon and boss
// atlases (Phaser json-array, frames `<id>/<anim>/<i>`), Runner portraits, the three sector
// tilesets and the story-card scenes. Run: node scripts/gen-art.ts. Original art, public domain
// (CREDITS.md). Sizes match the textures the hitboxes were tuned on (runners 16×24, guardians
// 16×16, bosses 64×64, Hydra core 32×32, heads 16×16, Warden arm 10×10).
import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { PALETTE } from "../../../packages/shared/src/palette.ts";
import type { PaletteToken } from "../../../packages/shared/src/palette.ts";

type C = PaletteToken;
interface Frame {
  name: string;
  w: number;
  h: number;
  px: Uint32Array; // 0 = transparent, else 0xRRGGBB + 1<<24
}

function frame(name: string, w: number, h: number, draw: (g: Gfx) => void): Frame {
  const f: Frame = { name, w, h, px: new Uint32Array(w * h) };
  draw(new Gfx(f));
  return f;
}

/** Deterministic noise so regenerating the art gives the same pixels. */
const hash = (x: number, y: number, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

class Gfx {
  private readonly f: Frame;
  constructor(f: Frame) {
    this.f = f;
  }
  rect(c: C, x: number, y: number, w: number, h: number): this {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i >= 0 && j >= 0 && i < this.f.w && j < this.f.h)
          this.f.px[j * this.f.w + i] = PALETTE[c] | (1 << 24);
    return this;
  }
  px(c: C, x: number, y: number): this {
    return this.rect(c, x, y, 1, 1);
  }
  /** Rect with its four corner pixels cut, the basic chibi head/body shape. */
  rrect(c: C, x: number, y: number, w: number, h: number): this {
    this.rect(c, x + 1, y, w - 2, h).rect(c, x, y + 1, w, h - 2);
    return this;
  }
  /** Filled circle, for cores and eyes. */
  disc(c: C, cx: number, cy: number, r: number): this {
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++)
        if (i * i + j * j <= r * r + r * 0.6) this.px(c, cx + i, cy + j);
    return this;
  }
  /** Filled ellipse. */
  oval(c: C, cx: number, cy: number, rx: number, ry: number): this {
    for (let j = -ry; j <= ry; j++)
      for (let i = -rx; i <= rx; i++)
        if ((i * i) / (rx * rx + 0.5) + (j * j) / (ry * ry + 0.5) <= 1) this.px(c, cx + i, cy + j);
    return this;
  }
  line(c: C, x0: number, y0: number, x1: number, y1: number): this {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++)
      this.px(c, Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n));
    return this;
  }
  /** Checkerboard of `c` over the area: the palette-only way to blend two bands. */
  dither(c: C, x: number, y: number, w: number, h: number, phase = 0): this {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) if ((i + j + phase) % 2 === 0) this.px(c, i, j);
    return this;
  }
  /** Scatter single pixels of `c` with probability `p`. */
  speckle(c: C, x: number, y: number, w: number, h: number, p: number, seed: number): this {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) if (hash(i, j, seed) < p) this.px(c, i, j);
    return this;
  }
  /** Every drawn pixel becomes `c` (hurt flash silhouette). */
  fill(c: C): this {
    const v = PALETTE[c] | (1 << 24);
    for (let i = 0; i < this.f.px.length; i++) if (this.f.px[i]) this.f.px[i] = v;
    return this;
  }
  /** Copies another frame in at `scale`× (story cards reuse the sprites). */
  blit(src: Frame, x: number, y: number, scale = 1): this {
    for (let j = 0; j < src.h * scale; j++)
      for (let i = 0; i < src.w * scale; i++) {
        const v = src.px[Math.floor(j / scale) * src.w + Math.floor(i / scale)]!;
        const X = x + i,
          Y = y + j;
        if (v && X >= 0 && Y >= 0 && X < this.f.w && Y < this.f.h) this.f.px[Y * this.f.w + X] = v;
      }
    return this;
  }
  /** 1 px dark outline around everything drawn so far, so silhouettes read on any floor. */
  outline(c: C = "ink"): this {
    const { w, h, px } = this.f;
    const src = px.slice();
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (src[y * w + x]) continue;
        const n = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => {
          const X = x + dx!,
            Y = y + dy!;
          return X >= 0 && Y >= 0 && X < w && Y < h && src[Y * w + X];
        });
        if (n) px[y * w + x] = PALETTE[c] | (1 << 24);
      }
    return this;
  }
}

// ---------- Runners (16×24, chibi, 3/4 view facing right) ----------
interface Pose {
  bob?: number;
  /** -1 / 1 lifts one leg (run cycle). */
  step?: number;
  lean?: number;
  flash?: boolean;
  blink?: boolean;
}

function legs(g: Gfx, step: number, l: number, cloth: C, boot: C) {
  const a = step > 0 ? 1 : 0,
    b = step < 0 ? 1 : 0;
  g.rect(cloth, 5 + l, 19 - a, 3, 3).rect(boot, 5 + l, 21 - a, 3, 2);
  g.rect(cloth, 9 + l, 19 - b, 3, 3).rect(boot, 9 + l, 21 - b, 3, 2);
}

function vex(g: Gfx, o: Pose) {
  const b = o.bob ?? 0,
    l = o.lean ?? 0;
  legs(g, o.step ?? 0, l, "steel-800", "steel-900");
  // torso: breacher plate, amber core emblem, rust belt
  g.rrect("steel-500", 4 + l, 13 + b, 8, 7).rect("steel-300", 5 + l, 13 + b, 2, 3);
  g.rect("steel-600", 11 + l, 14 + b, 1, 5).rect("amber-500", 7 + l, 15 + b, 2, 2);
  g.rect("rust-500", 4 + l, 18 + b, 8, 1);
  g.rect("steel-300", 3 + l, 13 + b, 2, 3); // back pauldron
  g.rect("steel-500", 11 + l, 15 + b, 2, 3).px("steel-300", 12 + l, 17 + b); // front arm + gauntlet
  // helmet: big round dome, plume, face opening
  g.rrect("steel-400", 2 + l, 1 + b, 12, 12);
  g.rect("steel-300", 4 + l, 2 + b, 6, 2).px("bone", 4 + l, 2 + b);
  g.rect("steel-600", 3 + l, 11 + b, 10, 1).rect("steel-600", 13 + l, 3 + b, 1, 8);
  g.rect("rust-500", 3 + l, 0 + b, 6, 2).rect("amber-500", 3 + l, 0 + b, 2, 1);
  g.rect("steel-600", 6 + l, 5 + b, 8, 1); // visor brim
  g.rect("skin", 7 + l, 6 + b, 6, 4).rect("skin-dark", 7 + l, 9 + b, 6, 1);
  if (!o.blink) g.rect("ink", 8 + l, 7 + b, 1, 2).rect("ink", 11 + l, 7 + b, 1, 2);
  else g.rect("ink", 8 + l, 8 + b, 1, 1).rect("ink", 11 + l, 8 + b, 1, 1);
  g.rect("steel-500", 7 + l, 10 + b, 6, 1); // chin guard
  if (o.flash) g.fill("bone");
  g.outline();
}

function kit(g: Gfx, o: Pose) {
  const b = o.bob ?? 0,
    l = o.lean ?? 0;
  legs(g, o.step ?? 0, l, "steel-700", "rust-700");
  // backpack with drone dock, then the teal jacket
  g.rect("rust-700", 2 + l, 13 + b, 3, 6).rect("scrap", 2 + l, 14 + b, 1, 1);
  g.rect("teal-200", 2 + l, 12 + b, 2, 1);
  g.rrect("teal-600", 4 + l, 13 + b, 8, 7).rect("teal-400", 5 + l, 13 + b, 2, 4);
  g.rect("amber-500", 5 + l, 13 + b, 6, 1); // scarf
  g.rect("steel-700", 4 + l, 18 + b, 8, 1).px("scrap", 7 + l, 18 + b);
  g.rect("teal-600", 11 + l, 15 + b, 2, 3).px("skin", 12 + l, 17 + b);
  // head: messy hair, goggles pushed up, big eyes
  g.rrect("rust-700", 2 + l, 1 + b, 12, 12);
  g.rect("rust-500", 4 + l, 2 + b, 7, 2).px("amber-500", 6 + l, 2 + b);
  g.rrect("skin", 6 + l, 5 + b, 8, 7).rect("skin-dark", 6 + l, 11 + b, 7, 1);
  g.rect("rust-700", 6 + l, 5 + b, 3, 2).px("rust-700", 9 + l, 5 + b); // bangs
  g.rect("bone", 2 + l, 4 + b, 12, 1).rect("teal-200", 8 + l, 3 + b, 2, 2);
  g.rect("teal-200", 11 + l, 3 + b, 2, 2);
  if (!o.blink) g.rect("ink", 8 + l, 7 + b, 1, 2).rect("ink", 11 + l, 7 + b, 1, 2);
  else g.rect("ink", 8 + l, 8 + b, 1, 1).rect("ink", 11 + l, 8 + b, 1, 1);
  g.px("hp", 12 + l, 10 + b); // blush
  if (o.flash) g.fill("bone");
  g.outline();
}

const RUNNER_DRAW = { vex, kit } as const;

function runnerFrames(id: "vex" | "kit"): Frame[] {
  const d = RUNNER_DRAW[id];
  const f = (anim: string, i: number, draw: (g: Gfx) => void) =>
    frame(`${id}/${anim}/${i}`, 16, 24, draw);
  const lying = (g: Gfx) => {
    const body: C = id === "vex" ? "steel-500" : "teal-600";
    const head: C = id === "vex" ? "steel-400" : "rust-700";
    g.rect(body, 6, 18, 9, 5).rrect(head, 0, 15, 8, 8).rect("skin", 2, 18, 4, 3);
    g.rect("ink", 3, 19, 1, 1).rect("ink", 5, 19, 1, 1).outline();
  };
  return [
    f("idle", 0, (g) => d(g, {})),
    f("idle", 1, (g) => d(g, { bob: 1, blink: true })),
    f("run", 0, (g) => d(g, { step: 1 })),
    f("run", 1, (g) => d(g, { bob: 1 })),
    f("run", 2, (g) => d(g, { step: -1 })),
    f("run", 3, (g) => d(g, { bob: 1 })),
    f("dash", 0, (g) => d(g, { lean: 1, step: 1 })),
    f("hurt", 0, (g) => d(g, { flash: true })),
    f("death", 0, (g) => d(g, { bob: 1, flash: true })),
    f("death", 1, (g) => d(g, { bob: 2, blink: true })),
    f("death", 2, lying),
  ];
}

// ---------- Guardians (16×16, 3/4 view facing right) ----------
type GDraw = (g: Gfx, i: number) => void;
const GUARDIAN_DRAW: Record<string, GDraw> = {
  "sentry-drone": (g, i) => {
    const b = i;
    g.rect("steel-300", i ? 5 : 2, 1, i ? 6 : 12, 1).rect("steel-600", 7, 2, 2, 2);
    g.rrect("steel-500", 3, 4 + b, 10, 8).rect("steel-300", 4, 4 + b, 6, 2);
    g.rect("steel-700", 4, 11 + b, 8, 1);
    g.rect("ink", 8, 6 + b, 4, 3).rect(i ? "amber-100" : "amber-300", 9, 7 + b, 2, 1);
    g.px("teal-400", 5, 12 + b).px("teal-400", 10, 12 + b);
    g.outline();
  },
  crawler: (g, i) => {
    for (const x of [3, 6, 9, 12]) g.rect("steel-700", x, 12 + ((x + i) % 2), 1, 2);
    g.rrect("rust-500", 2, 5, 12, 8).rect("amber-500", 4, 6, 5, 1).rect("rust-700", 3, 11, 10, 1);
    g.rect("ink", 6, 3, 4, 2).rect(i ? "amber-300" : "hp", 7, 3, 2, 1);
    g.px("amber-300", 11, 8).px("amber-300", 13, 8);
    g.outline();
  },
  "turret-node": (g, i) => {
    g.rect("steel-700", 2, 10, 12, 5).rect("steel-600", 2, 10, 12, 2).rect("ink", 4, 13, 8, 1);
    g.disc("steel-500", 7, 7, 4).rect("steel-300", 5, 4, 4, 1);
    g.rect("steel-300", 10 - i, 6, 6, 2).rect("ink", 15 - i, 6, 1, 2);
    g.rect("ink", 5, 6, 3, 3).px(i ? "hp" : "amber-300", 6, 7);
    g.outline();
  },
  "shield-bot": (g, i) => {
    g.rect("steel-800", 4, 13, 3, 3).rect("steel-800", 8, 13, 3, 3);
    g.rrect("steel-600", 2, 3 + i, 10, 11).rect("steel-400", 3, 3 + i, 7, 2);
    g.rect("ink", 5, 6 + i, 6, 2).rect("teal-200", 6, 6 + i, 4, 1);
    g.rect("teal-400", 12, 2, 3, 13).rect("teal-200", 12, 3, 1, 11).rect("teal-600", 14, 3, 1, 11);
    g.outline();
  },
  "arc-spider": (g, i) => {
    const k = i ? 1 : 0;
    for (const [x0, y0, x1, y1] of [
      [5, 8, 1, 4 + k],
      [5, 9, 0, 10 - k],
      [6, 10, 2, 14],
      [10, 8, 14, 4 + k],
      [10, 9, 15, 10 - k],
      [9, 10, 13, 14],
    ] as const)
      g.line("steel-300", x0, y0, x1, y1);
    g.oval("teal-600", 8, 8, 4, 3).rect("teal-400", 6, 6, 4, 1);
    g.px("amber-300", 10, 8).px("amber-300", 11, 9);
    g.px(i ? "white" : "teal-200", 8, 3 + k).px("teal-200", 7, 4);
    g.outline();
  },
  "mortar-unit": (g, i) => {
    g.rect("steel-800", 2, 14, 12, 2).rect("ink", 3, 15, 1, 1).rect("ink", 11, 15, 1, 1);
    g.rect("rust-700", 2, 8, 12, 6).rect("rust-500", 2, 8, 12, 2).rect("amber-500", 4, 11, 2, 1);
    g.rect("steel-500", 7, 2 + i, 4, 7 - i).rect("steel-300", 7, 2 + i, 1, 6 - i);
    g.rect("ink", 7, 2 + i, 4, 1);
    g.outline();
  },
  "bleed-wraith": (g, i) => {
    g.rrect("bleed-700", 4, 1 + i, 8, 8).rect("bleed-700", 3, 8 + i, 10, 6);
    for (let x = 3; x < 13; x++) if ((x + i) % 2) g.px("bleed-700", x, 14 + i);
    g.rect("bleed-500", 3, 8 + i, 1, 6).rect("bleed-500", 5, 1 + i, 4, 1);
    g.rect("ink", 6, 4 + i, 5, 3)
      .px("bleed-300", 7, 5 + i)
      .px("bleed-300", 9, 5 + i);
    g.outline("void");
  },
};

function guardianFrames(): Frame[] {
  return Object.entries(GUARDIAN_DRAW).flatMap(([id, draw]) =>
    [0, 1].map((i) => frame(`${id}/idle/${i}`, 16, 16, (g) => draw(g, i))),
  );
}

// ---------- Weapons (held, 16×8, grip near x 3–5, muzzle at the right) ----------
interface Gun {
  len: number;
  body: C;
  hi: C;
  grip: C;
  accent: C;
  extra?: (g: Gfx) => void;
}
const gun = (o: Gun) => (g: Gfx) => {
  g.rect(o.body, 2, 2, o.len - 2, 3).rect(o.hi, 3, 2, o.len - 4, 1);
  g.rect(o.grip, 3, 5, 2, 2).rect(o.accent, 6, 3, 2, 1);
  g.rect("ink", o.len - 1, 3, 1, 1);
  o.extra?.(g);
  g.outline();
};
const WEAPON_DRAW: Record<string, (g: Gfx) => void> = {
  "rust-pistol": gun({
    len: 10,
    body: "rust-500",
    hi: "amber-500",
    grip: "rust-700",
    accent: "steel-300",
  }),
  "rivet-smg": gun({
    len: 12,
    body: "steel-500",
    hi: "steel-300",
    grip: "steel-800",
    accent: "amber-300",
    extra: (g) => g.rect("steel-700", 7, 5, 2, 2),
  }),
  "breach-shotgun": gun({
    len: 14,
    body: "rust-700",
    hi: "rust-500",
    grip: "rust-700",
    accent: "amber-500",
    extra: (g) => g.rect("steel-500", 8, 4, 6, 1),
  }),
  "line-rifle": gun({
    len: 15,
    body: "steel-600",
    hi: "steel-400",
    grip: "steel-800",
    accent: "teal-200",
    extra: (g) => g.rect("teal-400", 5, 1, 4, 1),
  }),
  "arc-carbine": gun({
    len: 13,
    body: "teal-600",
    hi: "teal-400",
    grip: "steel-800",
    accent: "teal-200",
    extra: (g) => g.px("white", 11, 3),
  }),
  "scatter-coil": gun({
    len: 12,
    body: "teal-800",
    hi: "teal-400",
    grip: "steel-800",
    accent: "scrap",
    extra: (g) => g.rect("teal-200", 8, 2, 1, 3).rect("teal-200", 10, 2, 1, 3),
  }),
  "pulse-lance": gun({
    len: 15,
    body: "steel-300",
    hi: "bone",
    grip: "steel-700",
    accent: "energy",
    extra: (g) => g.rect("shield", 12, 2, 3, 3),
  }),
  "fuse-launcher": gun({
    len: 13,
    body: "moss-500",
    hi: "moss-300",
    grip: "steel-800",
    accent: "hp",
    extra: (g) => g.rect("moss-700", 2, 1, 9, 1).rect("ink", 12, 2, 1, 3),
  }),
  "static-repeater": gun({
    len: 14,
    body: "bleed-700",
    hi: "bleed-500",
    grip: "steel-800",
    accent: "bleed-100",
    extra: (g) => g.disc("bleed-300", 9, 5, 1),
  }),
  "null-cannon": gun({
    len: 15,
    body: "steel-800",
    hi: "steel-600",
    grip: "ink",
    accent: "teal-200",
    extra: (g) => g.disc("teal-400", 11, 3, 2).px("bone", 11, 3),
  }),
  "shock-baton": (g) => {
    g.rect("steel-800", 2, 3, 4, 2).rect("steel-500", 6, 3, 7, 2).rect("steel-300", 6, 3, 7, 1);
    g.rect("teal-200", 13, 2, 2, 4).px("white", 14, 3).outline();
  },
  "grid-cutter": (g) => {
    g.rect("rust-700", 1, 3, 4, 2).rect("amber-500", 5, 2, 1, 4);
    g.rect("steel-300", 6, 3, 9, 2).rect("bone", 6, 3, 8, 1).px("bleed-300", 10, 4).outline();
  },
};

function weaponFrames(): Frame[] {
  return Object.entries(WEAPON_DRAW).map(([id, draw]) => frame(`${id}/idle/0`, 16, 8, draw));
}

// ---------- Sector tilesets (16×16, 3/4 view: raised wall caps over tall faces) ----------
// Tile ids (firstgid 1): 1 floor, 2 path/corridor floor, 3 wall (collision only), 4 crate,
// 5 floor decor, 6 corrupted prop, 7 wall face, 8–9 floor variants, 10 floor in a wall's shadow,
// 11–26 wall caps by open-side mask (N 1, E 2, S 4, W 8). See logic/dungeon/autotile.ts.
interface Theme {
  floor: C;
  floorDark: C;
  floorHi: C;
  path: C;
  pathDark: C;
  /** Wall cap: surface, its texture, the rim on open sides and the outline beyond it. */
  cap: C;
  capTex: C;
  capHi: C;
  rim: C;
  edge: C;
  face: C;
  faceDark: C;
  faceHi: C;
  faceAo: C;
  drip: C;
  /** Extra detail on a face tile (pipes, cracks). */
  faceDetail?: (g: Gfx, x: number) => void;
  decor: (g: Gfx) => void;
}

const THEMES: Record<1 | 2 | 3, Theme> = {
  // Storage Wing: the Vault's upper wing, overgrown. Grass floors, hedge-topped stone walls.
  1: {
    floor: "moss-700",
    floorDark: "moss-900",
    floorHi: "moss-500",
    path: "steel-700",
    pathDark: "steel-800",
    cap: "moss-700",
    capTex: "moss-500",
    capHi: "moss-300",
    rim: "moss-500",
    edge: "moss-900",
    face: "steel-600",
    faceDark: "steel-700",
    faceHi: "steel-500",
    faceAo: "steel-800",
    drip: "moss-500",
    decor: (g) => {
      for (const [x, h] of [
        [3, 6],
        [5, 9],
        [7, 7],
        [9, 10],
        [11, 6],
        [13, 8],
      ] as const)
        g.rect("moss-500", x, 15 - h, 1, h).px("moss-300", x, 15 - h);
      g.rect("moss-900", 2, 14, 13, 1).px("scrap", 8, 7).px("bone", 4, 9);
    },
  },
  // Conduit Works: teal machine halls, pipe runs along the walls.
  2: {
    floor: "steel-800",
    floorDark: "steel-900",
    floorHi: "steel-700",
    path: "teal-800",
    pathDark: "steel-900",
    cap: "steel-800",
    capTex: "steel-700",
    capHi: "teal-600",
    rim: "teal-400",
    edge: "ink",
    face: "steel-600",
    faceDark: "steel-700",
    faceHi: "steel-500",
    faceAo: "steel-800",
    drip: "teal-600",
    faceDetail: (g, x) => {
      g.rect("teal-600", x, 8, 16, 3).rect("teal-400", x, 8, 16, 1).rect("teal-800", x, 11, 16, 1);
      g.px("steel-300", x + 4, 5).px("steel-300", x + 12, 5);
    },
    decor: (g) => {
      g.rect("steel-700", 1, 3, 14, 10).rect("ink", 2, 4, 12, 8);
      for (let x = 3; x < 14; x += 2) g.rect("steel-600", x, 4, 1, 8);
      g.rect("teal-400", 1, 3, 14, 1);
    },
  },
  // Core Approach: dark plating split by the Bleed.
  3: {
    floor: "steel-900",
    floorDark: "ink",
    floorHi: "bleed-900",
    path: "steel-800",
    pathDark: "ink",
    cap: "bleed-900",
    capTex: "bleed-700",
    capHi: "bleed-500",
    rim: "bleed-500",
    edge: "void",
    face: "steel-700",
    faceDark: "steel-800",
    faceHi: "steel-600",
    faceAo: "ink",
    drip: "bleed-500",
    faceDetail: (g, x) => {
      g.line("bleed-700", x + 3, 4, x + 7, 12).line("bleed-500", x + 4, 4, x + 7, 10);
      g.px("bleed-300", x + 7, 10);
    },
    decor: (g) => {
      g.line("bleed-700", 0, 12, 15, 4)
        .line("bleed-500", 0, 13, 15, 5)
        .line("bleed-300", 4, 11, 9, 8);
    },
  },
};

function tileset(n: 1 | 2 | 3): Frame {
  const t = THEMES[n];
  const T = 16;
  return frame(`tiles-s${n}`, T * 26, T, (g) => {
    const at = (id: number, draw: (x: number) => void) => draw((id - 1) * T);
    const floor = (x: number, seed: number) => {
      g.rect(t.floor, x, 0, T, T).speckle(t.floorDark, x, 0, T, T, 0.1, seed);
      // short blades / scuffs instead of noise, so the floor reads as a surface
      for (let k = 0; k < 5; k++) {
        const bx = x + Math.floor(hash(k, seed, 1) * 15);
        const by = Math.floor(hash(seed, k, 2) * 14);
        g.rect(t.floorHi, bx, by, 1, 2);
      }
    };
    // A cap with open sky to the north is a 10 px slab (top 6 px transparent), so an actor
    // behind a south wall keeps its head and shoulders; runs of caps stay solid.
    const CAP_GAP = 6;
    const cap = (x: number, mask: number) => {
      const y0 = mask & 1 ? CAP_GAP : 0;
      const side = mask & 1 ? y0 + 1 : 0;
      g.rect(t.cap, x, y0, T, T - y0).speckle(t.capTex, x, y0, T, T - y0, 0.3, 30 + mask);
      g.speckle(t.capHi, x, y0, T, T - y0, 0.06, 50 + mask);
      if (mask & 1) g.rect(t.edge, x, y0, T, 1).rect(t.rim, x, y0 + 1, T, 1);
      if (mask & 8) g.rect(t.edge, x, y0, 1, T - y0).rect(t.rim, x + 1, side, 1, T - side);
      if (mask & 2)
        g.rect(t.edge, x + T - 1, y0, 1, T - y0).rect(t.rim, x + T - 2, side, 1, T - side);
      // the lip above a front face catches the light
      if (mask & 4) g.rect(t.capHi, x, T - 2, T, 1).rect(t.rim, x, T - 1, T, 1);
    };
    at(1, (x) => floor(x, 1));
    at(2, (x) => {
      // flagstone path
      g.rect(t.path, x, 0, T, T)
        .rect(t.pathDark, x, 7, T, 1)
        .rect(t.pathDark, x + 7, 0, 1, 7);
      g.rect(t.pathDark, x + 12, 8, 1, 8).rect(t.pathDark, x + 3, 8, 1, 8);
      g.px(t.floorHi, x + 2, 3).px(t.floorHi, x + 10, 12);
    });
    at(3, (x) => cap(x, 15));
    at(4, (x) => {
      // crate: lighter lid, plank front
      g.rect("amber-500", x + 1, 1, 14, 1).rect("rust-500", x + 1, 2, 14, 4);
      g.rect("rust-700", x + 1, 6, 14, 9)
        .rect("rust-500", x + 2, 8, 12, 1)
        .rect("rust-500", x + 2, 11, 12, 1);
      g.rect("amber-500", x + 7, 6, 2, 9).rect("ink", x + 1, 15, 14, 1);
    });
    at(5, (x) => g.blit(frame("decor", T, T, t.decor), x, 0));
    at(6, (x) => {
      // corrupted machine, lid + front with a magenta core
      g.rect("bleed-700", x + 2, 2, 12, 4).rect("bleed-500", x + 3, 2, 10, 1);
      g.rect("bleed-900", x + 2, 6, 12, 8)
        .disc("bleed-500", x + 8, 10, 2)
        .px("bleed-100", x + 8, 10);
      g.rect("ink", x + 2, 14, 12, 1);
    });
    at(7, (x) => {
      // front face: shadow under the cap lip, stone courses, ambient occlusion at the foot
      g.rect(t.face, x, 0, T, T).rect(t.faceAo, x, 0, T, 1);
      for (let row = 0; row < 3; row++) {
        const y = 1 + row * 5;
        g.rect(t.faceHi, x, y, T, 1).rect(t.faceDark, x, y + 4, T, 1);
        for (let bx = row % 2 ? 4 : 0; bx < T; bx += 8) g.rect(t.faceDark, x + bx, y, 1, 4);
      }
      t.faceDetail?.(g, x);
      for (const [dx, h] of [
        [2, 3],
        [3, 5],
        [9, 2],
        [13, 4],
      ] as const)
        g.rect(t.drip, x + dx, 0, 1, h);
      g.rect(t.faceAo, x, T - 2, T, 2);
    });
    at(8, (x) => {
      floor(x, 11);
      g.rect(t.floorHi, x + 4, 5, 1, 3)
        .rect(t.floorHi, x + 6, 4, 1, 4)
        .rect(t.floorHi, x + 9, 6, 1, 2);
    });
    at(9, (x) => {
      floor(x, 13);
      g.px(n === 1 ? "bone" : t.floorHi, x + 5, 6).px(n === 1 ? "scrap" : t.floorHi, x + 11, 11);
      g.rect(t.floorDark, x + 2, 12, 5, 1);
    });
    at(10, (x) => {
      floor(x, 1);
      g.rect(t.floorDark, x, 0, T, 4).dither(t.floorDark, x, 4, T, 3);
    });
    for (let mask = 0; mask < 16; mask++) at(11 + mask, (x) => cap(x, mask));
  });
}

// ---------- Story cards (240×112 scenes, shown at 2×) ----------
const CW = 240,
  CH = 112;

function sky(g: Gfx, bands: C[], h: number) {
  const step = Math.ceil(h / bands.length);
  bands.forEach((c, i) => {
    g.rect(c, 0, i * step, CW, step);
    if (i > 0) g.dither(c, 0, i * step - 2, CW, 2);
  });
}

function city(g: Gfx, base: number, lit: number, seed: number) {
  for (let x = 0; x < CW;) {
    const w = 10 + Math.floor(hash(x, 1, seed) * 18);
    const h = 14 + Math.floor(hash(x, 2, seed) * 30);
    const c: C = hash(x, 3, seed) > 0.5 ? "steel-900" : "ink";
    g.rect(c, x, base - h, w - 1, h);
    if (hash(x, 4, seed) > 0.7) g.rect(c, x + 3, base - h - 6, 2, 6);
    for (let wy = base - h + 3; wy < base - 2; wy += 4)
      for (let wx = x + 2; wx < x + w - 3; wx += 3)
        if (hash(wx, wy, seed) < lit)
          g.px(hash(wx, wy, seed + 9) > 0.3 ? "amber-300" : "amber-100", wx, wy);
    x += w;
  }
}

function strata(g: Gfx, top: number) {
  g.rect("rust-700", 0, top, CW, CH - top);
  for (let y = top + 6; y < CH; y += 7) g.dither("ink", 0, y, CW, 1, y);
  g.speckle("rust-500", 0, top, CW, CH - top, 0.04, 21);
}

function glowCore(g: Gfx, x: number, y: number, r: number, hot: C, mid: C, core: C) {
  for (let k = r + 6; k > r; k -= 2)
    for (let a = 0; a < 48; a++) {
      const t = (a / 48) * Math.PI * 2;
      if (a % 2) g.px(mid, Math.round(x + Math.cos(t) * k), Math.round(y + Math.sin(t) * k * 0.6));
    }
  g.oval(mid, x, y, r, Math.round(r * 0.7)).oval(hot, x, y, r - 2, Math.round(r * 0.5));
  g.oval(core, x, y, Math.max(1, r - 5), Math.max(1, Math.round(r * 0.3)));
}

function vigilEye(g: Gfx, x: number, y: number, iris: C, glow: C) {
  g.rrect("steel-700", x - 16, y - 12, 32, 24).rrect("ink", x - 13, y - 9, 26, 18);
  g.oval(glow, x, y, 10, 5)
    .oval(iris, x, y, 5, 4)
    .disc("ink", x, y, 2)
    .px("white", x - 2, y - 2);
}

function doorway(g: Gfx, x: number, y: number, open: boolean, light: C) {
  g.rect("steel-600", x, y, 28, 36).rect("steel-800", x + 2, y + 2, 24, 34);
  if (open) g.rect("amber-100", x + 4, y + 4, 20, 32).dither("amber-300", x + 4, y + 4, 20, 32);
  else g.rect("steel-700", x + 4, y + 4, 20, 32).rect(light, x + 4, y + 18, 20, 3);
  g.rect(light, x + 12, y - 4, 4, 2);
}

const CARD_DRAW: Record<string, (g: Gfx) => void> = {
  "card-veyra": (g) => {
    sky(g, ["void", "ink", "steel-900"], 56);
    g.speckle("steel-400", 0, 0, CW, 30, 0.01, 1).speckle("bone", 0, 0, CW, 24, 0.004, 2);
    city(g, 58, 0.2, 3);
    strata(g, 58);
    for (const sx of [60, 118, 176])
      g.rect("ink", sx, 58, 3, 34).rect("amber-500", sx + 1, 60, 1, 30);
    g.rect("steel-800", 40, 90, 160, 22);
    glowCore(g, 120, 100, 12, "amber-300", "amber-500", "amber-100");
  },
  "card-vault": (g) => {
    g.rect("steel-900", 0, 0, CW, CH);
    for (const y of [0, 37, 74]) {
      g.rect("steel-800", 0, y + 30, CW, 7).rect("steel-700", 0, y + 30, CW, 1);
      for (let x = 6; x < 150; x += 22) g.rect("amber-500", x, y + 4, 2, 2);
    }
    for (const [x, y] of [
      [12, 8],
      [60, 45],
      [104, 8],
    ] as const)
      doorway(g, x, y, false, "amber-500");
    for (const [x, y] of [
      [48, 20],
      [90, 57],
      [140, 20],
    ] as const)
      g.rect("rust-500", x, y, 10, 3)
        .rect("rust-700", x, y + 3, 10, 7)
        .rect("amber-500", x + 4, y + 3, 2, 7);
    g.rect("teal-800", 150, 0, 3, CH).rect("teal-600", 154, 0, 2, CH);
    vigilEye(g, 200, 50, "teal-200", "teal-400");
    g.rect("teal-600", 176, 70, 48, 2).speckle("teal-200", 172, 76, 56, 20, 0.05, 4);
    // the upper wing is overgrown: vines hang from each level's ceiling
    for (const y of [0, 37, 74])
      for (let x = 2; x < 148; x += 5) {
        const len = 2 + Math.floor(hash(x, y, 12) * 9);
        g.rect(hash(x, y, 13) > 0.5 ? "moss-500" : "moss-700", x, y, 1, len);
        if (len > 6) g.px("moss-300", x + 1, y + len - 2);
      }
    g.speckle("moss-500", 0, 28, 150, 3, 0.4, 14).speckle("moss-500", 0, 65, 150, 3, 0.4, 15);
  },
  "card-malfunction": (g) => {
    g.rect("steel-900", 0, 0, CW, CH).rect("steel-800", 0, 78, CW, 34);
    for (let x = 0; x < CW; x += 16) g.rect("steel-700", x, 78, 1, 34);
    g.rect("steel-700", 0, 76, CW, 2);
    doorway(g, 106, 40, false, "hp");
    g.rect("hp", 106, 34, 28, 2);
    const vein = (x0: number, y0: number, n: number, seed: number) => {
      let x = x0,
        y = y0;
      for (let k = 0; k < n; k++) {
        const nx = x + Math.round((hash(k, 1, seed) - 0.5) * 14);
        const ny = y + Math.round((hash(k, 2, seed) - 0.3) * 10);
        g.line("bleed-700", x, y + 1, nx, ny + 1).line("bleed-500", x, y, nx, ny);
        x = nx;
        y = ny;
      }
      g.disc("bleed-300", x, y, 1);
    };
    for (let s = 0; s < 9; s++) vein(20 + s * 24, 104 - (s % 3) * 8, 7, s);
    g.speckle("bleed-300", 0, 0, CW, 70, 0.01, 8).speckle("white", 60, 20, 30, 30, 0.02, 9);
    g.rect("steel-600", 30, 30, 30, 20).rect("ink", 33, 33, 24, 10).rect("bleed-500", 35, 36, 6, 3);
    g.rect("steel-600", 180, 26, 34, 24)
      .rect("ink", 183, 29, 28, 12)
      .rect("bleed-300", 186, 33, 10, 2);
  },
  "card-runner": (g) => {
    g.rect("ink", 0, 0, CW, CH);
    g.rect("steel-800", 70, 0, 100, CH)
      .rect("steel-700", 70, 0, 4, CH)
      .rect("steel-700", 166, 0, 4, CH);
    for (let y = 6; y < CH; y += 14) g.rect("steel-600", 74, y, 92, 1);
    for (const x of [72, 168])
      for (let y = 0; y < CH; y += 3)
        if (hash(x, y, 4) > 0.45) g.px("moss-500", x + Math.round(hash(y, x, 5) * 3) - 1, y);
    g.dither("amber-100", 96, 0, 48, 92).dither("amber-300", 100, 0, 40, 92, 1);
    g.rect("steel-600", 82, 92, 76, 6)
      .rect("amber-500", 82, 92, 76, 1)
      .rect("steel-800", 86, 98, 68, 3);
    g.speckle("amber-100", 96, 0, 48, 90, 0.03, 6);
    g.blit(
      frame("hero", 16, 24, (h) => vex(h, {})),
      96,
      20,
      3,
    );
  },
  "card-shutdown": (g) => {
    g.rect("void", 0, 0, CW, CH);
    g.rect("steel-900", 60, 84, 120, 28).rect("steel-800", 60, 84, 120, 2);
    glowCore(g, 120, 56, 22, "steel-700", "steel-800", "steel-600");
    g.line("ink", 112, 46, 124, 60).line("ink", 124, 60, 118, 68).line("ink", 128, 48, 134, 58);
    g.speckle("amber-500", 80, 20, 80, 70, 0.006, 3).speckle("rust-500", 70, 30, 100, 60, 0.01, 4);
  },
  "card-vigil": (g) => {
    g.rect("steel-900", 0, 0, CW, CH).rect("steel-800", 0, 84, CW, 28);
    for (const x of [14, 62, 150, 198]) {
      doorway(g, x, 48, true, "heal");
      g.dither("amber-100", x + 2, 84, 24, 20);
    }
    vigilEye(g, 120, 40, "teal-200", "teal-400");
    g.speckle("teal-200", 90, 60, 60, 40, 0.03, 5);
  },
  "card-veyra-lights": (g) => {
    sky(g, ["steel-900", "steel-700", "amber-500", "amber-300"], 64);
    g.disc("amber-100", 180, 60, 9);
    city(g, 80, 0.85, 3);
    g.rect("ink", 0, 80, CW, 32).speckle("amber-300", 0, 82, CW, 30, 0.05, 9);
    g.speckle("amber-100", 0, 84, CW, 28, 0.02, 10);
  },
};

// ---------- Bosses ----------
function gatekeeper(
  g: Gfx,
  o: { recoil?: number; lights?: boolean; stunned?: boolean; broken?: number },
) {
  const r = o.recoil ?? 0;
  const hull: C = o.stunned ? "steel-600" : "steel-500";
  // treads
  g.rect("steel-900", 4, 42, 56, 14).rect("steel-700", 6, 44, 52, 10);
  for (let x = 8; x < 56; x += 6) g.rect("steel-900", x, 46, 2, 6);
  // hull
  g.rect(hull, 8, 22, 48, 22).rect("steel-300", 10, 22, 44, 2).rect("rust-500", 8, 40, 48, 2);
  for (let x = 12; x < 54; x += 10) g.rect("amber-500", x, 36, 6, 2).rect("ink", x + 3, 36, 3, 2);
  // turret + cannon
  g.rect(hull, 18, 10, 28, 14).rect("steel-300", 20, 10, 24, 2);
  g.rect("steel-700", 46 - r, 14, 16, 6).rect("steel-900", 58 - r, 15, 4, 4);
  // sensor eye
  g.rect("ink", 24, 14, 12, 6).rect(
    o.stunned ? "steel-400" : o.lights ? "bleed-300" : "amber-300",
    26,
    16,
    8,
    2,
  );
  if (o.lights) g.rect("hp", 10, 26, 3, 3).rect("hp", 51, 26, 3, 3);
  for (let i = 0; i < (o.broken ?? 0) * 6; i++)
    g.px("ink", 10 + ((i * 17) % 44), 24 + ((i * 7) % 18));
  g.outline();
}

function warden(g: Gfx, o: { pulse?: number; open?: boolean; broken?: number }) {
  const p = o.pulse ?? 0;
  // angular shell plates
  g.rect("bleed-900", 12, 8, 40, 48)
    .rect("bleed-700", 8, 16, 48, 32)
    .rect("bleed-700", 16, 4, 32, 56);
  g.rect("steel-700", 10, 18, 6, 28).rect("steel-700", 48, 18, 6, 28);
  g.rect("steel-600", 18, 6, 28, 4).rect("steel-600", 18, 54, 28, 4);
  // core eye
  g.disc("bleed-500", 32, 32, o.open ? 12 : 10)
    .disc("bleed-300", 32, 32, 6 + p)
    .disc("bleed-100", 32, 32, 2 + p);
  // cracks
  g.rect("bleed-300", 20, 12, 1, 6).rect("bleed-300", 44, 46, 1, 6).rect("bleed-300", 12, 30, 4, 1);
  for (let i = 0; i < (o.broken ?? 0) * 8; i++)
    g.px("ink", 14 + ((i * 13) % 36), 10 + ((i * 11) % 44));
  g.outline("void");
}

function hydraCore(g: Gfx, o: { pulse?: number; broken?: number }) {
  g.rect("teal-800", 2, 4, 28, 24).rect("teal-800", 4, 2, 24, 28);
  g.rect("teal-600", 6, 6, 20, 20).rect("teal-400", 6, 6, 20, 2);
  // pipes
  g.rect("steel-600", 0, 12, 4, 8).rect("steel-600", 28, 12, 4, 8).rect("steel-600", 12, 28, 8, 4);
  g.disc("bleed-500", 16, 16, 4 + (o.pulse ?? 0)).disc("bleed-100", 16, 16, 1);
  for (let i = 0; i < (o.broken ?? 0) * 5; i++) g.px("ink", 7 + ((i * 7) % 18), 7 + ((i * 5) % 18));
  g.outline();
}

function hydraHead(g: Gfx, o: { open?: boolean }) {
  g.rect("teal-600", 2, 3, 12, 10).rect("teal-400", 3, 3, 10, 2).rect("steel-700", 6, 13, 4, 3);
  g.rect("ink", 4, 7, 8, o.open ? 5 : 3).rect("bleed-300", 6, 8, 4, o.open ? 3 : 1);
  g.px("teal-200", 4, 5).px("teal-200", 11, 5);
  g.outline();
}

function wardenArm(g: Gfx) {
  g.rect("steel-600", 1, 0, 8, 10)
    .rect("steel-400", 2, 1, 6, 2)
    .rect("bleed-500", 4, 5, 2, 3)
    .outline("void");
}

function bossFrames(): Frame[] {
  const B = (name: string, anim: string, i: number, w: number, h: number, draw: (g: Gfx) => void) =>
    frame(`${name}/${anim}/${i}`, w, h, draw);
  const big = (name: string, anim: string, i: number, d: (g: Gfx) => void) =>
    B(name, anim, i, 64, 64, d);
  return [
    big("gatekeeper", "idle", 0, (g) => gatekeeper(g, {})),
    big("gatekeeper", "idle", 1, (g) => gatekeeper(g, { lights: true })),
    big("gatekeeper", "attack", 0, (g) => gatekeeper(g, { lights: true })),
    big("gatekeeper", "attack", 1, (g) => gatekeeper(g, { lights: true, recoil: 3 })),
    big("gatekeeper", "stunned", 0, (g) => gatekeeper(g, { stunned: true })),
    big("gatekeeper", "death", 0, (g) => gatekeeper(g, { broken: 1 })),
    big("gatekeeper", "death", 1, (g) => gatekeeper(g, { stunned: true, broken: 2 })),
    big("gatekeeper", "death", 2, (g) => gatekeeper(g, { stunned: true, broken: 4 })),
    big("core-warden", "idle", 0, (g) => warden(g, {})),
    big("core-warden", "idle", 1, (g) => warden(g, { pulse: 1 })),
    big("core-warden", "attack", 0, (g) => warden(g, { open: true, pulse: 1 })),
    big("core-warden", "attack", 1, (g) => warden(g, { open: true, pulse: 2 })),
    big("core-warden", "stunned", 0, (g) => warden(g, { pulse: -2 })),
    big("core-warden", "death", 0, (g) => warden(g, { broken: 1 })),
    big("core-warden", "death", 1, (g) => warden(g, { broken: 2, pulse: -2 })),
    big("core-warden", "death", 2, (g) => warden(g, { broken: 4, pulse: -4 })),
    B("conduit-hydra", "idle", 0, 32, 32, (g) => hydraCore(g, {})),
    B("conduit-hydra", "idle", 1, 32, 32, (g) => hydraCore(g, { pulse: 1 })),
    B("conduit-hydra", "attack", 0, 32, 32, (g) => hydraCore(g, { pulse: 2 })),
    B("conduit-hydra", "attack", 1, 32, 32, (g) => hydraCore(g, { pulse: 1 })),
    B("conduit-hydra", "stunned", 0, 32, 32, (g) => hydraCore(g, { pulse: -1 })),
    B("conduit-hydra", "death", 0, 32, 32, (g) => hydraCore(g, { broken: 1 })),
    B("conduit-hydra", "death", 1, 32, 32, (g) => hydraCore(g, { broken: 3, pulse: -2 })),
    B("hydra-head", "idle", 0, 16, 16, (g) => hydraHead(g, {})),
    B("hydra-head", "attack", 0, 16, 16, (g) => hydraHead(g, { open: true })),
    B("warden-arm", "idle", 0, 10, 10, (g) => wardenArm(g)),
  ];
}

// ---------- Packing + PNG ----------
function pack(file: string, frames: Frame[]): void {
  const W = 256;
  let x = 0,
    y = 0,
    rowH = 0;
  const placed = frames.map((f) => {
    if (x + f.w > W) {
      x = 0;
      y += rowH + 1;
      rowH = 0;
    }
    const at = { f, x, y };
    x += f.w + 1;
    rowH = Math.max(rowH, f.h);
    return at;
  });
  const H = y + rowH;
  const rgba = Buffer.alloc(W * H * 4);
  for (const { f, x: ox, y: oy } of placed)
    for (let j = 0; j < f.h; j++)
      for (let i = 0; i < f.w; i++) {
        const v = f.px[j * f.w + i]!;
        if (!v) continue;
        const o = ((oy + j) * W + ox + i) * 4;
        rgba[o] = (v >> 16) & 0xff;
        rgba[o + 1] = (v >> 8) & 0xff;
        rgba[o + 2] = v & 0xff;
        rgba[o + 3] = 0xff;
      }
  writeFileSync(`public/assets/sprites/${file}.png`, png(W, H, rgba));
  const json = {
    frames: placed.map(({ f, x, y }) => ({
      filename: f.name,
      frame: { x, y, w: f.w, h: f.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
      sourceSize: { w: f.w, h: f.h },
    })),
    meta: { app: "scripts/gen-art.ts", image: `${file}.png`, size: { w: W, h: H }, scale: "1" },
  };
  writeFileSync(`public/assets/sprites/${file}.json`, `${JSON.stringify(json, null, 1)}\n`);
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf: Buffer): number {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w: number, h: number, rgba: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** One frame as a standalone PNG. */
function writeImage(path: string, f: Frame): void {
  const rgba = Buffer.alloc(f.w * f.h * 4);
  f.px.forEach((v, i) => {
    if (!v) return;
    rgba[i * 4] = (v >> 16) & 0xff;
    rgba[i * 4 + 1] = (v >> 8) & 0xff;
    rgba[i * 4 + 2] = v & 0xff;
    rgba[i * 4 + 3] = 0xff;
  });
  writeFileSync(path, png(f.w, f.h, rgba));
}

const runners = [...runnerFrames("vex"), ...runnerFrames("kit")];
pack("runners", runners);
pack("guardians", guardianFrames());
pack("weapons", weaponFrames());
pack("bosses", bossFrames());
for (const id of ["vex", "kit"])
  writeImage(
    `public/assets/sprites/portrait-${id}.png`,
    runners.find((f) => f.name === `${id}/idle/0`)!,
  );
for (const n of [1, 2, 3] as const)
  writeImage(`public/assets/tilemaps/tiles-s${n}.png`, tileset(n));
mkdirSync("public/assets/cards", { recursive: true });
for (const [id, draw] of Object.entries(CARD_DRAW))
  writeImage(`public/assets/cards/${id}.png`, frame(id, CW, CH, draw));
console.log("wrote sprites, portraits, tilesets and story cards under public/assets");
