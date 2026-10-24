import { BOSS_IDS, GUARDIAN_IDS, PALETTE, RUNNER_IDS, WEAPON_IDS, toCss } from "@dh/shared";
import type Phaser from "phaser";

type Kind = "weapon" | "guardian" | "runner" | "boss" | "pickup";

const KNOWN: Record<Kind, readonly string[]> = {
  weapon: WEAPON_IDS,
  guardian: GUARDIAN_IDS,
  runner: RUNNER_IDS,
  boss: BOSS_IDS,
  pickup: ["energy-orb", "scrap", "health"],
};

const warned = new Set<string>();

// Kinds with generated atlas art (scripts/gen-art.ts); pickups still use placeholders.
const ATLAS: Partial<Record<Kind, string>> = {
  runner: "runners",
  boss: "bosses",
  guardian: "guardians",
  weapon: "weapons",
};

/** Data id → texture key (+ atlas frame). Unknown ids get the magenta "missing" texture. */
export function textureFor(kind: Kind, id: string): { key: string; frame?: string } {
  const atlas = ATLAS[kind];
  if (atlas && KNOWN[kind].includes(id)) return { key: atlas, frame: `${id}/idle/0` };
  if (KNOWN[kind].includes(id)) return { key: `ph-${kind}` };
  if (!warned.has(`${kind}:${id}`)) {
    warned.add(`${kind}:${id}`);
    console.warn(`textureFor: no texture for ${kind} "${id}"`);
  }
  return { key: "missing" };
}

/** An atlas that failed to load (or lacks the frame) falls back to the kind's placeholder, once warned. */
export function resolveTexture(
  textures: Phaser.Textures.TextureManager,
  tex: { key: string; frame?: string },
  fallback: string,
): { key: string; frame?: string } {
  if (textures.exists(tex.key) && (!tex.frame || textures.get(tex.key).has(tex.frame))) return tex;
  if (!warned.has(`tex:${tex.key}/${tex.frame}`)) {
    warned.add(`tex:${tex.key}/${tex.frame}`);
    console.warn(`resolveTexture: ${tex.key}/${tex.frame} missing, using ${fallback}`);
  }
  return { key: fallback };
}

type Draw = (
  ctx: CanvasRenderingContext2D,
  fill: (c: number, x: number, y: number, w: number, h: number) => void,
) => void;

