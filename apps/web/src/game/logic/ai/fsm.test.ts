import { expect, test } from "vite-plus/test";
import { createFsm } from "./fsm.ts";

test("transitions call exit then enter and record enteredAt", () => {
  const log: string[] = [];
  const fsm = createFsm<"a" | "b", null>({
    initial: "a",
    states: {
      a: { exit: () => log.push("exit a"), update: (_c, now) => (now >= 10 ? "b" : undefined) },
      b: { enter: () => log.push("enter b"), update: () => "b" },
    },
  });
  fsm.update(null, 5, 0);
  expect(fsm.state).toBe("a");
  fsm.update(null, 10, 0);
  expect([fsm.state, fsm.enteredAt]).toEqual(["b", 10]);
  expect(log).toEqual(["exit a", "enter b"]);
  fsm.update(null, 20, 0);
  expect(fsm.enteredAt).toBe(10);
  expect(log).toHaveLength(2);
});
