import { WEAPONS } from "@dh/shared";
import type { Guardian, SectorId, Weapon, WeaponId } from "@dh/shared";
import type { Rng } from "@dh/utils";

export const RARITY_WEIGHTS = { common: 70, rare: 25, epic: 5 } as const;
type ChestRarity = keyof typeof RARITY_WEIGHTS;

function rarityWeight(r: ChestRarity, luck: number): number {
  if (r === "rare") return RARITY_WEIGHTS.rare + 10 * luck;
  if (r === "epic") return RARITY_WEIGHTS.epic + 5 * luck;
  return Math.max(10, RARITY_WEIGHTS.common - 15 * luck);
}

/** Rarity first, then a weapon of that rarity. Avoids held weapons unless nothing else exists. */
export function rollChestWeapon(
  rng: Rng,
  pool: readonly WeaponId[],
  held: readonly WeaponId[],
  luck: number,
): WeaponId {
  const chestable = pool.filter((id) => WEAPONS[id].rarity !== "starter");
  const fresh = chestable.filter((id) => !held.includes(id));
  const candidates = fresh.length ? fresh : chestable.length ? chestable : [...pool];
  const byRarity = new Map<Weapon["rarity"], WeaponId[]>();
  for (const id of candidates)
    byRarity.set(WEAPONS[id].rarity, [...(byRarity.get(WEAPONS[id].rarity) ?? []), id]);
  const rarity = rng.weighted(
    [...byRarity.keys()].map((r) => ({
      item: r,
      weight: r === "starter" ? 1 : rarityWeight(r, luck),
    })),
  );
  return rng.pick(byRarity.get(rarity)!);
}

export function rollGuardianDrop(
  rng: Rng,
  def: Guardian,
  elite: boolean,
): { scrap: number; energyOrbs: number; health: boolean } {
  return {
    scrap: def.scrap + (elite ? 2 : 0),
    energyOrbs: elite || rng.chance(def.energyOrbChance) ? 1 : 0,
    health: rng.chance(0.03),
  };
}

export const rollCrate = (rng: Rng): { scrap: number; energyOrbs: number } => ({
  scrap: rng.int(1, 3),
  energyOrbs: rng.chance(0.4) ? 1 : 0,
});

export const roomClearReward = (sector: SectorId): { scrap: number } => ({ scrap: 3 + sector });

export const isGoldChest = (rng: Rng, _sector: SectorId): boolean => rng.chance(0.25);
