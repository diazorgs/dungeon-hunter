import { PALETTE } from "@dh/shared";
import type Phaser from "phaser";
import { hudText } from "./text.ts";

export interface RadioLineIn {
  speaker: "ops" | "vigil";
  text: string;
  durationMs: number;
  /** VIGIL after the Hydra falls: the line jitters to hint at the corruption. */
  glitch?: boolean;
}

const CHARS_PER_SEC = 40;
const MAX_VISIBLE = 2;
const FADE_MS = 300;
// Wide enough for a 70-char line in one row, clear of the weapon slots on the right.
const BOX_W = 360;

interface Showing {
  line: RadioLineIn;
  startedAt: number;
  text: Phaser.GameObjects.Text;
}

/** Bottom-left radio: queued, typewritten, fades on its own; never pauses combat. Runs on HUD time. */
export class RadioBox {
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly queue: RadioLineIn[] = [];
  private showing: Showing[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bg = scene.add
      .rectangle(4, scene.scale.height - 4, BOX_W, 30, PALETTE.ink, 0.8)
      .setOrigin(0, 1)
      .setVisible(false);
  }

  say(line: RadioLineIn): void {
    this.queue.push(line);
  }

  /** Drops everything queued or showing (death, run end). */
  flush(): void {
    this.queue.length = 0;
    for (const s of this.showing) s.text.destroy();
    this.showing = [];
    this.bg.setVisible(false);
  }

  update(now: number): void {
    while (this.showing.length < MAX_VISIBLE && this.queue.length) {
      const line = this.queue.shift()!;
      const text = hudText(this.scene, 8, 0, "#cfd8e6").setWordWrapWidth(BOX_W - 8);
      this.showing.push({ line, startedAt: now, text });
    }
    for (const s of this.showing) {
      const typed = Math.floor(((now - s.startedAt) / 1000) * CHARS_PER_SEC);
      const tag = s.line.speaker === "ops" ? "OPS" : "VIGIL";
      s.text.setText(`${tag}: ${s.line.text.slice(0, typed)}`);
      // shortcut: whole line in the speaker colour (OPS teal-200, VIGIL bleed-300) until BitmapText.
      s.text.setColor(s.line.speaker === "ops" ? "#7fe0d4" : "#ff4fbf");
      const typedMs = (s.line.text.length / CHARS_PER_SEC) * 1000;
      const age = now - s.startedAt - typedMs - s.line.durationMs;
      s.text.setAlpha(age > 0 ? Math.max(0, 1 - age / FADE_MS) : 1);
    }
    for (const s of this.showing.filter((x) => x.text.alpha <= 0)) s.text.destroy();
    this.showing = this.showing.filter((x) => x.text.active);
    // Stack upward from the bottom by real height, so a wrapped line never overlaps the next.
    let y = this.scene.scale.height - 6;
    for (const s of [...this.showing].reverse()) {
      // 2-frame jitter every ~quarter second.
      const jx = s.line.glitch && Math.floor(now / 16) % 16 < 2 ? 1 : 0;
      y -= s.text.height;
      s.text.setPosition(8 + jx, y);
    }
    this.bg.setSize(BOX_W, this.scene.scale.height - 4 - y + 2);
    this.bg.setVisible(this.showing.length > 0);
  }
}
