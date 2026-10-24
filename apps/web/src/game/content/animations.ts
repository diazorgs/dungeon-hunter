import type Phaser from "phaser";
import { ATLASES } from "./manifest.ts";

// [fps, repeat]
const TIMING: Record<string, [number, number]> = {
  idle: [3, -1],
  run: [10, -1],
  dash: [12, 0],
  hurt: [1, 0],
  death: [6, 0],
  attack: [8, -1],
  stunned: [1, -1],
};

/**
 * Builds `runner.<id>.<anim>` and `boss.<id>.<anim>` from the atlas frame names, so new art
 * needs no code change. Call once after loading.
 */
export function registerAnimations(scene: Phaser.Scene): void {
  for (const atlas of ATLASES) {
    if (!scene.textures.exists(atlas.key)) continue;
    const groups = new Map<string, string[]>();
    for (const name of scene.textures.get(atlas.key).getFrameNames()) {
      const [id, anim] = name.split("/");
      if (!id || !anim) continue;
      const key = `${atlas.animPrefix}.${id}.${anim}`;
      groups.set(key, [...(groups.get(key) ?? []), name]);
    }
    for (const [key, frames] of groups) {
      if (scene.anims.exists(key)) continue;
      const [fps, repeat] = TIMING[key.split(".").at(-1)!] ?? [6, -1];
      frames.sort((a, b) => Number(a.split("/")[2]) - Number(b.split("/")[2]));
      scene.anims.create({
        key,
        frames: frames.map((frame) => ({ key: atlas.key, frame })),
        frameRate: fps,
        repeat,
      });
    }
  }
}

const warned = new Set<string>();

/** Plays `key` unless it already is; a missing animation keeps the current frame and warns once. */
export function playAnim(sprite: Phaser.GameObjects.Sprite, key: string): void {
  if (sprite.anims.currentAnim?.key === key) return;
  if (!sprite.scene.anims.exists(key)) {
    if (!warned.has(key)) {
      warned.add(key);
      console.warn(`playAnim: no animation "${key}"`);
    }
    return;
  }
  sprite.play(key);
}
