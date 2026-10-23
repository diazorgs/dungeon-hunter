import { expect, test } from "vite-plus/test";
import { createRng } from "./rng.ts";

test("same seed, same sequence", () => {
  const a = createRng("ABCD1234"),
    b = createRng("ABCD1234");
  expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
});
test("fork streams are independent of parent consumption", () => {
  const a = createRng("S");
  a.next();
  a.next();
  const b = createRng("S");
  expect(a.fork("layout:s1").next()).toBe(b.fork("layout:s1").next());
});
test("different fork labels diverge", () => {
  const r = createRng("S");
  expect(r.fork("a").next()).not.toBe(r.fork("b").next());
});
test("int is inclusive and bounded over 10k draws", () => {
  const r = createRng("x");
  const seen = new Set<number>();
  for (let i = 0; i < 10_000; i++) seen.add(r.int(1, 3));
  expect([...seen].sort((a, b) => a - b)).toEqual([1, 2, 3]);
});
test("int(min,max) with min===max returns min", () => expect(createRng("x").int(4, 4)).toBe(4));
test("int(min,max) with min>max throws", () => expect(() => createRng("x").int(3, 1)).toThrow());
test("empty and unicode seeds are deterministic", () => {
  expect(createRng("").next()).toBe(createRng("").next());
  expect(createRng("ヴェイラ").next()).toBe(createRng("ヴェイラ").next());
});
test("weighted respects zero weights", () => {
  const r = createRng("w");
  for (let i = 0; i < 1000; i++)
    expect(
      r.weighted([
        { item: "a", weight: 0 },
        { item: "b", weight: 1 },
      ]),
    ).toBe("b");
});
test("shuffle keeps elements and does not mutate input", () => {
  const src = [1, 2, 3, 4, 5];
  const out = createRng("s").shuffle(src);
  expect(src).toEqual([1, 2, 3, 4, 5]);
  expect([...out].sort((a, b) => a - b)).toEqual(src);
});
