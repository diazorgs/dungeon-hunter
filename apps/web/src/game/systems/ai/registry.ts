import type { Guardian } from "@dh/shared";
import type { AiFactory } from "./AiController.ts";
import { HoverShooterAi } from "./HoverShooterAi.ts";
import { RusherAi } from "./RusherAi.ts";
import { MortarAi } from "./MortarAi.ts";
import { ShieldAi } from "./ShieldAi.ts";
import { SpiderAi } from "./SpiderAi.ts";
import { TurretAi } from "./TurretAi.ts";
import { WraithAi } from "./WraithAi.ts";

const factories = new Map<Guardian["ai"], AiFactory>([
  ["hover-shooter", (g, w) => new HoverShooterAi(g, w)],
  ["rusher", (g, w) => new RusherAi(g, w)],
  ["turret", (g, w) => new TurretAi(g, w)],
  ["shield", (g, w) => new ShieldAi(g, w)],
  ["spider", (g, w) => new SpiderAi(g, w)],
  ["mortar", (g, w) => new MortarAi(g, w)],
  ["wraith", (g, w) => new WraithAi(g, w)],
]);

export function getAi(id: Guardian["ai"]): AiFactory {
  const f = factories.get(id);
  if (!f) throw new Error(`No guardian AI registered for "${id}"`);
  return f;
}

/** AIs that exist; the encounter pool only buys guardians that can act. */
export const IMPLEMENTED_AI: ReadonlySet<string> = new Set(factories.keys());
