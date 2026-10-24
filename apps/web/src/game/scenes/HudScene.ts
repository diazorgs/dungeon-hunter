import { PALETTE, WEAPONS } from "@dh/shared";
import type { LogId, WeaponId } from "@dh/shared";
import Phaser from "phaser";
import { ActionButtons } from "../hud/ActionButtons.ts";
import { BossBar } from "../hud/BossBar.ts";
import { FullMap } from "../hud/FullMap.ts";
import { ModPick } from "../hud/ModPick.ts";
import { VendorPanel } from "../hud/VendorPanel.ts";
import type { HudSource } from "../hud/HudSource.ts";
import { Minimap } from "../hud/Minimap.ts";
import { LogPanel } from "../hud/LogPanel.ts";
import { RadioBox } from "../hud/RadioBox.ts";
import { VigilBanner } from "../hud/VigilBanner.ts";
import type { RadioLineIn } from "../hud/RadioBox.ts";
import { ScrapCounter } from "../hud/ScrapCounter.ts";
import { StatusOrb } from "../hud/StatusOrb.ts";
import { Vignette } from "../hud/Vignette.ts";
import { effectiveEnergyCost } from "../logic/combat/buffs.ts";
import { minimapCells } from "../logic/minimap.ts";
import { SceneKey } from "./keys.ts";

/** Screen-space HUD, parallel to the world scene, so camera shake never moves it. */
export class HudScene extends Phaser.Scene {
  private source: HudSource | null = null;
  private status!: StatusOrb;
  private scrap!: ScrapCounter;
  private minimap!: Minimap;
  private fullMap!: FullMap;
  private actions!: ActionButtons;
  modPick!: ModPick;
  vendor!: VendorPanel;
  radio!: RadioBox;
  logPanel!: LogPanel;
  private banner!: VigilBanner;
  private bossBar!: BossBar;
  private vignette!: Vignette;
  private unbind: (() => void) | null = null;

  constructor() {
    super(SceneKey.Hud);
  }

  create() {
    const { width, height } = this.scale;
    this.vignette = new Vignette(this);
    this.status = new StatusOrb(this, 4, 4);
    this.scrap = new ScrapCounter(this, 6, 40);
    this.minimap = new Minimap(this, width - 68, 4);
    this.actions = new ActionButtons(this, width, height);
    this.modPick = new ModPick(this);
    this.vendor = new VendorPanel(this);
    this.radio = new RadioBox(this);
    this.banner = new VigilBanner(this);
    this.logPanel = new LogPanel(this);
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
      ["radio:flush", () => this.radio.flush()],
      [
        "vigil:banner",
        (d: { text: string; ms: number }) => this.banner.show(d.text, d.ms, this.time.now),
      ],
      [
        "log:open",
        (d: { id: LogId; isNew: boolean }) => this.logPanel.open(d.id, d.isNew, this.time.now),
      ],
      ["log:close", () => this.logPanel.close()],
    ];
    for (const [e, fn] of handlers) ev.on(e, fn);
    this.unbind = () => handlers.forEach(([e, fn]) => ev.off(e, fn));
    this.fullMap.close();
    this.bossBar.hide();
    this.logPanel.close();
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
    this.banner.update(time);
    this.logPanel.update(time);
    const s = this.source;
    if (!s) return;
    const now = s.player.scene.time.now;
    this.status.update(s.player.combat, s.player.runner.id);
    this.scrap.update(s.scrap());
    const cd = s.skills.cooldown;
    this.actions.update(
      s.weapons.loadout,
      (id: WeaponId) => effectiveEnergyCost(WEAPONS[id].energyPerShot, s.player.buffs, now),
      { progress: cd.progress(now), remainingSec: cd.remaining(now) / 1000 },
      { ready: s.player.dashCharges(now), max: s.player.stats.dashCharges },
    );
  }
}
