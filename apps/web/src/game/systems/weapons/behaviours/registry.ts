import type { Weapon } from "@dh/shared";
import { IMPLEMENTED_BEHAVIOURS } from "../../../logic/weapons/behaviours.ts";
import { Beam } from "./Beam.ts";
import type { Behaviour } from "./Behaviour.ts";
import { BulletBehaviour } from "./BulletBehaviour.ts";
import { Burst } from "./Burst.ts";
import { Chain } from "./Chain.ts";
import { ChargeOrb } from "./ChargeOrb.ts";
import { Explosive } from "./Explosive.ts";
import { MeleeSwing } from "./MeleeSwing.ts";

const factories = new Map<Weapon["behaviour"], () => Behaviour>([
  ["bullet", () => new BulletBehaviour("bullet")],
  ["pierce", () => new BulletBehaviour("pierce")],
  ["bounce", () => new BulletBehaviour("bounce")],
  ["burst", () => new Burst()],
  ["melee-swing", () => new MeleeSwing()],
  ["beam", () => new Beam()],
  ["explosive", () => new Explosive()],
  ["chain", () => new Chain()],
  ["charge-orb", () => new ChargeOrb()],
]);

// Boot-time guard: the registry and the declared list must match exactly.
if (
  factories.size !== IMPLEMENTED_BEHAVIOURS.length ||
  IMPLEMENTED_BEHAVIOURS.some((b) => !factories.has(b))
)
  throw new Error("weapon behaviour registry is out of sync with IMPLEMENTED_BEHAVIOURS");

/** A fresh instance: stateful behaviours (beam, charge) must not share state across scenes. */
export function createBehaviour(id: Weapon["behaviour"]): Behaviour {
  const f = factories.get(id);
  if (!f) throw new Error(`No weapon behaviour registered for "${id}"`);
  return f();
}
