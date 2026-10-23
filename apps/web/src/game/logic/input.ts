export interface Vec2 {
  x: number;
  y: number;
}

/** Device-independent input, read once per frame (DESIGN.md §4.6). */
export interface InputState {
  move: Vec2;
  aimWorld: Vec2;
  fire: boolean;
  skill: boolean;
  dash: boolean;
  swap: boolean;
  interact: boolean;
  pause: boolean;
  map: boolean;
  device: "kbm" | "pad";
}

const ZERO: Vec2 = { x: 0, y: 0 };

/** Diagonals are normalized so they are not faster than one axis. */
export function normalizeMove(up: boolean, down: boolean, left: boolean, right: boolean): Vec2 {
  const x = Number(right) - Number(left);
  const y = Number(down) - Number(up);
  if (x === 0 && y === 0) return { ...ZERO };
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

/** Radial deadzone, rescaled so movement starts at 0 just outside it; length capped at 1. */
export function stickToMove(x: number, y: number, deadzone = 0.2): Vec2 {
  const len = Math.hypot(x, y);
  if (len <= deadzone) return { ...ZERO };
  const scaled = Math.min(1, (len - deadzone) / (1 - deadzone));
  return { x: (x / len) * scaled, y: (y / len) * scaled };
}

/** Aim point for a pad: player + stick × reach; a resting stick keeps the last aim. */
export function padAimPoint(
  player: Vec2,
  stick: Vec2,
  lastAim: Vec2,
  reach = 96,
  deadzone = 0.25,
): Vec2 {
  const len = Math.hypot(stick.x, stick.y);
  if (len <= deadzone) return lastAim;
  return { x: player.x + (stick.x / len) * reach, y: player.y + (stick.y / len) * reach };
}
