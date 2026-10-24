import { VENDOR_PRICES, WEAPONS } from "@dh/shared";
import type { SectorId, WeaponId } from "@dh/shared";
import type { Rng } from "@dh/utils";
import { rollChestWeapon } from "./loot/tables.ts";

export interface VendorStock {
  weapons: { id: WeaponId; price: number; sold: boolean }[];
  health: { price: number; amount: number };
  energy: { price: number; amount: number };
}

export type VendorItem =
  | { kind: "weapon"; index: number }
  | { kind: "health" }
  | { kind: "energy" };

const WEAPON_SLOTS = 2;
const SECTOR3_LUCK = 5;

/** Rolled once when the sector is built, so walking out and back never re-rolls it. */
export function rollVendorStock(
  rng: Rng,
  pool: readonly WeaponId[],
  sector: SectorId,
): VendorStock {
  const picked: WeaponId[] = [];
  for (let i = 0; i < WEAPON_SLOTS; i++)
    picked.push(rollChestWeapon(rng, pool, picked, sector === 3 ? SECTOR3_LUCK : 0));
  return {
    weapons: picked.map((id) => {
      const r = WEAPONS[id].rarity;
      return { id, price: VENDOR_PRICES.weaponPrice[r === "starter" ? "common" : r], sold: false };
    }),
    health: { ...VENDOR_PRICES.health },
    energy: { ...VENDOR_PRICES.energy },
  };
}

/** Pure check: never spends; the caller applies the purchase when ok. */
export function tryBuy(
  stock: VendorStock,
  item: VendorItem,
  ctx: { scrap: number; hpFull: boolean; energyFull: boolean },
): { ok: true; cost: number } | { ok: false; reason: "NOT_ENOUGH_SCRAP" | "SOLD_OUT" | "FULL" } {
  let cost: number;
  if (item.kind === "weapon") {
    const w = stock.weapons[item.index];
    if (!w || w.sold) return { ok: false, reason: "SOLD_OUT" };
    cost = w.price;
  } else if (item.kind === "health") {
    if (ctx.hpFull) return { ok: false, reason: "FULL" };
    cost = stock.health.price;
  } else {
    if (ctx.energyFull) return { ok: false, reason: "FULL" };
    cost = stock.energy.price;
  }
  return ctx.scrap >= cost ? { ok: true, cost } : { ok: false, reason: "NOT_ENOUGH_SCRAP" };
}
