import { ARMORY, BASE_MOD_POOL, STARTER_WEAPON_POOL } from "../content.ts";
import type { ArmoryItem } from "../schemas/content.ts";
import type { ModId, RunnerId, WeaponId } from "../schemas/ids.ts";

export interface ArmoryItemRef {
  itemType: ArmoryItem["itemType"];
  itemId: string;
}

const sameRef = (a: ArmoryItemRef, b: ArmoryItemRef) =>
  a.itemType === b.itemType && a.itemId === b.itemId;

export const findArmoryItem = (ref: ArmoryItemRef): ArmoryItem | undefined =>
  ARMORY.find((item) => sameRef(item, ref));

const union = <T>(a: readonly T[], b: readonly T[]): T[] => [...new Set([...a, ...b])];

export const dropPool = (unlockedWeaponIds: readonly WeaponId[]): WeaponId[] =>
  union(STARTER_WEAPON_POOL, unlockedWeaponIds);

export const modPool = (unlockedModIds: readonly ModId[]): ModId[] =>
  union(BASE_MOD_POOL, unlockedModIds);

export const availableRunners = (unlocks: readonly ArmoryItemRef[]): RunnerId[] =>
  unlocks.some((u) => sameRef(u, { itemType: "runner", itemId: "kit" })) ? ["vex", "kit"] : ["vex"];

export function checkPurchase(
  profile: { coreShards: number; unlocks: readonly ArmoryItemRef[] },
  ref: ArmoryItemRef,
):
  | { ok: true; cost: number }
  | { ok: false; code: "UNKNOWN_ITEM" | "ALREADY_OWNED" | "INSUFFICIENT_SHARDS" } {
  const item = findArmoryItem(ref);
  if (!item) return { ok: false, code: "UNKNOWN_ITEM" };
  if (profile.unlocks.some((u) => sameRef(u, ref))) return { ok: false, code: "ALREADY_OWNED" };
  if (profile.coreShards < item.cost) return { ok: false, code: "INSUFFICIENT_SHARDS" };
  return { ok: true, cost: item.cost };
}
