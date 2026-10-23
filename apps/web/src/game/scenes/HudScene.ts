import { PALETTE, WEAPONS } from "@dh/shared";
import type { WeaponId } from "@dh/shared";
import Phaser from "phaser";
import { BossBar } from "../hud/BossBar.ts";
import { DashPips } from "../hud/DashPips.ts";
import { FullMap } from "../hud/FullMap.ts";
import { ModPick } from "../hud/ModPick.ts";
import type { HudSource } from "../hud/HudSource.ts";
import { Minimap } from "../hud/Minimap.ts";
import { RadioBox } from "../hud/RadioBox.ts";
import type { RadioLineIn } from "../hud/RadioBox.ts";
import { ResourceBars } from "../hud/ResourceBars.ts";
import { ScrapCounter } from "../hud/ScrapCounter.ts";
import { SkillRing } from "../hud/SkillRing.ts";
import { Vignette } from "../hud/Vignette.ts";
import { WeaponSlots } from "../hud/WeaponSlots.ts";
import { effectiveEnergyCost } from "../logic/combat/buffs.ts";
import { minimapCells } from "../logic/minimap.ts";
import { SceneKey } from "./keys.ts";

/** Screen-space HUD, parallel to the world scene, so camera shake never moves it. */
export class HudScene extends Phaser.Scene {
  private source: HudSource | null = null;
  private bars!: ResourceBars;
  private scrap!: ScrapCounter;
  private minimap!: Minimap;
  private fullMap!: FullMap;
  private weapons!: WeaponSlots;
  private skill!: SkillRing;
  private dash!: DashPips;
  modPick!: ModPick;
  radio!: RadioBox;
  private bossBar!: BossBar;
  private vignette!: Vignette;
  private unbind: (() => void) | null = null;

  constructor() {
    super(SceneKey.Hud);
  }

  create() {
    const { width, height } = this.scale;
    this.vignette = new Vignette(this);
    this.bars = new ResourceBars(this, 4, 4);
    this.scrap = new ScrapCounter(this, 4, 26);
    this.minimap = new Minimap(this, width - 68, 4);
    this.weapons = new WeaponSlots(this, width - 60, height - 52);
    this.skill = new SkillRing(this, width - 52, height - 14);
    this.dash = new DashPips(this, width - 60, height - 3);
    this.modPick = new ModPick(this);
    this.radio = new RadioBox(this);
    this.bossBar = new BossBar(this);
    this.fullMap = new FullMap(this);

    this.input.keyboard?.on("keydown-TAB", () => {
      if (this.source && !this.scene.isPaused(SceneKey.Dungeon)) this.fullMap.toggle();
    });
    const rebind = () => this.bind(this.registry.get("hudSource") as HudSource | undefined);
    this.game.events.on("hud:rebind", rebind);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.game.events.off("hud:rebind", rebind),
    );
    rebind();

    if (import.meta.env.DEV)
      this.input.keyboard?.on("keydown-F7", () => {
        this.radio.say({
          speaker: "ops",
          text: "Runner, you're in. Storage Wing ahead.",
          durationMs: 2500,
        });
        this.radio.say({ speaker: "vigil", text: "INTRUDER DETECTED.", durationMs: 2000 });
        this.radio.say({ speaker: "ops", text: "Ignore it. Keep moving.", durationMs: 2000 });
      });
  }

  /** Re-attach to a (new) world; safe to call repeatedly, never duplicates listeners. */
  private bind(source: HudSource | undefined): void {
    this.unbind?.();
    this.source = source ?? null;
    if (!source) return;
    const ev = source.events;
    const handlers: [string, (...a: never[]) => void][] = [
      ["room:entered", () => this.renderMaps()],
      ["room:locked", (d: { type?: string }) => d.type === "boss" && this.fullMap.close()],
      [Phaser.Scenes.Events.PAUSE, () => this.fullMap.close()],
      ["hud:vignette", () => this.vignette.pulse(PALETTE["hp-dark"], 150)],
      [
        "boss:spawned",
        (d: { name: string; maxHp: number; phaseMarkers?: number[] }) =>
          this.bossBar.show(d.name, d.maxHp, d.phaseMarkers),
      ],
      ["boss:intro", (d: { name: string }) => this.bossBar.intro(this, d.name)],
      ["boss:hp", (d: { hp: number }) => this.bossBar.update(d.hp)],
      ["boss:dead", () => this.bossBar.hide()],
      ["radio:say", (line: RadioLineIn) => this.radio.say(line)],
    ];
    for (const [e, fn] of handlers) ev.on(e, fn);
    this.unbind = () => handlers.forEach(([e, fn]) => ev.off(e, fn));
    this.fullMap.close();
    this.bossBar.hide();
    this.renderMaps();
  }

  private renderMaps(): void {
    const s = this.source;
    if (!s) return;
    const cells = minimapCells(s.layout, s.visitedRooms, s.currentRoom());
    this.minimap.render(cells);
    this.fullMap.render(cells);
  }

  update(time: number) {
    this.radio.update(time);
    const s = this.source;
    if (!s) return;
    const now = s.player.scene.time.now;
    this.bars.update(s.player.combat);
    this.scrap.update(s.scrap());
    this.weapons.update(s.weapons.loadout, (id: WeaponId) =>
      effectiveEnergyCost(WEAPONS[id].energyPerShot, s.player.buffs, now),
    );
    const cd = s.skills.cooldown;
    this.skill.update(cd.progress(now), cd.remaining(now) / 1000);
    this.dash.update(s.player.dashCharges(now), s.player.stats.dashCharges);
  }
}
