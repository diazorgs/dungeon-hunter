import type { SectorId } from "@dh/shared";
import { createRng } from "@dh/utils";
import type { Rng } from "@dh/utils";
import Phaser from "phaser";
import type { Door } from "../entities/Door.ts";
import type { Player } from "../entities/Player.ts";
import { roomAt } from "../logic/camera.ts";
import type { ComposedRoom, ComposedSector } from "../logic/dungeon/compose.ts";
import { buildWaves, encounterPool, roomBudget } from "../logic/encounter/budget.ts";
import type { Wave } from "../logic/encounter/budget.ts";
import { IMPLEMENTED_AI } from "./ai/registry.ts";
import type { GuardianSystem } from "./GuardianSystem.ts";

const LOCK_INSET = 24; // player fully past the door row before doors slam
const MARKER_MS = 600;
const MIN_SPAWN_DIST = 40;

interface Active {
  room: ComposedRoom;
  waves: Wave[];
  index: number;
  spawning: boolean;
  rng: Rng;
  points: { x: number; y: number }[];
}

/** Locks combat rooms on entry, runs their waves under the difficulty budget, unlocks on clear. */
export class EncounterSystem {
  private readonly cleared = new Set<number>();
  private current: number | null = null;
  private active: Active | null = null;
  private bossRoom: number | null = null;
  private readonly scene: Phaser.Scene;
  private readonly guardians: GuardianSystem;
  private readonly doors: readonly Door[];
  private readonly sector: ComposedSector;
  private readonly sectorId: SectorId;
  private readonly seed: string;
  private readonly roomsClearedThisRun: () => number;

  constructor(
    scene: Phaser.Scene,
    guardians: GuardianSystem,
    doors: readonly Door[],
    sector: ComposedSector,
    opts: { sectorId: SectorId; seed: string; roomsClearedThisRun: () => number },
  ) {
    this.scene = scene;
    this.guardians = guardians;
    this.doors = doors;
    this.sector = sector;
    this.sectorId = opts.sectorId;
    this.seed = opts.seed;
    this.roomsClearedThisRun = opts.roomsClearedThisRun;
    scene.events.on("boss:dead", () => {
      if (this.bossRoom === null) return;
      const id = this.bossRoom;
      this.bossRoom = null;
      this.cleared.add(id);
      for (const d of this.roomDoors(id)) d.unlock();
      this.scene.events.emit("room:cleared", { roomId: id, type: "boss" });
    });
  }

  update(player: Player): void {
    const id = roomAt(player, this.sector.rooms, LOCK_INSET);
    if (id !== this.current) {
      this.current = id;
      const room = this.sector.rooms.find((r) => r.id === id);
      if (room) this.enter(room, player);
    }
    if (!this.active) return;
    this.leash();
    if (!this.active.spawning && this.guardians.aliveCount() === 0) this.nextWave(player);
  }

  private enter(room: ComposedRoom, player: Player): void {
    this.scene.events.emit("room:entered", { roomId: room.id, type: room.type });
    if (this.cleared.has(room.id)) return;
    if (room.type === "boss") return this.enterBoss(room, player);
    // Doors lock only in combat and boss rooms.
    if (room.type !== "combat") {
      this.cleared.add(room.id);
      return;
    }
    const rng = createRng(this.seed).fork(`spawns:s${this.sectorId}:r${room.id}`);
    const budget = roomBudget(this.sectorId, this.roomsClearedThisRun());
    this.active = {
      room,
      rng,
      index: 0,
      spawning: false,
      waves: buildWaves(budget, encounterPool(this.sectorId, IMPLEMENTED_AI), rng, {
        bleed: this.sectorId === 3,
      }),
      points: this.sector.spawns.filter((s) => s.roomId === room.id && s.kind === "guardian"),
    };
    for (const d of this.roomDoors(room.id)) d.lock();
    this.pushOutOfDoors(player, room.id);
    this.scene.events.emit("room:locked", { roomId: room.id, type: room.type });
  }

  private enterBoss(room: ComposedRoom, player: Player): void {
    if (this.bossRoom !== null) return;
    const spawn = this.sector.spawns.find((s) => s.roomId === room.id && s.kind === "boss");
    if (!spawn) throw new Error(`boss room ${room.id} has no boss spawn`);
    this.bossRoom = room.id;
    for (const d of this.roomDoors(room.id)) d.lock();
    this.pushOutOfDoors(player, room.id);
    this.scene.events.emit("room:locked", { roomId: room.id, type: room.type });
    this.scene.events.emit("boss:room", { roomId: room.id, x: spawn.x, y: spawn.y });
  }

  private nextWave(player: Player): void {
    const a = this.active!;
    if (a.index >= a.waves.length) return this.clear();
    const wave = a.waves[a.index++]!;
    if (wave.length === 0) return;
    this.scene.events.emit("wave:started", {
      roomId: a.room.id,
      index: a.index - 1,
      total: a.waves.length,
    });
    // Never spawn on top of the player.
    const far = a.points.filter(
      (p) => Math.hypot(p.x - player.x, p.y - player.y) >= MIN_SPAWN_DIST,
    );
    const points = a.rng.shuffle(far.length > 0 ? far : a.points);
    a.spawning = true;
    const at = wave.map((_, i) => points[i % points.length]!);
    const markers = at.map((p) =>
      this.scene.add.image(p.x, p.y, "ph-marker").setDepth(20).setAlpha(0.3),
    );
    this.scene.tweens.add({
      targets: markers,
      alpha: 1,
      duration: MARKER_MS / 3,
      yoyo: true,
      repeat: 1,
    });
    this.scene.time.delayedCall(MARKER_MS, () => {
      markers.forEach((m) => m.destroy());
      wave.forEach((e, i) =>
        this.guardians.spawn(e.guardianId, at[i]!.x, at[i]!.y, { elite: e.elite, bleed: e.bleed }),
      );
      a.spawning = false;
    });
  }

  private clear(): void {
    const room = this.active!.room;
    this.active = null;
    this.cleared.add(room.id);
    for (const d of this.roomDoors(room.id)) d.unlock();
    this.scene.events.emit("room:cleared", { roomId: room.id, type: room.type });
  }

  /** Guardians knocked out before the doors closed are put back, or the room never clears. */
  private leash(): void {
    const { room, points } = this.active!;
    const r = room.worldRect;
    const inside = new Phaser.Geom.Rectangle(r.x + 16, r.y + 16, r.width - 32, r.height - 32);
    for (const g of this.guardians.alive()) {
      if (inside.contains(g.x, g.y) || points.length === 0) continue;
      const home = points.reduce((best, p) =>
        Math.hypot(p.x - g.x, p.y - g.y) < Math.hypot(best.x - g.x, best.y - g.y) ? p : best,
      );
      g.body.reset(home.x, home.y);
    }
  }

  /** A Runner standing in a doorway when it slams is moved fully into the room. */
  private pushOutOfDoors(player: Player, roomId: number): void {
    const halfW = player.displayWidth / 2;
    const halfH = player.displayHeight / 2;
    for (const d of this.roomDoors(roomId)) {
      const b = d.getBounds();
      if (!Phaser.Geom.Intersects.RectangleToRectangle(b, player.getBounds())) continue;
      const x = d.dir === "W" ? b.right + halfW : d.dir === "E" ? b.left - halfW : player.x;
      const y = d.dir === "N" ? b.bottom + halfH : d.dir === "S" ? b.top - halfH : player.y;
      player.body.reset(x, y);
    }
  }

  private roomDoors(roomId: number): Door[] {
    return this.doors.filter((d) => d.roomId === roomId);
  }
}