// shortcut: procedural placeholder art instead of a licensed prototype pack; replaced in plan 23.
const PLACEHOLDERS: Record<string, [w: number, h: number, draw: Draw]> = {
  missing: [
    16,
    16,
    (_, f) => (f(0xff00ff, 0, 0, 16, 16), f(0x000000, 0, 0, 8, 8), f(0x000000, 8, 8, 8, 8)),
  ],
  "ph-floor": [
    16,
    16,
    (_, f) => (
      f(PALETTE["steel-800"], 0, 0, 16, 16),
      f(PALETTE["steel-900"], 0, 15, 16, 1),
      f(PALETTE["steel-900"], 15, 0, 1, 16)
    ),
  ],
  "ph-wall": [
    16,
    16,
    (_, f) => (f(PALETTE["steel-700"], 0, 0, 16, 16), f(PALETTE["steel-600"], 0, 0, 16, 3)),
  ],
  "ph-runner": [
    16,
    24,
    (_, f) => (
      f(PALETTE["amber-500"], 3, 8, 10, 12),
      f(PALETTE.bone, 4, 1, 8, 7),
      f(PALETTE.ink, 8, 3, 3, 2),
      f(PALETTE["steel-600"], 3, 20, 4, 4),
      f(PALETTE["steel-600"], 9, 20, 4, 4)
    ),
  ],
  "ph-guardian": [
    16,
    16,
    (_, f) => (f(PALETTE["steel-500"], 2, 2, 12, 12), f(PALETTE["bleed-300"], 6, 6, 4, 4)),
  ],
  "ph-boss": [
    64,
    64,
    (_, f) => (f(PALETTE["steel-600"], 4, 4, 56, 56), f(PALETTE["bleed-500"], 24, 24, 16, 16)),
  ],
  "ph-weapon": [12, 4, (_, f) => f(PALETTE["steel-300"], 0, 0, 12, 4)],
  "ph-pickup": [6, 6, (_, f) => f(PALETTE.energy, 0, 0, 6, 6)],
  // Locked N/S door: a gate front seen in 3/4 (its cap is "ph-door-cap-h", one tile up).
  "ph-door-h": [
    48,
    16,
    (_, f) => {
      f(PALETTE["steel-700"], 0, 0, 48, 16);
      f(PALETTE.ink, 0, 0, 48, 1);
      for (let x = 3; x < 46; x += 5) f(PALETTE["steel-400"], x, 2, 2, 12);
      f(PALETTE["amber-500"], 0, 6, 48, 2);
      f(PALETTE["amber-300"], 22, 6, 4, 2);
      f(PALETTE["steel-800"], 0, 14, 48, 2);
    },
  ],
  "ph-door-cap-h": [
    48,
    16,
    (_, f) => {
      // 10 px slab like the wall caps beside it (top 6 px left open).
      f(PALETTE["steel-800"], 0, 6, 48, 10);
      f(PALETTE.ink, 0, 6, 48, 1);
      for (let x = 0; x < 48; x += 8) f(PALETTE["amber-500"], x, 8, 4, 5);
      f(PALETTE["steel-600"], 0, 14, 48, 1);
      f(PALETTE["steel-500"], 0, 15, 48, 1);
    },
  ],
  // Locked W/E door seen from above, like a side wall's cap.
  "ph-door-v": [
    16,
    48,
    (_, f) => {
      f(PALETTE["steel-800"], 0, 0, 16, 48);
      f(PALETTE.ink, 0, 0, 1, 48);
      f(PALETTE.ink, 15, 0, 1, 48);
      for (let y = 0; y < 48; y += 8) f(PALETTE["amber-500"], 4, y, 8, 4);
      f(PALETTE["steel-500"], 0, 46, 16, 2);
    },
  ],
  "ph-marker": [
    12,
    12,
    (_, f) => (
      f(PALETTE["bleed-500"], 2, 0, 8, 2),
      f(PALETTE["bleed-500"], 2, 10, 8, 2),
      f(PALETTE["bleed-500"], 0, 2, 2, 8),
      f(PALETTE["bleed-500"], 10, 2, 2, 8)
    ),
  ],
  "ph-orb": [
    5,
    5,
    (_, f) => (
      f(PALETTE.energy, 1, 0, 3, 5),
      f(PALETTE.energy, 0, 1, 5, 3),
      f(PALETTE.shield, 1, 1, 2, 2)
    ),
  ],
  "ph-scrap": [4, 4, (_, f) => (f(PALETTE["rust-700"], 0, 0, 4, 4), f(PALETTE.scrap, 0, 0, 3, 3))],
  "ph-health": [
    7,
    7,
    (_, f) => (
      f(PALETTE.bone, 0, 0, 7, 7),
      f(PALETTE.heal, 3, 1, 1, 5),
      f(PALETTE.heal, 1, 3, 5, 1)
    ),
  ],
  "ph-crate": [
    14,
    14,
    (_, f) => (
      f(PALETTE.ink, 0, 0, 14, 14),
      f(PALETTE["amber-500"], 1, 1, 12, 1),
      f(PALETTE["rust-500"], 1, 2, 12, 3),
      f(PALETTE["rust-700"], 1, 5, 12, 8),
      f(PALETTE["rust-500"], 2, 7, 10, 1),
      f(PALETTE["rust-500"], 2, 10, 10, 1),
      f(PALETTE["amber-500"], 6, 5, 2, 8)
    ),
  ],
  "ph-chest": [
    16,
    12,
    (_, f) => (
      f(PALETTE.ink, 0, 0, 16, 12),
      f(PALETTE["steel-300"], 1, 1, 14, 1),
      f(PALETTE["steel-500"], 1, 2, 14, 3),
      f(PALETTE["steel-700"], 1, 5, 14, 6),
      f(PALETTE["steel-600"], 1, 5, 14, 1),
      f(PALETTE["amber-500"], 7, 4, 2, 4),
      f(PALETTE["amber-300"], 7, 4, 2, 1)
    ),
  ],
  "ph-chest-gold": [
    16,
    12,
    (_, f) => (
      f(PALETTE.ink, 0, 0, 16, 12),
      f(PALETTE["amber-100"], 1, 1, 14, 1),
      f(PALETTE.scrap, 1, 2, 14, 3),
      f(PALETTE["rust-700"], 1, 5, 14, 6),
      f(PALETTE.scrap, 1, 5, 14, 1),
      f(PALETTE.scrap, 1, 5, 2, 6),
      f(PALETTE.scrap, 13, 5, 2, 6),
      f(PALETTE.bone, 7, 4, 2, 4)
    ),
  ],
  "ph-chest-open": [
    16,
    12,
    (_, f) => (
      f(PALETTE.ink, 0, 0, 16, 12),
      f(PALETTE["steel-500"], 1, 1, 14, 2),
      f(PALETTE.void, 2, 3, 12, 3),
      f(PALETTE["steel-700"], 1, 6, 14, 5),
      f(PALETTE["steel-600"], 1, 6, 14, 1)
    ),
  ],
  "ph-lift": [
    32,
    16,
    (_, f) => (
      f(PALETTE.ink, 0, 0, 32, 16),
      f(PALETTE["steel-500"], 1, 1, 30, 11),
      f(PALETTE["amber-500"], 3, 2, 26, 9),
      f(PALETTE["steel-800"], 5, 3, 22, 7),
      f(PALETTE["amber-300"], 14, 5, 4, 3),
      f(PALETTE["steel-700"], 1, 12, 30, 3)
    ),
  ],
  "ph-hydra-core": [
    32,
    32,
    (_, f) => (
      f(PALETTE["teal-800"], 2, 2, 28, 28),
      f(PALETTE["teal-600"], 6, 6, 20, 20),
      f(PALETTE["bleed-500"], 12, 12, 8, 8)
    ),
  ],
  "ph-hydra-head": [
    16,
    16,
    (_, f) => (
      f(PALETTE["teal-600"], 1, 1, 14, 14),
      f(PALETTE["teal-200"], 4, 4, 8, 8),
      f(PALETTE["bleed-300"], 6, 6, 4, 4)
    ),
  ],
  "ph-vendor": [
    16,
    20,
    (_, f) => (
      f(PALETTE.ink, 0, 0, 16, 20),
      f(PALETTE["steel-500"], 1, 1, 14, 3),
      f(PALETTE["steel-700"], 1, 4, 14, 15),
      f(PALETTE.void, 2, 5, 12, 7),
      f(PALETTE["teal-200"], 3, 6, 10, 2),
      f(PALETTE["teal-400"], 3, 9, 6, 1),
      f(PALETTE["steel-600"], 1, 13, 14, 1),
      f(PALETTE.scrap, 6, 15, 4, 2)
    ),
  ],
  "ph-drone": [
    10,
    8,
    (_, f) => (
      f(PALETTE["steel-500"], 1, 2, 8, 5),
      f(PALETTE["teal-400"], 0, 3, 1, 2),
      f(PALETTE["teal-400"], 9, 3, 1, 2),
      f(PALETTE["amber-300"], 4, 3, 2, 2),
      f(PALETTE["steel-300"], 3, 0, 4, 2)
    ),
  ],
  "ph-log-terminal": [
    12,
    16,
    (_, f) => (
      f(PALETTE.ink, 0, 0, 12, 16),
      f(PALETTE["steel-500"], 1, 1, 10, 2),
      f(PALETTE["steel-700"], 1, 3, 10, 12),
      f(PALETTE.void, 2, 4, 8, 6),
      f(PALETTE["teal-200"], 3, 5, 6, 1),
      f(PALETTE["teal-200"], 3, 7, 4, 1),
      f(PALETTE["teal-400"], 3, 9, 5, 1),
      f(PALETTE["steel-500"], 3, 12, 6, 2)
    ),
  ],
  "ph-arm": [
    10,
    10,
    (_, f) => (
      f(PALETTE["steel-600"], 0, 0, 10, 10),
      f(PALETTE["steel-400"], 1, 1, 8, 3),
      f(PALETTE["bleed-500"], 4, 5, 2, 3)
    ),
  ],
  "ph-spark": [2, 2, (_, f) => f(PALETTE.white, 0, 0, 2, 2)],
  "ph-casing": [2, 1, (_, f) => f(PALETTE["amber-500"], 0, 0, 2, 1)],
  "ph-muzzle": [
    5,
    5,
    (_, f) => (
      f(PALETTE["amber-300"], 0, 1, 5, 3),
      f(PALETTE["amber-300"], 1, 0, 3, 5),
      f(PALETTE["amber-100"], 1, 1, 3, 3)
    ),
  ],
  "ph-shell-player": [
    5,
    5,
    (_, f) => (f(PALETTE["amber-500"], 0, 0, 5, 5), f(PALETTE["amber-100"], 1, 1, 2, 2)),
  ],
  "ph-orb-null": [
    10,
    10,
    (_, f) => (
      f(PALETTE["teal-400"], 2, 0, 6, 10),
      f(PALETTE["teal-400"], 0, 2, 10, 6),
      f(PALETTE["teal-200"], 2, 2, 6, 6),
      f(PALETTE.bone, 4, 4, 2, 2)
    ),
  ],
  "ph-bullet-player": [3, 3, (_, f) => f(PALETTE["amber-300"], 0, 0, 3, 3)],
  "ph-bullet-bleed": [
    5,
    5,
    (_, f) => (f(PALETTE["bleed-500"], 0, 0, 5, 5), f(PALETTE["bleed-100"], 1, 1, 3, 3)),
  ],
  "ph-shield": [
    4,
    16,
    (_, f) => (f(PALETTE["teal-200"], 0, 0, 4, 16), f(PALETTE["teal-600"], 1, 1, 2, 14)),
  ],
  "ph-shell": [
    6,
    6,
    (_, f) => (
      f(PALETTE["rust-700"], 1, 0, 4, 6),
      f(PALETTE["rust-700"], 0, 1, 6, 4),
      f(PALETTE["amber-500"], 1, 1, 4, 4)
    ),
  ],
  "ph-bullet-enemy": [
    5,
    5,
    (_, f) => (f(PALETTE.bone, 0, 0, 5, 5), f(PALETTE["bleed-300"], 1, 1, 3, 3)),
  ],
};

export function createPlaceholderTextures(textures: Phaser.Textures.TextureManager): void {
  for (const [key, [w, h, draw]] of Object.entries(PLACEHOLDERS)) {
    if (textures.exists(key)) continue;
    const tex = textures.createCanvas(key, w, h);
    if (!tex) continue;
    const ctx = tex.getContext();
    draw(ctx, (c, x, y, rw, rh) => {
      ctx.fillStyle = toCss(c);
      ctx.fillRect(x, y, rw, rh);
    });
    tex.refresh();
  }
}
