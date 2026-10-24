import { PALETTE } from "@dh/shared";
import type Phaser from "phaser";
import { resolveTexture, textureFor } from "../content/textures.ts";
import type { CombatantState } from "../logic/combat/combatant.ts";
import { hudText } from "./text.ts";

const R = 15;
const RING = 4;

/** Top-left gauge: Runner portrait in a ring, HP filling the left half, Energy the right, Shield inside. */
export class StatusOrb {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly lines: Phaser.GameObjects.Text[];
  private readonly cx: number;
  private readonly cy: number;
  private key = "";
  private runnerId = "";

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.cx = x + R + 1;
    this.cy = y + R + 1;
    this.g = scene.add.graphics();
    // Head and shoulders of the 16×24 sprite.
    this.portrait = scene.add.image(this.cx, this.cy + 5, "ph-runner").setCrop(0, 0, 16, 14);
    this.lines = (["#e0343b", "#9fd8ff", "#3d7bff"] as const).map((c, i) =>
      hudText(scene, x + 2 * R + 7, y + 2 + i * 10, c),
    );
  }

  update(c: CombatantState, runnerId: string): void {
    if (runnerId !== this.runnerId) {
      this.runnerId = runnerId;
      const s = this.portrait.scene;
      const tex = resolveTexture(s.textures, textureFor("runner", runnerId), "ph-runner");
      this.portrait.setTexture(tex.key, tex.frame).setCrop(0, 0, 16, 14);
    }
    const key = `${c.hp}/${c.maxHp}/${c.shield}/${c.maxShield}/${c.energy}/${c.maxEnergy}`;
    if (key === this.key) return;
    this.key = key;
    const { cx, cy } = this;
    const frac = (v: number, max: number) => Math.max(0, Math.min(1, v / Math.max(1, max)));
    const half = Math.PI / 2;
    const g = this.g.clear();
    g.fillStyle(PALETTE.ink).fillCircle(cx, cy, R + 1);
    g.fillStyle(PALETTE["steel-800"]).fillCircle(cx, cy, R - RING - 1);
    // Both halves start at the bottom: HP climbs the left side, Energy the right.
    g.lineStyle(RING, PALETTE["hp-dark"])
      .beginPath()
      .arc(cx, cy, R - 2, half, half + Math.PI)
      .strokePath();
    g.lineStyle(RING, PALETTE.hp)
      .beginPath()
      .arc(cx, cy, R - 2, half, half + frac(c.hp, c.maxHp) * Math.PI)
      .strokePath();
    g.lineStyle(RING, PALETTE["steel-700"])
      .beginPath()
      .arc(cx, cy, R - 2, half, -half, true)
      .strokePath();
    g.lineStyle(RING, PALETTE.energy)
      .beginPath()
      .arc(cx, cy, R - 2, half, half - frac(c.energy, c.maxEnergy) * Math.PI, true)
      .strokePath();
    if (c.shield > 0)
      g.lineStyle(1, PALETTE.shield)
        .beginPath()
        .arc(cx, cy, R - RING - 1, -half, -half + frac(c.shield, c.maxShield) * Math.PI * 2)
        .strokePath();
    g.lineStyle(1, PALETTE["steel-600"]).strokeCircle(cx, cy, R + 1);
    const [hp, sh, en] = this.lines;
    hp!.setText(`HP ${c.hp}/${c.maxHp}`);
    sh!.setText(`SH ${c.shield}/${c.maxShield}`);
    en!.setText(`EN ${c.energy}/${c.maxEnergy}`);
  }
}
