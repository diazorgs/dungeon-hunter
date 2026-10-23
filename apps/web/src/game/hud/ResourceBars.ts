import { PALETTE } from "@dh/shared";
import type Phaser from "phaser";
import type { CombatantState } from "../logic/combat/combatant.ts";
import { hudText } from "./text.ts";

const MAX_W = 96;
const SEG_H = 5;

/** HP and Shield as segments (one per point), Energy as a bar with a number. */
export class ResourceBars {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly energyText: Phaser.GameObjects.Text;
  private readonly x: number;
  private readonly y: number;
  private key = "";

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;
    this.g = scene.add.graphics();
    this.energyText = hudText(scene, x + MAX_W + 4, y + 12, "#3d7bff");
  }

  update(c: CombatantState): void {
    const key = `${c.hp}/${c.maxHp}/${c.shield}/${c.maxShield}/${c.energy}/${c.maxEnergy}`;
    if (key === this.key) return;
    this.key = key;
    const g = this.g.clear();
    this.segments(c.hp, c.maxHp, this.y, PALETTE.hp, PALETTE["hp-dark"]);
    this.segments(c.shield, c.maxShield, this.y + 7, PALETTE.shield, PALETTE["steel-700"]);
    const ew = Math.min(MAX_W, Math.round(c.maxEnergy / 2));
    g.fillStyle(PALETTE["steel-700"]).fillRect(this.x, this.y + 14, ew, 4);
    g.fillStyle(PALETTE.energy).fillRect(
      this.x,
      this.y + 14,
      Math.round((ew * c.energy) / Math.max(1, c.maxEnergy)),
      4,
    );
    this.energyText.setPosition(this.x + ew + 4, this.y + 11).setText(String(c.energy));
  }

  /** Segments shrink as max grows so the bar never exceeds 96 px. */
  private segments(value: number, max: number, y: number, full: number, empty: number): void {
    const step = Math.max(2, Math.min(9, Math.floor((MAX_W + 1) / Math.max(1, max))));
    for (let i = 0; i < max; i++)
      this.g.fillStyle(i < value ? full : empty).fillRect(this.x + i * step, y, step - 1, SEG_H);
  }
}
