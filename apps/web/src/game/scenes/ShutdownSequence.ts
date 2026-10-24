import type Phaser from "phaser";
import type { Player } from "../entities/Player.ts";

const FLASH_MS = 400;
const SLOW_MS = 1000;
const FADE_MS = 1500;

/**
 * Victory beat after the Core Warden dies: the Runner is invulnerable and frozen, the Core implodes
 * (white flash, slow-mo), VIGIL's last clean line plays, then fade to bone.
 */
export function playShutdown(
  scene: Phaser.Scene,
  player: Player,
  lockInput: () => void,
): Promise<void> {
  player.god = true;
  player.setVelocity(0, 0);
  lockInput();
  const cam = scene.cameras.main;
  cam.flash(FLASH_MS, 255, 255, 255);
  scene.time.timeScale = 0.4;
  scene.events.emit("radio:say", {
    speaker: "vigil",
    text: "...Core offline. Systems clean. Thank you, Runner.",
    durationMs: 3000,
  });
  return new Promise((resolve) => {
    // Real-time wait: the scene clock is slowed for the implosion.
    setTimeout(() => {
      scene.time.timeScale = 1;
      cam.fadeOut(FADE_MS, 0xee, 0xf2, 0xf7);
      cam.once("camerafadeoutcomplete", () => resolve());
    }, SLOW_MS);
  });
}
