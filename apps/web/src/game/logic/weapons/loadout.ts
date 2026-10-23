import type { WeaponId } from "@dh/shared";

export interface Loadout {
  slots: [WeaponId, WeaponId | null];
  active: 0 | 1;
}

export const createLoadout = (starter: WeaponId = "rust-pistol"): Loadout => ({
  slots: [starter, null],
  active: 0,
});

export const activeWeapon = (l: Loadout): WeaponId => l.slots[l.active]!;

export function swap(l: Loadout): boolean {
  if (l.slots[1] === null) return false;
  l.active = l.active === 0 ? 1 : 0;
  return true;
}

/** Fills the empty second slot first; otherwise replaces the active weapon and drops it. */
export function pickUp(l: Loadout, id: WeaponId): { dropped: WeaponId | null } {
  if (l.slots[1] === null) {
    l.slots[1] = id;
    l.active = 1;
    return { dropped: null };
  }
  const dropped = activeWeapon(l);
  l.slots[l.active] = id;
  return { dropped };
}
