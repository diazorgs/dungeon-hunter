import { MODS } from "@dh/shared";
import type { ModId } from "@dh/shared";
import type Phaser from "phaser";
import type { Guardian } from "../entities/Guardian.ts";
import type { Player } from "../entities/Player.ts";
import { heal } from "../logic/combat/combatant.ts";
import { deriveStats } from "../logic/combat/stats.ts";
import { onBossKilledEffects, thornDamage } from "../logic/mods/hooks.ts";
import { addMod } from "../logic/run/runState.ts";
import type { RunState } from "../logic/run/runState.ts";
import type { GuardianSystem } from "./GuardianSystem.ts";

const THORN_GAP_MS = 500;

/** Applies Vault Mods (stats via deriveStats) and runs their flags and hooks. */
export class ModSystem {
  private readonly scene: Phaser.Scene;
  private readonly player: Player;
  private readonly run: RunState;
  private readonly thornHitAt = new Map<number, number>();

  constructor(scene: Phaser.Scene, player: Player, run: RunState, guardians: GuardianSystem) {
    this.scene = scene;
    this.player = player;
    this.run = run;
    // Mods carried from earlier sectors.
    this.refresh();
    scene.events.on("boss:dead", () => heal(player.combat, onBossKilledEffects(player.stats).heal));
    scene.physics.add.overlap(player, guardians.group, (_p, g) => this.thorns(g as Guardian));
  }

  apply(id: ModId): void {
    addMod(this.run, id);
    this.refresh();
    this.scene.events.emit("mod:applied", { id });
  }

  private refresh(): void {
    this.player.setStats(
      deriveStats(
        this.player.runner,
        this.run.mods.map((m) => MODS[m]),
      ),
    );
  }

  /** Thorn Plating: at most one hit per guardian per 500 ms of contact. */
  private thorns(g: Guardian): void {
    const dmg = thornDamage(this.run.mods);
    const now = this.scene.time.now;
    if (
      dmg === 0 ||
      g.health.dead ||
      now - (this.thornHitAt.get(g.uid) ?? -Infinity) < THORN_GAP_MS
    )
      return;
    this.thornHitAt.set(g.uid, now);
    g.takeHit(dmg, 0, 0, now);
  }
}
