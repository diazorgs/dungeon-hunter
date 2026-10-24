import { STARTER_WEAPON_POOL } from "@dh/shared";
import { createRng } from "@dh/utils";
import { expect, test } from "vite-plus/test";
import { rollVendorStock, tryBuy } from "./vendor.ts";

const stock = () => rollVendorStock(createRng("v").fork("vendor:s2"), STARTER_WEAPON_POOL, 2);
const room = { hpFull: false, energyFull: false };

test("exact scrap succeeds, one short is refused", () => {
  const s = stock();
  const price = s.weapons[0]!.price;
  expect(tryBuy(s, { kind: "weapon", index: 0 }, { scrap: price, ...room })).toEqual({
    ok: true,
    cost: price,
  });
  expect(tryBuy(s, { kind: "weapon", index: 0 }, { scrap: price - 1, ...room })).toEqual({
    ok: false,
    reason: "NOT_ENOUGH_SCRAP",
  });
});
test("a sold weapon is sold out", () => {
  const s = stock();
  s.weapons[0]!.sold = true;
  expect(tryBuy(s, { kind: "weapon", index: 0 }, { scrap: 999, ...room })).toEqual({
    ok: false,
    reason: "SOLD_OUT",
  });
});
test("health at full HP and energy at full are refused", () => {
  expect(
    tryBuy(stock(), { kind: "health" }, { scrap: 999, hpFull: true, energyFull: false }),
  ).toEqual({ ok: false, reason: "FULL" });
  expect(
    tryBuy(stock(), { kind: "energy" }, { scrap: 999, hpFull: false, energyFull: true }),
  ).toEqual({ ok: false, reason: "FULL" });
});
test("same seed, same stock; two distinct weapons", () => {
  expect(stock()).toEqual(stock());
  const ids = stock().weapons.map((w) => w.id);
  expect(new Set(ids).size).toBe(2);
});
