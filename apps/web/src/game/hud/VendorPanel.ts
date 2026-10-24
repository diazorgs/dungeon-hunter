import { PALETTE, WEAPONS } from "@dh/shared";
import type Phaser from "phaser";
import type { VendorItem, VendorStock } from "../logic/vendor.ts";
import { hudText } from "./text.ts";

const REASON: Record<string, string> = {
  NOT_ENOUGH_SCRAP: "Not enough Scrap.",
  SOLD_OUT: "Sold out.",
  FULL: "Already full.",
};

/** Vendor overlay: 1–4 to buy, Esc to leave. `buy` applies a purchase and returns an error reason or null. */
export class VendorPanel {
  private readonly scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isOpen(): boolean {
    return this.container !== null;
  }

  open(
    stock: VendorStock,
    scrap: () => number,
    buy: (item: VendorItem) => string | null,
  ): Promise<void> {
    const scene = this.scene;
    const { width, height } = scene.scale;
    const x0 = width / 2 - 110;
    const y0 = height / 2 - 60;
    const lines = hudText(scene, x0 + 10, y0 + 22, "#cfd8e6").setLineSpacing(4);
    const status = hudText(scene, x0 + 10, y0 + 100, "#ffd23f");
    this.container = scene.add
      .container(0, 0, [
        scene.add.rectangle(0, 0, width, height, PALETTE.ink, 0.6).setOrigin(0),
        scene.add
          .rectangle(x0, y0, 220, 120, PALETTE.ink)
          .setOrigin(0)
          .setStrokeStyle(2, PALETTE["teal-400"]),
        hudText(scene, x0 + 10, y0 + 6, "#7fe0d4").setText("VENDOR TERMINAL"),
        lines,
        status,
      ])
      .setDepth(200);

    const render = (msg = "") => {
      const w = stock.weapons.map(
        (it, i) =>
          `${i + 1}  ${WEAPONS[it.id].name.padEnd(16)} ${it.sold ? "SOLD" : `${it.price} S`}`,
      );
      lines.setText([
        ...w,
        `3  Health +${stock.health.amount}         ${stock.health.price} S`,
        `4  Energy +${stock.energy.amount}        ${stock.energy.price} S`,
        "",
        "Esc  leave",
      ]);
      status.setText(`SCRAP ${scrap()}   ${msg}`);
    };
    render();

    return new Promise((resolve) => {
      const kb = scene.input.keyboard!;
      const onKey = (e: KeyboardEvent) => {
        const n = Number(e.key);
        const item: VendorItem | null =
          n === 1 || n === 2
            ? { kind: "weapon", index: n - 1 }
            : n === 3
              ? { kind: "health" }
              : n === 4
                ? { kind: "energy" }
                : null;
        if (item) {
          const err = buy(item);
          render(err ? (REASON[err] ?? err) : "Purchased.");
        } else if (e.key === "Escape") {
          kb.off("keydown", onKey);
          this.container?.destroy();
          this.container = null;
          resolve();
        }
      };
      kb.on("keydown", onKey);
    });
  }
}
