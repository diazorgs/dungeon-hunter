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

/** Data id → texture key. Every known id maps to its kind's placeholder until real art lands. */
export function textureFor(kind: Kind, id: string): { key: string; frame?: string } {
  if (KNOWN[kind].includes(id)) return { key: `ph-${kind}` };
  if (!warned.has(`${kind}:${id}`)) {
    warned.add(`${kind}:${id}`);
    console.warn(`textureFor: no texture for ${kind} "${id}"`);
  }
  return { key: "missing" };
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
  "ph-crosshair": [
    7,
    7,
    (_, f) => (
      f(PALETTE.bone, 3, 0, 1, 2),
      f(PALETTE.bone, 3, 5, 1, 2),
      f(PALETTE.bone, 0, 3, 2, 1),
      f(PALETTE.bone, 5, 3, 2, 1)
    ),
  ],
  "ph-bullet-player": [3, 3, (_, f) => f(PALETTE["amber-300"], 0, 0, 3, 3)],
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
