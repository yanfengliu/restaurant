# Review 0: implementation

## Target

Reviewed on 2026-10-17: restaurant revision `4a2c50168494e28a01b59dc2d1c53cb976404b4d`, against base `0778a210c488756acdf0b9c435c58f8c96acc120`. Scope: `src/engine.js`, `src/catalog.js`, `src/scene.js`, `docs/game-contract.md`, and `tests/engine.test.js` in the initial Corner Table implementation. The reviewed checkout was clean before and after the read-only review.

## Reviewers and coverage

Codex reviewer `gpt-6-astra`, reasoning effort `xhigh`, independently read the implementation, contract, tests, and work plan. The assigned lens covered engine state transitions, pathfinding, menu and scenario invariants, persistence consistency, and scene interfaces. This bounded review used no subagents or external reviewer CLI. The unchanged `README.md:1` was also read; the substantive product implementation is entirely new relative to the base.

The UI and bootstrap implementation had not been integrated into this target. Browser controls, rendered visuals, responsive layout, dependency audit, and final integrated acceptance were outside this round's coverage. No browser, server, or persistent process was launched.

## Reports

### Codex: gpt-6-astra, xhigh

**F0 — P2: Reject inconsistent active saves.** `src/engine.js:553` permits cooking orders without `sourceId`, because it validates the station only when that field is truthy. Reproducer: advance a fresh starter with quarter-second ticks until an order is cooking, delete only that order's `sourceId`, then serialize and deserialize. Loading succeeds. Over the next 160 simulation seconds, the affected meal becomes ready but cannot be collected, and its guest leaves with “the wait was too long”; the simulation records one lost guest while seven other guests are served. Cooking and ready orders need a required, recipe-compatible source, with mutually consistent staff and order links.

The same validation boundary accepts impossible actor paths and task assignments. `src/engine.js:533-541` checks coordinates and step distance but never checks collision or required task targets; `src/engine.js:556-559` checks optional links only when present. The starter chef begins at `(7, 8)`. Giving that chef `path: [{ x: 7, z: 7 }]` and `task: 'cleaning'` produces a save that loads, then places the chef inside the solid stove at `(7, 7)` after three simulation seconds. Validate blocked paths with the legitimate arriving guest's reserved chair endpoint exception, and validate required role, task, order, guest, and station relationships. These are reproducible violations of the save contract's promise to reject impossible actor links and invalid state, rather than evidence of a failure in ordinary save generation.

**F1 — P2: Rotate the starter's side walls.** `src/engine.js:67` creates both z-aligned boundaries with the default rotation of zero. `src/scene.js:144-147` renders each wall one tile wide along x and only 0.15 tiles deep along z. Consecutive side-wall centers are one tile apart along z, so those boundaries have 0.85-tile visible gaps despite continuous collision blocking in the engine. Set the z-aligned starter walls to 90 degrees and verify the corrected room visually. The geometry and orientation mismatch was established by reading the code; this round did not inspect a rendered browser image.

No further material findings were established in this bounded round. The simple engine and procedural scene architecture did not require a broader redesign on the evidence reviewed.

## Findings and disposition

The following dispositions were supplied by the integration owner after receiving the authored findings; they are separate from the reviewer's report.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | [Inconsistent active saves load](#codex-gpt-6-astra-xhigh) | Accepted for repair; reproduced invalid saves can strand meals or move staff into solid objects. Open pending repair verification. | Simulation worker owns validation repairs and focused regression checks; obtain independent focused re-review. |
| F1 | [Starter side-wall orientation leaves gaps](#codex-gpt-6-astra-xhigh) | Accepted for repair; rendered geometry disagrees with the continuously blocked boundary. Open pending repair verification. | Simulation worker owns starter rotations; integration owner supplies rendered verification, followed by independent re-review. |

## Verification

- `node --test tests/engine.test.js`: 19 tests passed, zero failed, against the exact reviewed revision. Bound: deterministic in-memory simulation, public actions, and persistence; no browser controls or rendering.
- Normal starter: 8,000 quarter-second simulation steps, serializing and deserializing after every step, all passed. The restaurant served 154 guests during this probe.
- Renovation and reassignment: seed `91743`, 800 quarter-second steps, attempting a wall placement, object removal, or staff reassignment every fifth step. The sequence accepted 136 actions; serializing and deserializing after each step produced no failures. Bound: this pinned sequence, not exhaustive action coverage.
- F0 probes: the single missing cooking `sourceId` and the chef's path into the stove both loaded successfully and demonstrated the reported subsequent behavior.
- F1: source inspection confirmed default side-wall rotation and the wall geometry's dimensions. Rendered verification was unavailable in this round.
- Final Git check confirmed revision `4a2c50168494e28a01b59dc2d1c53cb976404b4d` and no working-tree changes. This review document was added afterward under a separate documentation assignment.

## Round outcome

Two material findings, F0 and F1, remain open. Both were accepted for repair, and reproduction details were sent to the simulation worker. The current passing engine checks do not close these findings or establish visual and UI acceptance. Review the repairs and the final integrated UI, scene, and engine candidate in a later numbered round; this round does not claim final convergence.
