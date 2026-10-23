import { PALETTE } from "@dh/shared";
import Phaser from "phaser";

// Low glow quality keeps 20+ Bleed guardians cheap; set false if profiling shows > 2 ms.
const BLEED_GLOW = true;

/** Bleed treatment: magenta tint plus a faint internal glow. Hit flashes restore tint and mode. */
export function applyBleedVisual(sprite: Phaser.GameObjects.Sprite): void {
  sprite.setTint(PALETTE["bleed-300"]).setTintMode(Phaser.TintModes.MULTIPLY);
  // filterCamera exists once filters were enabled: re-applying after a flash must not stack glows.
  if (!BLEED_GLOW || sprite.filterCamera) return;
  sprite.enableFilters().filters?.internal.addGlow(PALETTE["bleed-500"], 2, 0, 1, false, 4);
}
