import { createEmitter } from "./emitter.ts";
import type { BridgeEvents } from "./types.ts";

/** The only channel between React and Phaser (DESIGN.md §4.3). */
export const bus = createEmitter<BridgeEvents>();
