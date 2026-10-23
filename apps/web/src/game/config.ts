import Phaser from "phaser";
import type { RunConfig } from "./bridge/types.ts";
import { BootScene } from "./scenes/BootScene.ts";
import { DungeonScene } from "./scenes/DungeonScene.ts";
import { HudScene } from "./scenes/HudScene.ts";
import { LiftScene } from "./scenes/LiftScene.ts";
import { PauseScene } from "./scenes/PauseScene.ts";
import { PreloadScene } from "./scenes/PreloadScene.ts";
import { SandboxScene } from "./scenes/SandboxScene.ts";

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export function createGameConfig(
  parent: HTMLElement,
  run: RunConfig,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#0b0d12",
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { gamepad: true },
    physics: { default: "arcade", arcade: { debug: false } },
    callbacks: { preBoot: (game) => game.registry.set("runConfig", run) },
    scene: [
      BootScene,
      PreloadScene,
      DungeonScene,
      HudScene,
      PauseScene,
      LiftScene,
      ...(import.meta.env.DEV ? [SandboxScene] : []),
    ],
  };
}
