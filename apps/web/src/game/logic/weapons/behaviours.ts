import type { Weapon } from "@dh/shared";

/** Every behaviour the registry must provide; the roster test checks each weapon uses one of these. */
export const IMPLEMENTED_BEHAVIOURS: readonly Weapon["behaviour"][] = [
  "bullet",
  "pierce",
  "bounce",
  "burst",
  "melee-swing",
  "beam",
  "explosive",
  "chain",
  "charge-orb",
];
