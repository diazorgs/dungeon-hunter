import type { Guardian } from "@dh/shared";
import type { AiFactory } from "./AiController.ts";
import { HoverShooterAi } from "./HoverShooterAi.ts";
import { RusherAi } from "./RusherAi.ts";

const factories = new Map<Guardian["ai"], AiFactory>([
  ["hover-shooter", (g, w) => new HoverShooterAi(g, w)],
  ["rusher", (g, w) => new RusherAi(g, w)],
]);

export function getAi(id: Guardian["ai"]): AiFactory {
  const f = factories.get(id);
  if (!f) throw new Error(`No guardian AI registered for "${id}"`);
  return f;
}

/** AIs that exist; the encounter pool only buys guardians that can act. */
export const IMPLEMENTED_AI: ReadonlySet<string> = new Set(factories.keys());
