import type { Settings } from "@dh/shared";
import type Phaser from "phaser";
import { jitterRate } from "../logic/juice.ts";

export const SFX_NAMES = [
  "pistol",
  "smg",
  "shotgun",
  "rifle",
  "burst",
  "beam-loop",
  "melee",
  "launcher",
  "charge",
  "chain",
  "dryfire",
  "hit",
  "enemy-death",
  "player-hurt",
  "shield-break",
  "dash",
  "door-lock",
  "door-unlock",
  "pickup",
  "vigil-alarm",
] as const;

const MAX_VOICES = 4;

/** Every SFX goes through here: ±5% pitch, `sfxVolume`, and at most 4 voices per key. */
export class AudioSystem {
  private readonly scene: Phaser.Scene;
  private readonly settings: Settings;

  constructor(scene: Phaser.Scene, settings: Settings) {
    this.scene = scene;
    this.settings = settings;
    // Browsers keep audio suspended until a gesture; the first shot after load must still play.
    const unlock = () => {
      const ctx = (scene.sound as Partial<Phaser.Sound.WebAudioSoundManager>).context;
      if (ctx?.state === "suspended") void ctx.resume();
    };
    scene.input.once("pointerdown", unlock);
    scene.input.keyboard?.once("keydown", unlock);
  }

  play(key: string, opts: { pitchJitter?: number; volume?: number } = {}): void {
    const volume = this.settings.sfxVolume * (opts.volume ?? 1);
    if (volume <= 0 || !this.scene.cache.audio.exists(key)) return;
    const playing = this.scene.sound.getAll(key).filter((s) => s.isPlaying);
    if (playing.length >= MAX_VOICES) playing[0]!.destroy();
    this.scene.sound.play(key, { volume, rate: jitterRate(Math.random, opts.pitchJitter ?? 0.05) });
  }

  setVolumes(music: number, sfx: number): void {
    this.settings.musicVolume = music;
    this.settings.sfxVolume = sfx;
  }
}
