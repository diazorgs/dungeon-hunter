import Phaser from "phaser";
import { normalizeMove, padAimPoint, stickToMove } from "../logic/input.ts";
import type { InputState, Vec2 } from "../logic/input.ts";

const K = Phaser.Input.Keyboard.KeyCodes;
// Standard gamepad mapping indices.
const PAD = { A: 0, X: 2, Y: 3, LT: 6, RT: 7, START: 9 } as const;
const EDGE_KEYS = ["SHIFT", "SPACE", "Q", "E", "ESC", "TAB"] as const;
type EdgeKey = (typeof EDGE_KEYS)[number];

/** Reads keyboard, mouse and gamepad into one `InputState` per frame (DESIGN.md §4.6). */
export class InputSystem {
  private readonly scene: Phaser.Scene;
  private readonly keys: Record<
    "W" | "A" | "S" | "D" | "SHIFT" | "SPACE" | "Q" | "E" | "ESC" | "TAB",
    Phaser.Input.Keyboard.Key
  >;
  private device: InputState["device"] = "kbm";
  private wheelSwap = false;
  private rmbPressed = false;
  private lmbHeld = false;
  private padOffset: Vec2 = { x: 96, y: 0 };
  private padPrev = new Set<number>();
  // Latched on keydown: Phaser's JustDown misses taps shorter than one frame (keyup clears it).
  private readonly pressed = new Set<EdgeKey>();
  /** While a menu overlay is open the world gets a neutral InputState (aim still tracks). */
  blocked = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const kb = scene.input.keyboard!;
    // addKeys captures (preventDefault) these so Space/Tab never scroll or leave the page.
    this.keys = kb.addKeys({
      W: K.W,
      A: K.A,
      S: K.S,
      D: K.D,
      SHIFT: K.SHIFT,
      SPACE: K.SPACE,
      Q: K.Q,
      E: K.E,
      ESC: K.ESC,
      TAB: K.TAB,
    }) as InputSystem["keys"];
    kb.addCapture([K.UP, K.DOWN, K.LEFT, K.RIGHT]);
    for (const name of EDGE_KEYS) this.keys[name].on("down", () => this.pressed.add(name));

    const toKbm = () => (this.device = "kbm");
    scene.input.on("pointermove", toKbm);
    kb.on("keydown", toKbm);
    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      toKbm();
      if (p.rightButtonDown()) this.rmbPressed = true;
      if (p.leftButtonDown()) this.lmbHeld = true;
    });
    scene.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (!p.leftButtonDown()) this.lmbHeld = false;
    });
    scene.input.on("wheel", (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (dy !== 0) this.wheelSwap = true;
    });
    // Alt-tab with a key held must not leave the Runner walking or firing on return.
    scene.game.events.on(Phaser.Core.Events.BLUR, this.reset);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      scene.game.events.off(Phaser.Core.Events.BLUR, this.reset),
    );
  }

  readonly reset = (): void => {
    this.scene.input.keyboard?.resetKeys();
    this.lmbHeld = false;
    this.rmbPressed = false;
    this.wheelSwap = false;
    this.pressed.clear();
  };

  read(camera: Phaser.Cameras.Scene2D.Camera, playerPos: Vec2): InputState {
    const k = this.keys;
    const down = (name: EdgeKey) => this.pressed.delete(name);
    const pointer = this.scene.input.activePointer;
    const world = camera.getWorldPoint(pointer.x, pointer.y);

    const state: InputState = {
      move: normalizeMove(k.W.isDown, k.S.isDown, k.A.isDown, k.D.isDown),
      aimWorld: { x: world.x, y: world.y },
      fire: this.lmbHeld,
      skill: down("SPACE") || this.rmbPressed,
      dash: down("SHIFT"),
      swap: down("Q") || this.wheelSwap,
      interact: down("E"),
      pause: down("ESC"),
      map: down("TAB"),
      device: this.device,
    };
    this.rmbPressed = false;
    this.wheelSwap = false;

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
