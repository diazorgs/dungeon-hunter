import { PALETTE } from "@dh/shared";
import type Phaser from "phaser";
import type { Player } from "../entities/Player.ts";

export type HazardKind = "puddle" | "arc-trail" | "blast" | "floor";

interface Zone {
  kind: HazardKind;
  x: number;
  y: number;
  radius: number;
  w: number;
  h: number;
  damage: number;
  activeAt: number;
  endsAt: number;
}

const POOL = 96;
const TICK_MS = 500;
const FEET_OFFSET = 8;

/**
 * Lingering damage zones (spider trails, mortar blasts, Bleed puddles, Lockdown floor).
 * No physics bodies, so doors and movement are unaffected. One shared 500 ms damage tick:
 * overlapping zones hurt once, and Player.hurt honours i-frames.
 */
export class HazardSystem {
  private zones: Zone[] = [];
  private lastHitAt = -Infinity;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly scene: Phaser.Scene;
  private readonly player: Player;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.g = scene.add.graphics().setDepth(30);
  }

  spawn(
    kind: HazardKind,
    x: number,
    y: number,
    opts: {
      radius?: number;
      w?: number;
      h?: number;
      damage: number;
      durationMs: number;
      delayMs?: number;
    },
  ): void {
    if (this.zones.length >= POOL) this.zones.shift();
    const now = this.scene.time.now;
    const activeAt = now + (opts.delayMs ?? 0);
    this.zones.push({
      kind,
      x,
      y,
      radius: opts.radius ?? 0,
      w: opts.w ?? 0,
      h: opts.h ?? 0,
      damage: opts.damage,
      activeAt,
      endsAt: activeAt + opts.durationMs,
    });
  }

  update(now: number): void {
    this.zones = this.zones.filter((z) => now < z.endsAt);
    const px = this.player.x;
    const py = this.player.y + FEET_OFFSET;
    const touching = this.zones.find(
      (z) => now >= z.activeAt && z.damage > 0 && this.contains(z, px, py),
    );
    if (touching && now - this.lastHitAt >= TICK_MS) {
      const r = this.player.hurt(touching.damage, now);
      if (r && !r.ignored) this.lastHitAt = now;
    }
    this.draw(now);
  }

  clear(kind?: HazardKind): void {
    this.zones = kind ? this.zones.filter((z) => z.kind !== kind) : [];
  }

  private contains(z: Zone, x: number, y: number): boolean {
    if (z.w > 0) return Math.abs(x - z.x) <= z.w / 2 && Math.abs(y - z.y) <= z.h / 2;
    return Math.hypot(x - z.x, y - z.y) <= z.radius;
  }

  private draw(now: number): void {
    const g = this.g.clear();
    for (const z of this.zones) {
      const pending = now < z.activeAt;
      const flicker = Math.floor(now / 80) % 2 === 0;
      const color =
        z.kind === "puddle"
          ? PALETTE["bleed-500"]
          : z.kind === "arc-trail"
            ? PALETTE["teal-200"]
            : z.kind === "blast"
              ? PALETTE["amber-100"]
              : PALETTE["teal-400"];
      if (pending) {
        // Telegraph: outline only until the zone goes live.
        g.lineStyle(1, PALETTE["bleed-500"], flicker ? 1 : 0.5);
        if (z.w > 0) g.strokeRect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h);
        else g.strokeCircle(z.x, z.y, z.radius);
        continue;
      }
      const alpha = z.kind === "puddle" ? 0.4 : z.kind === "blast" ? 0.8 : flicker ? 0.6 : 0.3;
      g.fillStyle(color, alpha);
      if (z.w > 0) g.fillRect(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h);
      else g.fillCircle(z.x, z.y, z.radius);
    }
  }
}
