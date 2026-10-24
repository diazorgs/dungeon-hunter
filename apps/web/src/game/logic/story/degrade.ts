import type { Rng } from "@dh/utils";

const NOISE = ["#", "/", "_"] as const;
const RATE = { 0: 0, 1: 0.1, 2: 0.25 } as const;

/** Signal loss for Ops lines: corrupts up to 10% / 25% of non-space chars, never the first word. */
export function degradeText(text: string, level: 0 | 1 | 2, rng: Rng): string {
  const firstSpace = text.indexOf(" ");
  if (level === 0 || firstSpace < 0) return text;
  const candidates: number[] = [];
  for (let i = firstSpace + 1; i < text.length; i++) if (text[i] !== " ") candidates.push(i);
  const n = Math.floor(candidates.length * RATE[level]);
  const chars = text.split("");
  for (const i of rng.shuffle(candidates).slice(0, n)) chars[i] = rng.pick(NOISE);
  return chars.join("");
}
