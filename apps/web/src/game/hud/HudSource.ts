import type { SectorId } from "@dh/shared";
import type Phaser from "phaser";
import type { Player } from "../entities/Player.ts";
import type { DungeonLayout } from "../logic/dungeon/types.ts";
import type { SkillSystem } from "../systems/SkillSystem.ts";
import type { WeaponSystem } from "../systems/weapons/WeaponSystem.ts";

/** What the HUD reads each frame. Set in the registry as `hudSource`; `hud:rebind` on game.events when replaced. */
export interface HudSource {
  player: Player;
  weapons: WeaponSystem;
  skills: SkillSystem;
  layout: DungeonLayout;
  visitedRooms: ReadonlySet<number>;
  currentRoom(): number | null;
  scrap(): number;
  sector: SectorId;
  /** The world scene's event emitter (room, boss and hud events). */
  events: Phaser.Events.EventEmitter;
}
