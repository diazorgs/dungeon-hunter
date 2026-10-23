# game/logic

Pure TypeScript only: no `phaser`, React, Zustand or TanStack imports (DESIGN.md §2.2, lint-enforced).
Every gameplay rule that can be unit-tested lives here, with its `*.test.ts` beside it.
