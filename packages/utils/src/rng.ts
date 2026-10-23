export interface Rng {
  next(): number;
  int(min: number, maxInclusive: number): number;
  pick<T>(arr: readonly T[]): T;
  weighted<T>(entries: readonly { item: T; weight: number }[]): T;
  shuffle<T>(arr: readonly T[]): T[];
  chance(p: number): boolean;
  fork(label: string): Rng;
}

function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const next = sfc32(...cyrb128(seed));
  const rng: Rng = {
    next,
    int(min, maxInclusive) {
      if (min > maxInclusive) throw new RangeError(`int(${min}, ${maxInclusive}): min > max`);
      return min + Math.floor(next() * (maxInclusive - min + 1));
    },
    pick(arr) {
      if (arr.length === 0) throw new RangeError("pick from empty array");
      return arr[Math.floor(next() * arr.length)]!;
    },
    weighted(entries) {
      const total = entries.reduce((sum, e) => sum + Math.max(0, e.weight), 0);
      if (total <= 0) throw new RangeError("weighted: no positive weights");
      let roll = next() * total;
      for (const e of entries) {
        if (e.weight <= 0) continue;
        roll -= e.weight;
        if (roll < 0) return e.item;
      }
      // Float rounding can leave roll at ~0; fall back to the last positive entry.
      return entries.findLast((e) => e.weight > 0)!.item;
    },
    shuffle(arr) {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    chance: (p) => next() < p,
    // Derived from the original seed, so a fork ignores how much the parent consumed.
    fork: (label) => createRng(`${seed}|${label}`),
  };
  return rng;
}
