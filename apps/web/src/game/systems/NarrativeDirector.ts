import { RADIO } from "@dh/shared";
import type { BossId, SectorId } from "@dh/shared";
import { createRng } from "@dh/utils";
import type Phaser from "phaser";
import type { RadioLineIn } from "../hud/RadioBox.ts";
import type { RoomType } from "../logic/dungeon/types.ts";
import { beatForEvent } from "../logic/story/beats.ts";
import type { Beat, BeatLog, StoryEvent } from "../logic/story/beats.ts";
import { degradeText } from "../logic/story/degrade.ts";

const SEALED_FULL_MS = 1500;
const SEALED_SHORT_MS = 600;

/**
 * Turns dungeon events into radio lines and VIGIL banners. It only emits on the scene's events;
 * the HUD draws them, so story text never pauses combat.
 */
export class NarrativeDirector {
  private readonly scene: Phaser.Scene;
  private readonly sector: SectorId;
  private readonly beats: BeatLog;
  private readonly rng;
  private sealedShown = false;

  constructor(scene: Phaser.Scene, sector: SectorId, seed: string, beats: BeatLog) {
    this.scene = scene;
    this.sector = sector;
    this.beats = beats;
    this.rng = createRng(seed).fork(`radio:s${sector}`);
    const on = <T>(e: string, fn: (d: T) => void) => scene.events.on(e, fn);
    on<{ sector: SectorId }>("sector:entered", (d) =>
      this.handle({ type: "sector:entered", sector: d.sector }),
    );
    on<{ id: BossId }>("boss:dead", (d) => this.handle({ type: "boss:dead", id: d.id }));
    on<{ type: RoomType }>("room:entered", (d) =>
      this.handle({ type: "room:entered", roomType: d.type, sector }),
    );
    on("room:locked", () => this.sealed());
    on("player:died", () => {
      // Nothing queued may land on top of the death transition.
      scene.events.emit("radio:flush");
      this.handle({ type: "run:death" });
    });
  }

  private handle(e: StoryEvent): void {
    const beat = beatForEvent(e);
    if (beat && this.beats.fire(beat)) this.play(beat);
  }

  private play(beat: Beat): void {
    const glitch = this.beats.has("hydra-dead");
    for (const l of RADIO.filter((r) => r.beat === beat)) {
      const text =
        l.speaker === "ops" && this.sector === 3 ? degradeText(l.text, 2, this.rng) : l.text;
      const line: RadioLineIn = {
        speaker: l.speaker,
        text,
        durationMs: l.durationMs,
        glitch: l.speaker === "vigil" && glitch && beat !== "victory",
      };
      this.scene.events.emit("radio:say", line);
    }
  }

  /** Full banner on the first lock of a sector, then a short flash so it never gets spammy. */
  private sealed(): void {
    const full = RADIO.find((l) => l.beat === "vigil-sealed")!.text;
    this.scene.events.emit(
      "vigil:banner",
      this.sealedShown
        ? { text: "SEALED.", ms: SEALED_SHORT_MS }
        : { text: full, ms: SEALED_FULL_MS },
    );
    this.sealedShown = true;
  }
}
