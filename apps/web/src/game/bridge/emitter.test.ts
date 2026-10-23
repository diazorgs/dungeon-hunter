import { expect, test, vi } from "vite-plus/test";
import { createEmitter } from "./emitter.ts";

type Events = { ping: (n: number) => void; other: () => void };

test("unsubscribe removes only that listener", () => {
  const e = createEmitter<Events>();
  const a = vi.fn(),
    b = vi.fn();
  const offA = e.on("ping", a);
  e.on("ping", b);
  offA();
  e.emit("ping", 1);
  expect(a).not.toHaveBeenCalled();
  expect(b).toHaveBeenCalledWith(1);
});
test("emit with no listeners is a no-op", () =>
  expect(() => createEmitter<Events>().emit("other")).not.toThrow());
test("listenerCount is 0 after clear", () => {
  const e = createEmitter<Events>();
  e.on("ping", () => {});
  e.on("other", () => {});
  expect(e.listenerCount()).toBe(2);
  expect(e.listenerCount("ping")).toBe(1);
  e.clear();
  expect(e.listenerCount()).toBe(0);
});
test("a throwing listener does not stop later listeners; error rethrown async", async () => {
  const e = createEmitter<Events>();
  const later = vi.fn();
  const boom = new Error("boom");
  const queued: (() => void)[] = [];
  const spy = vi.spyOn(globalThis, "queueMicrotask").mockImplementation((cb) => queued.push(cb));
  e.on("ping", () => {
    throw boom;
  });
  e.on("ping", later);
  e.emit("ping", 2);
  spy.mockRestore();
  expect(later).toHaveBeenCalledWith(2);
  expect(queued).toHaveLength(1);
  expect(() => queued[0]!()).toThrow(boom);
});
