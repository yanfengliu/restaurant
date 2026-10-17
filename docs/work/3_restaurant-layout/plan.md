# Outdoor layouts and furniture moving

Status: complete
Owner: Codex orchestrator
Created: 2026-10-17
Updated: 2026-10-17

## Problem and outcome

Furniture currently requires flooring and can only be removed and repurchased. Let players furnish owned outdoor ground and move existing furniture without losing its identity, supplies or money. Match the studied one-shot furniture placement control and verify uncertain reference washing equipment separately.

## Scope

Engine owner: atomic movement, outdoor construction/access and save validation, meaningful simulation checks and the canonical contract. Interface owner: Move controls, cancellation, supported item picking, ground contact and one-shot placement. Reference owner: primary-source research, native observation notes and ignored gallery comparisons. The orchestrator owns design decisions, integration, actual browser acceptance and resource cleanup. Independent review covers the exact integrated implementation. Opening budgets, scenarios, new furniture art and service timing changes are excluded unless a later work unit adopts the evidence.

## Approach

Start from main `266c8b9`. Agree `MOVE { id, x, z, rotation? }` and the occupied/committed-object rules before implementation; preserve version 2 and the frozen version 1 validator. Rejected actions preserve complete serialized state. Moving a cabinet carries its supported child; moving the child can rehost it on an empty cabinet. Prove ownership and capacity preservation, then replan affected paths through the existing renovation mechanism. Confirm outdoor item classes through native observations before finalizing the allowance. Keep active or occupied items protected when moving would invalidate their physical task. A successful furniture placement or move clears the tool; structural painting remains repeatable.

## Acceptance criteria

- [x] Commit the shared action, occupancy, support and outdoor contracts before workers implement them; distinguish observations from inferred safeguards.
- [x] Move empty and stocked storage without charges, ID changes, stock loss, queue/reservation loss or broken save graphs; move a supported parent and rehost its child coherently.
- [x] Reject occupied, committed, unsupported, colliding and unowned destinations atomically; cancelled UI moves preserve the original object.
- [x] Place appropriate furniture on owned grass and render its base and carried contents at the correct surface; accept legal outdoor paths and version 2 reloads without weakening frozen version 1 validation.
- [x] Exercise Move, rotation, cancellation, failure and one-shot placement through actual headless desktop browser inputs; inspect relevant fixed/exploratory scene views and panels at 2560, 1440 and 1024 pixels wide.
- [x] Run `npm run check`, deterministic movement/save/service probes and independent review of the final integrated revision; resolve material findings, merge/push main and remove owned worktrees/processes.
- [x] Update the ignored visual gallery and attributed research, retaining accurate comparison bounds and washing uncertainties.

## Implementation steps

- [x] Research outdoor and washing behavior while the engine owner proposes the bounded movement contract.
- [x] Approve the contract, implement engine and interface scopes in isolated worktrees, then integrate in dependency order.
- [x] Verify actual controls and pixels, obtain independent integrated review, fix justified findings and complete the fleet integration gates.

## Outcome

Final product `5a97c7bb23b44be52335c4f4853a582b03772a4c` is integrated on main with engine `c1ac6c8`, Move/outdoor interface `bb2d844`, guidance `8fa4b5c` and wall-art repair `5a97c7b`. Root `npm run check` passed syntax, all 66 tests with zero failures/skips and the production build. No dependency changed; the existing 696.47 kB bundle advisory remains. No remote CI is configured. [Design round 0](reviews/0_design.md) and [integrated round 1](reviews/1_integration.md) retain F0–F2 and their closure; the exact final implementation has no open material finding. The independent reviewer also passed a distinct 600-MOVE/230-second service probe. Claude's pinned lane abstained after a fresh weekly-quota failure.

Actual browser inputs covered one-shot furnishing, grass placement/hiring, parent/child movement and rehosting, structural movement, stocked/prepaid storage preservation, cancellation, collisions, occupied-table refusal and paused/active reloads. An outdoor restaurant served one paid meal for $15 and returned the same used plate clean with zero floor tiles. Root inspected all 22 catalog grass crops, repaired art, fixed and exploratory scene views, unobstructed surface transitions and desktop controls at 2560/1440/1024 widths. The initial art images revealed F2; later actual grass/floor/mount/unmount and clear-side preview captures prove the repair. Initial occluded surface/clock captures and hidden cabinet contents are explicitly bounded rather than treated as visible proof. The full control pass stopped on a wrong catalog category, then an occluded ground target after reload reset its camera; independently reviewed instrumentation corrections and a guarded actual-input continuation preserved every required outcome. Successful service/matrix/art segments recorded no JavaScript errors; an earlier SwiftShader performance warning remains documented.

Ignored `output/playwright/layout-acceptance.json` binds 76 captures and the executed inputs (SHA-256 `9c1ef159c5a663ba9961da73a2c1f04de047acf5a57c0dd98437cdf57b2a6b4b`); the ignored gallery retains meaningful comparisons and historical failures. Task-owned headless browser, server and attempted native study processes were closed, their PIDs/port audited, and worker checkouts removed after integration. Native study attempt 4 could not begin on a locked desktop; the user subsequently confirmed it unlocked for the next study. Published outdoor/movement/dishwasher evidence is attributed in `docs/research.md`. Dedicated dishwasher details, native service timing, daily wage calibration, opening budgets/scenarios and broader visual/gameplay parity remain subsequent work, not claims of this milestone.
