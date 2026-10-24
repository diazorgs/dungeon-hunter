import { PALETTE } from "@dh/shared";
import type { WeaponId } from "@dh/shared";
import type Phaser from "phaser";
import { resolveTexture, textureFor } from "../content/textures.ts";
import type { Loadout } from "../logic/weapons/loadout.ts";
import { hudText } from "./text.ts";

interface Button {
  x: number;
  y: number;
  r: number;
  key: string;
}

/**
 * Bottom-right action cluster, one round button per key: J attack (active weapon), Q swap
 * (the other weapon), K skill (cooldown sweep) and Space dash (charge pips).
 */
export class ActionButtons {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly scene: Phaser.Scene;
  private readonly attack: Button;
  private readonly swap: Button;
  private readonly skill: Button;
  private readonly dash: Button;
  private readonly icons: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  private readonly cost: Phaser.GameObjects.Text;
  private readonly skillText: Phaser.GameObjects.Text;
  private key = "";
  private wasReady = true;

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.scene = scene;
    this.attack = { x: width - 26, y: height - 30, r: 18, key: "J" };
    this.swap = { x: width - 24, y: height - 70, r: 10, key: "Q" };
    this.skill = { x: width - 64, y: height - 20, r: 12, key: "K" };
    this.dash = { x: width - 64, y: height - 54, r: 10, key: "SPC" };
    this.g = scene.add.graphics();
    this.icons = [
      scene.add.image(this.attack.x, this.attack.y, "ph-weapon").setScale(2),
      scene.add.image(this.swap.x, this.swap.y, "ph-weapon"),
    ];
    this.cost = hudText(scene, this.attack.x + 10, this.attack.y - 20, "#3d7bff");
    this.skillText = hudText(scene, this.skill.x, this.skill.y - 4, "#eef2f7").setOrigin(0.5, 0);
    // Key hint on a tab centred under each button's rim.
    for (const b of [this.attack, this.swap, this.skill, this.dash])
      hudText(scene, b.x, b.y + b.r - 3, "#eef2f7")
        .setOrigin(0.5, 0)
        .setText(b.key)
        .setDepth(1);
  }

  update(
    loadout: Loadout,
    energyCost: (id: WeaponId) => number,
    skill: { progress: number; remainingSec: number },
    dash: { ready: number; max: number },
  ): void {
    const other = loadout.slots[1 - loadout.active] ?? null;
    const active = loadout.slots[loadout.active]!;
    const ready = skill.progress >= 1;
    const key = [
      active,
      other,
      energyCost(active),
      ready ? "r" : Math.round(skill.progress * 40),
      Math.ceil(skill.remainingSec),
      dash.ready,
      dash.max,
    ].join("/");
    if (key === this.key) return;
    this.key = key;
    const g = this.g.clear();
    const disc = (b: Button, rim: number) => {
      g.fillStyle(PALETTE.ink, 0.8).fillCircle(b.x, b.y, b.r);
      g.lineStyle(2, rim).strokeCircle(b.x, b.y, b.r);
    };
    const badge = (b: Button) => {
      const w = b.key.length * 6 + 4;
      g.fillStyle(PALETTE["steel-700"]).fillRect(b.x - w / 2, b.y + b.r - 4, w, 10);
      g.lineStyle(1, PALETTE.ink).strokeRect(b.x - w / 2 + 0.5, b.y + b.r - 3.5, w - 1, 9);
    };

    disc(this.attack, PALETTE["amber-500"]);
    this.setIcon(0, active);
    const c = energyCost(active);
    this.cost.setText(c > 0 ? `E${c}` : "");

    disc(this.swap, other ? PALETTE["steel-500"] : PALETTE["steel-700"]);
    this.icons[1].setVisible(other !== null);
    if (other) this.setIcon(1, other);

    disc(this.skill, ready ? PALETTE["amber-300"] : PALETTE["steel-700"]);
    if (!ready)
      g.fillStyle(PALETTE["amber-500"], 0.5)
        .slice(
          this.skill.x,
          this.skill.y,
          this.skill.r - 2,
          -Math.PI / 2,
          -Math.PI / 2 + skill.progress * Math.PI * 2,
        )
        .fillPath();
    else g.fillStyle(PALETTE["amber-300"]).fillCircle(this.skill.x, this.skill.y, 4);
    this.skillText.setText(ready ? "" : String(Math.ceil(skill.remainingSec)));
    if (ready && !this.wasReady) {
      const flash = this.scene.add.circle(
        this.skill.x,
        this.skill.y,
        this.skill.r + 2,
        PALETTE.bone,
      );
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 250,
        onComplete: () => flash.destroy(),
      });
    }
    this.wasReady = ready;

    disc(this.dash, dash.ready > 0 ? PALETTE.shield : PALETTE["steel-700"]);
    for (let i = 0; i < dash.max; i++)
      g.fillStyle(i < dash.ready ? PALETTE.shield : PALETTE["steel-700"]).fillRect(
        this.dash.x - dash.max * 2.5 + i * 5 + 1,
        this.dash.y - 1,
        3,
        3,
      );
    for (const b of [this.attack, this.swap, this.skill, this.dash]) badge(b);
  }

  private setIcon(i: 0 | 1, id: WeaponId): void {
    const tex = resolveTexture(this.scene.textures, textureFor("weapon", id), "ph-weapon");
    this.icons[i].setTexture(tex.key, tex.frame).setVisible(true);
  }
}
