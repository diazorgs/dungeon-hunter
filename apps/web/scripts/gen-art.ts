// Draws the original Runner and boss sprites and packs them into Phaser json-array atlases
// in public/assets/sprites. Run: node scripts/gen-art.ts. Original art, public domain (CREDITS.md).
// Sizes match the in-game textures the hitboxes were tuned on (runners 16×24, bosses 64×64,
// Hydra core 32×32, heads 16×16, Warden arm 10×10).
import { Buffer } from "node:buffer";
import { writeFileSync } from "node:fs";
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
  /** Filled circle, for cores and eyes. */
  disc(c: C, cx: number, cy: number, r: number): this {
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++)
        if (i * i + j * j <= r * r + r * 0.6) this.px(c, cx + i, cy + j);
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

// ---------- Runners (16×24) ----------
interface Look {
  armour: C;
  armourHi: C;
  trim: C;
  visor: C;
  heavy: boolean;
}
const LOOKS: Record<"vex" | "kit", Look> = {
  // Vex: heavy breacher plate, amber visor, rust trim.
  vex: {
    armour: "steel-500",
    armourHi: "steel-300",
    trim: "rust-500",
    visor: "amber-300",
    heavy: true,
  },
  // Kit: light teal rig, tool pack and drone dock, bone goggles.
  kit: { armour: "teal-600", armourHi: "teal-400", trim: "rust-700", visor: "bone", heavy: false },
};

function runner(
  g: Gfx,
  id: "vex" | "kit",
  o: { bob?: number; legA?: number; legB?: number; lean?: number; flash?: boolean },
) {
  const L = LOOKS[id];
  const b = o.bob ?? 0;
  const lean = o.lean ?? 0;
  const arm = o.flash ? "bone" : L.armour;
  const hi = o.flash ? "white" : L.armourHi;
  // legs
  g.rect("steel-800", 4 + lean, 17 + b, 3, 5 + (o.legA ?? 0)).rect(
    "steel-800",
    9 + lean,
    17 + b,
    3,
    5 + (o.legB ?? 0),
  );
  g.rect("steel-900", 4 + lean, 21 + b + (o.legA ?? 0), 3, 2).rect(
    "steel-900",
    9 + lean,
    21 + b + (o.legB ?? 0),
    3,
    2,
  );
  // torso
  if (L.heavy) {
    g.rect(arm, 2 + lean, 9 + b, 12, 9).rect(hi, 3 + lean, 9 + b, 10, 2);
    g.rect(L.trim, 2 + lean, 15 + b, 12, 1).rect("amber-500", 7 + lean, 12 + b, 2, 2);
    g.rect(arm, 1 + lean, 9 + b, 2, 4); // pauldron
  } else {
    g.rect(arm, 3 + lean, 9 + b, 10, 8).rect(hi, 4 + lean, 9 + b, 8, 1);
    g.rect(L.trim, 0 + lean, 10 + b, 3, 6).rect("scrap", 1 + lean, 11 + b, 1, 1); // tool pack
    g.rect("teal-200", 11 + lean, 8 + b, 3, 2); // drone dock
    g.rect("steel-700", 3 + lean, 15 + b, 10, 1);
  }
  // head + helmet
  g.rect(arm, 4 + lean, 2 + b, 8, 7).rect(hi, 5 + lean, 2 + b, 6, 1);
  g.rect("ink", 6 + lean, 4 + b, 6, 3).rect(L.visor, 7 + lean, 5 + b, 4, 1);
  if (L.heavy) g.rect(L.trim, 4 + lean, 8 + b, 8, 1);
  g.outline();
}

function runnerFrames(id: "vex" | "kit"): Frame[] {
  const f = (anim: string, i: number, draw: (g: Gfx) => void) =>
    frame(`${id}/${anim}/${i}`, 16, 24, draw);
  return [
    f("idle", 0, (g) => runner(g, id, {})),
    f("idle", 1, (g) => runner(g, id, { bob: 1 })),
    f("run", 0, (g) => runner(g, id, { legA: -2 })),
    f("run", 1, (g) => runner(g, id, { bob: 1 })),
    f("run", 2, (g) => runner(g, id, { legB: -2 })),
    f("run", 3, (g) => runner(g, id, { bob: 1 })),
    f("dash", 0, (g) => runner(g, id, { lean: 1, legA: -1, legB: -2 })),
    f("hurt", 0, (g) => runner(g, id, { flash: true })),
    f("death", 0, (g) => runner(g, id, { bob: 1, flash: true })),
    f("death", 1, (g) => runner(g, id, { bob: 3 })),
    f("death", 2, (g) =>
      g
        .rect(LOOKS[id].armour, 1, 18, 14, 4)
        .rect("ink", 3, 19, 4, 2)
        .rect(LOOKS[id].visor, 4, 20, 2, 1)
        .outline(),
    ),
  ];
}

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

pack("runners", [...runnerFrames("vex"), ...runnerFrames("kit")]);
pack("bosses", bossFrames());
console.log("wrote public/assets/sprites/{runners,bosses}.{png,json}");
