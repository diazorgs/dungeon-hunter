// Generates the placeholder SFX in public/assets/audio/sfx as 16-bit mono WAV.
// Run: node scripts/gen-sfx.ts. Output is original and public domain (logged in CREDITS.md).
import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";

type Wave = "square" | "saw" | "sine" | "noise";
interface Spec {
  wave: Wave;
  f0: number;
  f1?: number;
  dur: number;
  noise?: number;
  vol?: number;
  /** Alternate between f0 and f1 every `step` seconds instead of sliding. */
  step?: number;
}

const RATE = 22050;
const SPECS: Record<string, Spec> = {
  pistol: { wave: "square", f0: 520, f1: 180, dur: 0.09, noise: 0.3 },
  smg: { wave: "square", f0: 700, f1: 300, dur: 0.05, noise: 0.4, vol: 0.7 },
  shotgun: { wave: "square", f0: 200, f1: 60, dur: 0.18, noise: 0.7 },
  rifle: { wave: "saw", f0: 900, f1: 200, dur: 0.12, noise: 0.2 },
  burst: { wave: "square", f0: 800, f1: 400, dur: 0.06, noise: 0.3 },
  "beam-loop": { wave: "saw", f0: 220, f1: 230, dur: 0.5, vol: 0.5 },
  melee: { wave: "sine", f0: 300, f1: 150, dur: 0.12, noise: 0.6 },
  launcher: { wave: "square", f0: 150, f1: 50, dur: 0.25, noise: 0.5 },
  charge: { wave: "sine", f0: 200, f1: 900, dur: 0.6, vol: 0.6 },
  chain: { wave: "square", f0: 1200, f1: 600, dur: 0.1, noise: 0.6 },
  dryfire: { wave: "square", f0: 1500, dur: 0.02, vol: 0.5 },
  hit: { wave: "square", f0: 300, f1: 100, dur: 0.05, noise: 0.5 },
  "enemy-death": { wave: "square", f0: 400, f1: 40, dur: 0.3, noise: 0.7 },
  "player-hurt": { wave: "saw", f0: 300, f1: 80, dur: 0.2, noise: 0.2 },
  "shield-break": { wave: "sine", f0: 1200, f1: 300, dur: 0.25, noise: 0.4 },
  dash: { wave: "sine", f0: 600, f1: 1200, dur: 0.12, noise: 0.6, vol: 0.6 },
  "door-lock": { wave: "square", f0: 120, dur: 0.15, noise: 0.3 },
  "door-unlock": { wave: "square", f0: 120, f1: 240, dur: 0.15, noise: 0.2 },
  pickup: { wave: "sine", f0: 600, f1: 1200, dur: 0.12 },
  "vigil-alarm": { wave: "square", f0: 880, f1: 660, dur: 0.6, step: 0.15, vol: 0.5 },
};

let seed = 1;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;

function synth(s: Spec): Int16Array {
  const n = Math.floor(s.dur * RATE);
  const out = new Int16Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f1 = s.f1 ?? s.f0;
    const f = s.step ? (Math.floor(i / RATE / s.step) % 2 ? f1 : s.f0) : s.f0 + (f1 - s.f0) * t;
    phase = (phase + f / RATE) % 1;
    const tone =
      s.wave === "square"
        ? phase < 0.5
          ? 1
          : -1
        : s.wave === "saw"
          ? phase * 2 - 1
          : s.wave === "sine"
            ? Math.sin(phase * 2 * Math.PI)
            : noise();
    const mix = tone * (1 - (s.noise ?? 0)) + noise() * (s.noise ?? 0);
    // 5 ms attack, then a quadratic decay to silence.
    const env = Math.min(1, i / (RATE * 0.005)) * (1 - t) ** 2;
    out[i] = Math.round(mix * env * (s.vol ?? 0.8) * 0.6 * 32767);
  }
  return out;
}

function wav(samples: Int16Array): Buffer {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + samples.length * 2, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(RATE, 24);
  b.writeUInt32LE(RATE * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(samples.length * 2, 40);
  Buffer.from(samples.buffer).copy(b, 44);
  return b;
}

const dir = new URL("../public/assets/audio/sfx/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const [name, spec] of Object.entries(SPECS))
  writeFileSync(new URL(`${name}.wav`, dir), wav(synth(spec)));
console.log(`wrote ${Object.keys(SPECS).length} sfx`);
