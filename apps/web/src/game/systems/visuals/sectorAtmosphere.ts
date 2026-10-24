import { PALETTE } from "@dh/shared";
import type { SectorConfig } from "@dh/shared";
import type Phaser from "phaser";
import { TILE_PX } from "../../logic/dungeon/compose.ts";
import type { ComposedSector } from "../../logic/dungeon/compose.ts";

const CORRUPTED_PROP_TILE = 6;

/**
 * Bleed growth per sector (DESIGN.md §11.2): none in Sector 1, steam and flickering corrupted props in
 * Sector 2, a magenta colour grade and pulsing vignette in Sector 3. Only the dungeon camera is filtered,
 * so the HUD scene stays clean.
 */
export function applySectorAtmosphere(
  scene: Phaser.Scene,
  sector: SectorConfig,
  c: ComposedSector,
): void {
  const cam = scene.cameras.main;
  cam.filters.internal.clear();
  cam.filters.external.clear();
  // Sector 1 is the overgrown wing: dark undergrowth between the rooms instead of void.
  cam.setBackgroundColor(sector.id === 1 ? PALETTE["moss-900"] : PALETTE.void);
  if (sector.bleedLevel === 0) return;

  // Corrupted props glow on and off.
  for (let i = 0; i < c.decor.length; i++) {
    if (c.decor[i] !== CORRUPTED_PROP_TILE) continue;
    const x = (i % c.widthTiles) * TILE_PX + TILE_PX / 2;
    const y = Math.floor(i / c.widthTiles) * TILE_PX + TILE_PX / 2;
    const glow = scene.add.circle(x, y, 7, PALETTE["bleed-500"], 0).setDepth(11);
    scene.tweens.add({
      targets: glow,
      fillAlpha: 0.45,
      duration: 180,
      yoyo: true,
      repeat: -1,
      repeatDelay: 600 + Math.random() * 2400,
      delay: Math.random() * 2000,
    });
  }

  if (sector.bleedLevel === 1) {
    // Faint steam drifting up across the sector.
    scene.add
      .particles(0, 0, "ph-spark", {
        x: { min: 0, max: c.widthTiles * TILE_PX },
        y: { min: 0, max: c.heightTiles * TILE_PX },
        frequency: 40,
        quantity: 2,
        lifespan: 1600,
        speedY: { min: -18, max: -8 },
        speedX: { min: -4, max: 4 },
        scale: { start: 1, end: 3 },
        alpha: { start: 0.25, end: 0 },
        tint: PALETTE["steel-300"],
      })
      .setDepth(4500);
    return;
  }

  const grade = cam.filters.internal.addColorMatrix();
  grade.colorMatrix.hue(-12).saturate(0.25, true);
  const vignette = cam.filters.external.addVignette(0.5, 0.5, 0.75, 0.35, PALETTE["bleed-700"]);
  scene.tweens.add({
    targets: vignette,
    strength: 0.6,
    duration: 1800,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut",
  });
}
