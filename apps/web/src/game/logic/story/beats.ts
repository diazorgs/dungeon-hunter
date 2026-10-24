import { SECTORS } from "@dh/shared";
import type { BossId, RadioLine, SectorId } from "@dh/shared";
import type { RoomType } from "../dungeon/types.ts";

export type Beat = RadioLine["beat"];

export type StoryEvent =
  | { type: "sector:entered"; sector: SectorId }
  | { type: "boss:dead"; id: BossId }
  | { type: "room:entered"; roomType: RoomType; sector: SectorId }
  | { type: "run:death" };

const BOSS_BEAT: Record<BossId, Beat> = {
  gatekeeper: "gatekeeper-dead",
  "conduit-hydra": "hydra-dead",
  "core-warden": "victory",
};

export function beatForEvent(e: StoryEvent): Beat | null {
  switch (e.type) {
    case "sector:entered":
      return SECTORS[e.sector].radioEnterBeat;
    case "boss:dead":
      return BOSS_BEAT[e.id];
    case "room:entered":
      return e.roomType === "boss" && e.sector === 3 ? "core-chamber" : null;
    case "run:death":
      return "death";
  }
}

/** Remembers which beats played this run, so re-entering a room never replays one. */
export class BeatLog {
  private readonly fired = new Set<string>();

  fire(beat: string): boolean {
    if (this.fired.has(beat)) return false;
    this.fired.add(beat);
    return true;
  }

  has(beat: string): boolean {
    return this.fired.has(beat);
  }
}
