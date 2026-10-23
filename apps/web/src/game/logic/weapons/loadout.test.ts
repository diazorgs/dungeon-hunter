import { expect, test } from "vite-plus/test";
import { activeWeapon, createLoadout, pickUp, swap } from "./loadout.ts";

test("new loadout holds only the pistol", () =>
  expect(createLoadout()).toEqual({ slots: ["rust-pistol", null], active: 0 }));
test("swap with an empty second slot fails", () => expect(swap(createLoadout())).toBe(false));
test("first pickup fills slot 2 and activates it", () => {
  const l = createLoadout();
  expect(pickUp(l, "rivet-smg")).toEqual({ dropped: null });
  expect(activeWeapon(l)).toBe("rivet-smg");
  expect(swap(l)).toBe(true);
  expect(activeWeapon(l)).toBe("rust-pistol");
});
test("third weapon replaces the active one and drops it", () => {
  const l = createLoadout();
  pickUp(l, "rivet-smg");
  expect(pickUp(l, "breach-shotgun")).toEqual({ dropped: "rivet-smg" });
  expect(l.slots).toEqual(["rust-pistol", "breach-shotgun"]);
});
test("picking up a weapon already held still swaps it in", () => {
  const l = createLoadout();
  pickUp(l, "rivet-smg");
  swap(l);
  expect(pickUp(l, "rivet-smg")).toEqual({ dropped: "rust-pistol" });
  expect(l.slots).toEqual(["rivet-smg", "rivet-smg"]);
});
