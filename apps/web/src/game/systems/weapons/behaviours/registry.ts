import type { Weapon } from "@dh/shared";
import type { Behaviour } from "./Behaviour.ts";
import { BulletBehaviour } from "./BulletBehaviour.ts";

const behaviours = new Map<Weapon["behaviour"], Behaviour>();

export function registerBehaviour(b: Behaviour): void {
  behaviours.set(b.id, b);
}

export function getBehaviour(id: Weapon["behaviour"]): Behaviour {
  const b = behaviours.get(id);
  if (!b) throw new Error(`No weapon behaviour registered for "${id}"`);
  return b;
}

registerBehaviour(new BulletBehaviour());
