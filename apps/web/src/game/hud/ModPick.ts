import { MODS, PALETTE } from "@dh/shared";
import type { ModId } from "@dh/shared";
import Phaser from "phaser";
import { hudText } from "./text.ts";

const CARD_W = 96;
const CARD_H = 120;
const GAP = 12;

/** 1-of-3 Vault Mod cards: 1/2/3, A/D + E, or click. Esc cancels only when allowed. */
export class ModPick {
  private readonly scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isOpen(): boolean {
    return this.container !== null;
  }

  open(
    choices: readonly ModId[],
    opts: { cancellable: boolean; gold?: boolean },
  ): Promise<ModId | null> {
    const scene = this.scene;
    const { width, height } = scene.scale;
    const total = choices.length * CARD_W + (choices.length - 1) * GAP;
    const x0 = (width - total) / 2;
    const y0 = (height - CARD_H) / 2;
    let selected = 0;
    const frames: Phaser.GameObjects.Rectangle[] = [];
    const items: Phaser.GameObjects.GameObject[] = [
      scene.add.rectangle(0, 0, width, height, PALETTE.ink, 0.7).setOrigin(0),
      hudText(scene, width / 2, y0 - 18, "#cfd8e6")
        .setOrigin(0.5, 0)
        .setText("CHOOSE A VAULT MOD"),
    ];
    choices.forEach((id, i) => {
      const x = x0 + i * (CARD_W + GAP);
      const frame = scene.add
        .rectangle(x, y0, CARD_W, CARD_H, PALETTE.ink)
        .setOrigin(0)
        .setStrokeStyle(2, PALETTE["steel-700"])
        .setInteractive({ useHandCursor: false });
      frames.push(frame);
      items.push(
        frame,
        scene.add.rectangle(
          x + CARD_W / 2,
          y0 + 26,
          24,
          24,
          opts.gold ? PALETTE.scrap : PALETTE["teal-400"],
        ),
        hudText(scene, x + 6, y0 + 48, "#eef2f7")
          .setText(MODS[id].name)
          .setWordWrapWidth(CARD_W - 12),
        hudText(scene, x + 6, y0 + 72, "#a9b8d1")
          .setText(MODS[id].description)
          .setWordWrapWidth(CARD_W - 12),
        hudText(scene, x + CARD_W / 2, y0 + CARD_H - 12, "#8296b8")
          .setOrigin(0.5, 0)
          .setText(String(i + 1)),
      );
      frame.on("pointerover", () => select(i));
      frame.on("pointerdown", () => finish(choices[i]!));
    });
    items.push(
      hudText(scene, width / 2, y0 + CARD_H + 8, "#8296b8")
        .setOrigin(0.5, 0)
        .setText(opts.cancellable ? "1-3 / A D + E  ·  Esc to leave it" : "1-3 / A D + E"),
    );
    this.container = scene.add.container(0, 0, items).setDepth(200);

    const select = (i: number) => {
      selected = (i + choices.length) % choices.length;
      frames.forEach((f, j) => {
        f.setStrokeStyle(2, j === selected ? PALETTE["amber-500"] : PALETTE["steel-700"]);
        f.setY(j === selected ? y0 - 2 : y0);
      });
    };
    select(0);

    let finish: (id: ModId | null) => void = () => {};
    return new Promise((resolve) => {
      const kb = scene.input.keyboard!;
      const onKey = (e: KeyboardEvent) => {
        const n = Number(e.key);
        if (n >= 1 && n <= choices.length) finish(choices[n - 1]!);
        else if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") select(selected - 1);
        else if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") select(selected + 1);
        else if (e.key === "e" || e.key === "E" || e.key === "Enter") finish(choices[selected]!);
        else if (e.key === "Escape" && opts.cancellable) finish(null);
      };
      kb.on("keydown", onKey);
      finish = (id) => {
        kb.off("keydown", onKey);
        this.container?.destroy();
        this.container = null;
        resolve(id);
      };
    });
  }
}
