// Synthesises the six music loops (DESIGN.md §11.7) into public/assets/audio/music as 8-bit mono
// WAV. Chiptune voices + noise percussion; each loop is a whole number of bars, so it loops cleanly.
// Run: node scripts/gen-music.ts. Original, public domain (logged in CREDITS.md).
import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";

const RATE = 22050;
interface Track {
  bpm: number;
  root: number; // MIDI note of the key
  scale: number[]; // semitone offsets
  bass: number[]; // scale degrees per 8th note, -1 = rest (one bar = 8 steps)
  lead: number[]; // scale degrees per 16th note, -1 = rest (one bar = 16 steps)
  chords: number[]; // degree shift per bar (progression)
  drums: string; // per 16th: k kick, s snare, h hat, m metal clank, . rest
  duty: number; // lead pulse width
  grit?: number; // bit-crush amount for the Bleed tracks
}

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];

const TRACKS: Record<string, Track> = {
  lobby: {
    bpm: 90,
    root: 45,
    scale: MINOR,
    duty: 0.25,
    bass: [0, -1, -1, -1, 4, -1, -1, -1],
    lead: [7, -1, -1, -1, 9, -1, 8, -1, 7, -1, -1, -1, 4, -1, -1, -1],
    chords: [0, -2, 3, -3],
    drums: "k.......h.......",
  },
  sector1: {
    bpm: 120,
    root: 45,
    scale: MINOR,
    duty: 0.25,
    bass: [0, 0, 7, 0, 0, 0, 7, 4],
    lead: [7, -1, 9, 7, 11, -1, 9, -1, 7, -1, 4, -1, 5, 4, 2, -1],
    chords: [0, 0, -2, -3],
    drums: "k.h.s.h.k.kms.h.",
  },
  sector2: {
    bpm: 112,
    root: 50,
    scale: DORIAN,
    duty: 0.125,
    bass: [0, -1, 0, 7, -1, 7, 5, -1],
    lead: [4, 6, 8, 6, 4, -1, 2, -1, 4, 6, 9, 8, 6, -1, -1, -1],
    chords: [0, 3, 0, -2],
    drums: "k..mh.s.k.m.h.sm",
  },
  sector3: {
    bpm: 128,
    root: 40,
    scale: PHRYGIAN,
    duty: 0.375,
    grit: 0.5,
    bass: [0, 0, 1, 0, 0, 0, 1, 3],
    lead: [7, 8, -1, 7, -1, 5, 4, -1, 8, -1, 7, -1, 5, 4, 1, 0],
    chords: [0, 1, 0, -2],
    drums: "k.hmk.s.k.hmkss.",
  },
  boss: {
    bpm: 140,
    root: 43,
    scale: MINOR,
    duty: 0.25,
    bass: [0, 0, 0, 7, 0, 0, 6, 5],
    lead: [7, 9, 10, 9, 7, 9, 10, 12, 11, 10, 9, 7, 9, -1, 7, -1],
    chords: [0, -2, -3, -4],
    drums: "kkh.s.hkkkh.s.sm",
  },
  warden: {
    bpm: 150,
    root: 38,
    scale: PHRYGIAN,
    duty: 0.5,
    grit: 1,
    bass: [0, 1, 0, 0, 1, 0, 3, 1],
    lead: [8, 7, 8, 12, 8, 7, 5, 4, 8, 7, 8, 13, 12, 8, 7, 5],
    chords: [0, 1, -2, 1],
    drums: "kmhks.hkkmhks.sm",
  },
};

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const note = (t: Track, degree: number, octave: number) => {
  const n = t.scale.length;
  const oct = Math.floor(degree / n);
  return t.root + 12 * (octave + oct) + t.scale[((degree % n) + n) % n]!;
};

let seed = 7;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;

function render(t: Track, bars: number): Float32Array {
  const step16 = 60 / t.bpm / 4; // seconds per 16th
  const total = Math.round(step16 * 16 * bars * RATE);
  const out = new Float32Array(total);
  const add = (start: number, len: number, fn: (i: number, k: number) => number) => {
    for (let i = 0; i < len; i++) {
      const at = (start + i) % total; // tails wrap to the loop start: seamless
      out[at]! += fn(i, i / len);
    }
  };
  for (let bar = 0; bar < bars; bar++) {
    const shift = t.chords[bar % t.chords.length]!;
    const barStart = Math.round(bar * 16 * step16 * RATE);
    t.bass.forEach((d, i) => {
      if (d < 0) return;
      const f = hz(note(t, d + shift, -1));
      const len = Math.round(step16 * 2 * RATE * 0.9);
      add(barStart + Math.round(i * 2 * step16 * RATE), len, (s, k) =>
        ((s * f) / RATE) % 1 < 0.5 ? 0.22 * (1 - k) ** 0.5 : -0.22 * (1 - k) ** 0.5,
      );
    });
    t.lead.forEach((d, i) => {
      if (d < 0) return;
      const f = hz(note(t, d + shift, 1));
      const len = Math.round(step16 * RATE * 1.6);
      add(barStart + Math.round(i * step16 * RATE), len, (s, k) => {
        const vib = 1 + 0.004 * Math.sin((s / RATE) * 2 * Math.PI * 6);
        return (((s * f * vib) / RATE) % 1 < t.duty ? 0.1 : -0.1) * (1 - k) ** 2;
      });
    });
    t.drums.split("").forEach((c, i) => {
      const at = barStart + Math.round(i * step16 * RATE);
      if (c === "k")
        add(
          at,
          Math.round(0.14 * RATE),
          (s, k) => 0.45 * Math.sin(2 * Math.PI * (110 - 70 * k) * (s / RATE)) * (1 - k) ** 2,
        );
      if (c === "s") add(at, Math.round(0.12 * RATE), (_s, k) => 0.22 * noise() * (1 - k) ** 3);
      if (c === "h") add(at, Math.round(0.03 * RATE), (_s, k) => 0.08 * noise() * (1 - k));
      // Industrial clank: two inharmonic squares.
      if (c === "m")
        add(
          at,
          Math.round(0.08 * RATE),
          (s, k) =>
            0.07 *
            ((((s * 1370) / RATE) % 1 < 0.5 ? 1 : -1) + (((s * 1931) / RATE) % 1 < 0.5 ? 1 : -1)) *
            (1 - k) ** 3,
        );
    });
  }
  if (t.grit) {
    const levels = 64 / (1 + 3 * t.grit);
    for (let i = 0; i < total; i++) out[i] = Math.round(out[i]! * levels) / levels;
  }
  return out;
}

function wav8(samples: Float32Array): Buffer {
  const b = Buffer.alloc(44 + samples.length);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + samples.length, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(RATE, 24);
  b.writeUInt32LE(RATE, 28);
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write("data", 36);
  b.writeUInt32LE(samples.length, 40);
  for (let i = 0; i < samples.length; i++)
    b[44 + i] = Math.max(0, Math.min(255, Math.round(128 + samples[i]! * 127)));
  return b;
}

const dir = new URL("../public/assets/audio/music/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const [name, t] of Object.entries(TRACKS))
  writeFileSync(new URL(`${name}.wav`, dir), wav8(render(t, 8)));
console.log(`wrote ${Object.keys(TRACKS).length} music loops`);
