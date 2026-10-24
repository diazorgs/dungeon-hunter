import { LOGS, PALETTE } from "@dh/shared";
import type { LogId } from "@dh/shared";
import type Phaser from "phaser";
import { hudText } from "./text.ts";

const CHARS_PER_SEC = 60;
const TOAST_MS = 2000;

/** Vault Log reader: typewriter text over the world; never pauses, closes on E or walking off. */
export class LogPanel {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly body: Phaser.GameObjects.Text;
  private readonly toast: Phaser.GameObjects.Text;
  private full = "";
  private openedAt = 0;
  private toastUntil = 0;
  isOpen = false;

  constructor(scene: Phaser.Scene) {
    const { width } = scene.scale;
    this.bg = scene.add.rectangle(width / 2, 120, 300, 96, PALETTE.ink, 0.92).setVisible(false);
    this.bg.setStrokeStyle(1, PALETTE["teal-600"]);
    this.body = hudText(scene, width / 2 - 142, 78, "#7fe0d4").setWordWrapWidth(284);
    this.toast = hudText(scene, width / 2, 56, "#7fe0d4").setOrigin(0.5);
    this.toast.setText("VAULT LOG RECOVERED").setVisible(false);
  }

  open(id: LogId, isNew: boolean, now: number): void {
    const log = LOGS[id];
    this.full = `> ${log.title.toUpperCase()}\n\n${log.lines.join("\n")}`;
    this.openedAt = now;
    this.isOpen = true;
    if (isNew) this.toastUntil = now + TOAST_MS;
  }

  close(): void {
    this.isOpen = false;
  }

  update(now: number): void {
    this.bg.setVisible(this.isOpen);
    this.body.setVisible(this.isOpen);
    if (this.isOpen)
      this.body.setText(this.full.slice(0, ((now - this.openedAt) / 1000) * CHARS_PER_SEC));
    this.toast.setVisible(now < this.toastUntil);
  }
}
