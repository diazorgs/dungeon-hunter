# M5 hallway test

**Gate (PRD M5):** a first-time player understands the goal without explanation.

## Setup

- 3 to 5 people who have never seen the game. Desktop browser, mouse and keyboard.
- Clear site data first (DevTools → Application → Clear storage) so the intro shows.
- Say only: "Please play this game. Think out loud. I can't help you." No other hints.
- Observer takes notes; stop after the first death or 15 minutes.

## Record per tester

| Question                                                                                       | T1  | T2  | T3  | T4  | T5  |
| ---------------------------------------------------------------------------------------------- | --- | --- | --- | --- | --- |
| Read the intro cards (did not skip)?                                                           |     |     |     |     |     |
| After Sector 1, ask: "What are you trying to do?" Answer mentions the Core / shutting it down? |     |     |     |     |     |
| Found the Armory without help?                                                                 |     |     |     |     |     |
| Can explain what Core Shards are for?                                                          |     |     |     |     |     |
| Noticed a radio line or VIGIL banner?                                                          |     |     |     |     |     |
| Started a second run unprompted?                                                               |     |     |     |     |     |

## Pass rule

At least 3 of the testers state the goal (reach the Core, shut it down) after Sector 1.

## Where to fix a fail

1. Intro card copy: `packages/shared/src/data/cards.json`.
2. Ops briefing: `s1-enter` lines in `packages/shared/src/data/radio.json`.
3. Staging Bay goal line and labels: `apps/web/src/ui/screens/StagingBayScreen.tsx`.

## Results

_Not run yet. Fill in the table, date and build (git short hash) here._
