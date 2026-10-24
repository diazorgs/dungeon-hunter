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
const CROSSFADE_MS = 800;
const MUSIC_REGISTRY = "music:current";

/** `music.sector1` → its file. Music loads lazily, so the first screen never waits for it. */
export const musicUrl = (key: string) => `assets/audio/music/${key.replace(/^music\./, "")}.wav`;

/** Queues a track's download without playing it (the Lift prefetches the next sector). */
export function prefetchMusic(scene: Phaser.Scene, key: string): void {
  if (scene.cache.audio.exists(key)) return;
  scene.load.audio(key, musicUrl(key));
  scene.load.start();
}

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

  /**
   * Crossfades to `key` (800 ms), loading it first if needed. The playing track lives in the game
   * registry, so it carries across sector restarts without double-playing.
   */
  playMusic(key: string): void {
    const scene = this.scene;
    const reg = scene.registry;
    const current = reg.get(MUSIC_REGISTRY) as Phaser.Sound.WebAudioSound | undefined;
    if (current?.key === key) return;
    const volume = this.settings.musicVolume;
    const start = () => {
      if (!scene.sys.isActive() || reg.get(MUSIC_REGISTRY) !== current) return;
      if (current) {
        scene.tweens.add({
          targets: current,
          volume: 0,
          duration: CROSSFADE_MS,
          onComplete: () => current.destroy(),
        });
      }
      if (volume <= 0) return void reg.remove(MUSIC_REGISTRY);
      const next = scene.sound.add(key, { loop: true, volume: 0 }) as Phaser.Sound.WebAudioSound;
      next.play();
      scene.tweens.add({ targets: next, volume, duration: CROSSFADE_MS });
      reg.set(MUSIC_REGISTRY, next);
    };
    if (scene.cache.audio.exists(key)) return start();
    scene.load.once(`filecomplete-audio-${key}`, start);
    prefetchMusic(scene, key);
  }

  setVolumes(music: number, sfx: number): void {
    this.settings.musicVolume = music;
    this.settings.sfxVolume = sfx;
  }
}
