import { expect, test } from "vite-plus/test";
import { cameraTarget, roomAt } from "./camera.ts";

const rooms = [{ id: 4, worldRect: { x: 100, y: 100, width: 240, height: 176 } }];

test("inside a room returns its id", () => expect(roomAt({ x: 200, y: 200 }, rooms)).toBe(4));
test("corridor returns null", () => expect(roomAt({ x: 50, y: 200 }, rooms)).toBeNull());
test("within 8 px of the edge counts as outside", () => {
  expect(roomAt({ x: 105, y: 200 }, rooms)).toBeNull();
  expect(roomAt({ x: 108, y: 200 }, rooms)).toBe(4);
});
test("camera frames the room centre, follows in corridors", () => {
  expect(cameraTarget({ x: 200, y: 200 }, rooms)).toEqual({ x: 220, y: 188 });
  expect(cameraTarget({ x: 50, y: 60 }, rooms)).toEqual({ x: 50, y: 60 });
});
