import Phaser from "phaser";
import { normalizeMove, padAimPoint, stickToMove } from "../logic/input.ts";
import type { InputState, Vec2 } from "../logic/input.ts";

const K = Phaser.Input.Keyboard.KeyCodes;
// Standard gamepad mapping indices.
const PAD = { A: 0, X: 2, Y: 3, LT: 6, RT: 7, START: 9 } as const;
const EDGE_KEYS = ["SPACE", "SHIFT", "K", "Q", "E", "ESC", "TAB"] as const;
type EdgeKey = (typeof EDGE_KEYS)[number];
// J attack (hold), K skill, Space/Shift dash; WASD or arrows move.
const KEYS = {
  W: K.W,
  A: K.A,
  S: K.S,
  D: K.D,
  UP: K.UP,
  DOWN: K.DOWN,
  LEFT: K.LEFT,
  RIGHT: K.RIGHT,
  J: K.J,
  K: K.K,
  SPACE: K.SPACE,
  SHIFT: K.SHIFT,
  Q: K.Q,
  E: K.E,
  ESC: K.ESC,
  TAB: K.TAB,
} satisfies Record<string, number> & Record<EdgeKey, number>;
/** How far ahead of the Runner the no-target aim point sits. */
const FACING_REACH = 96;

/**
 * Reads keyboard and gamepad into one `InputState` per frame (DESIGN.md §4.6). Keyboard only, no
 * mouse: aim is automatic, so `aimWorld` is just the point the Runner faces (last move direction).
 */
export class InputSystem {
  private readonly scene: Phaser.Scene;
  private readonly keys: Record<keyof typeof KEYS, Phaser.Input.Keyboard.Key>;
  private device: InputState["device"] = "kbm";
  private facing: Vec2 = { x: 1, y: 0 };
  private padOffset: Vec2 = { x: FACING_REACH, y: 0 };
  private padPrev = new Set<number>();
  // Latched on keydown: Phaser's JustDown misses taps shorter than one frame (keyup clears it).
  private readonly pressed = new Set<EdgeKey>();
  /** While a menu overlay is open the world gets a neutral InputState (aim still tracks). */
  blocked = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    // addKeys captures (preventDefault) these so Space/Tab/arrows never scroll or leave the page.
    this.keys = kb.addKeys(KEYS) as InputSystem["keys"];
    for (const name of EDGE_KEYS) this.keys[name].on("down", () => this.pressed.add(name));
    kb.on("keydown", () => (this.device = "kbm"));
    // Alt-tab with a key held must not leave the Runner walking or firing on return.
    scene.game.events.on(Phaser.Core.Events.BLUR, this.reset);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      scene.game.events.off(Phaser.Core.Events.BLUR, this.reset),
    );
  }

  readonly reset = (): void => {
    this.scene.input.keyboard?.resetKeys();
    this.pressed.clear();
  };

  read(_camera: Phaser.Cameras.Scene2D.Camera, playerPos: Vec2): InputState {
    const k = this.keys;
    const down = (name: EdgeKey) => this.pressed.delete(name);
    const move = normalizeMove(
      k.W.isDown || k.UP.isDown,
      k.S.isDown || k.DOWN.isDown,
      k.A.isDown || k.LEFT.isDown,
      k.D.isDown || k.RIGHT.isDown,
    );
    if (move.x !== 0 || move.y !== 0) this.facing = move;

    const state: InputState = {
      move,
      aimWorld: {
        x: playerPos.x + this.facing.x * FACING_REACH,
        y: playerPos.y + this.facing.y * FACING_REACH,
      },
      fire: k.J.isDown,
      skill: down("K"),
      dash: down("SPACE") || down("SHIFT"),
      swap: down("Q"),
      interact: down("E"),
      pause: down("ESC"),
      map: down("TAB"),
      device: this.device,
    };

    const pad = this.scene.input.gamepad?.pad1;
    if (pad?.connected) this.readPad(pad, state, playerPos);
    state.device = this.device;
    if (this.blocked) {
      this.pressed.clear();
      return {
        ...state,
        move: { x: 0, y: 0 },
        fire: false,
        skill: false,
        dash: false,
        swap: false,
        interact: false,
        pause: false,
        map: false,
      };
    }
    return state;
  }

  private readPad(pad: Phaser.Input.Gamepad.Gamepad, s: InputState, player: Vec2): void {
    const held = (i: number) => (pad.buttons[i]?.value ?? 0) > 0.5;
    const pressed = (i: number) => held(i) && !this.padPrev.has(i);
    const move = stickToMove(pad.leftStick.x, pad.leftStick.y);
    const aim = padAimPoint(player, pad.rightStick, {
      x: player.x + this.padOffset.x,
      y: player.y + this.padOffset.y,
    });
    const anyInput =
      move.x !== 0 ||
      move.y !== 0 ||
      Math.hypot(pad.rightStick.x, pad.rightStick.y) > 0.25 ||
      Object.values(PAD).some(held);
    if (anyInput) this.device = "pad";

    if (this.device === "pad") {
      this.padOffset = { x: aim.x - player.x, y: aim.y - player.y };
      s.move = move;
      s.aimWorld = aim;
      s.fire = held(PAD.RT);
    }
    s.skill ||= pressed(PAD.LT);
    s.dash ||= pressed(PAD.A);
    s.swap ||= pressed(PAD.Y);
    s.interact ||= pressed(PAD.X);
    s.pause ||= pressed(PAD.START);

    this.padPrev = new Set(Object.values(PAD).filter(held));
  }
}
