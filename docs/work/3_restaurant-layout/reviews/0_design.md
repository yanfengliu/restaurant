# Review 0: design

## Target

Repository `restaurant`, exact target `7e537d7e4a6b48892b8f5c6793b19720be111d8f`. The reviewed movement design is the committed `docs/work/3_restaurant-layout/design.md` introduced at `691bf41346d959ed1b20f218eecde08e72d25d36`, unchanged at the target. The review also covers the work-unit plan, canonical game contract, research conclusions, and their fit with the existing engine, catalog, interface, scene, validators and tests. Product implementation of MOVE had not reached this review target.

## Reviewers and coverage

The independent Codex reviewer read the design and existing code directly in the isolated `codex/layout-review` worktree. Coverage included atomicity, money, object and dish ownership, supported appliances, reservations, paths, outdoor placement and dining, frozen version 1 migration, interface selection/cancellation, scene attachment and surface heights, acceptance scope and unnecessary complexity. A small public-action Node probe exercised existing renovation side effects. No product file was edited, and no subagent was needed for this bounded review.

Claude abstains. The coordinator reported a same-day pinned-lane weekly-quota API 429; the preceding supplies integration report also records that unavailability. This design review did not retry the lane or receive a Claude report. The missing lane is not approval. The review follows the fleet multi-CLI runbook's attribution and abstention rules; it is direct independent agent review, not a claim that a new CLI run occurred.

## Reports

### Codex independent design and whole-effort reviewer

**F0 — Medium: the unconditional event/sequence preservation promise contradicts required renovation behavior.** `design.md:13` says MOVE causes no event or ID allocation, while `design.md:50` asks the checks to preserve sequence values across moves. Yet `design.md:36` requires the existing `rebuildPaths` and explicitly permits an arriving guest to leave when a chair becomes inaccessible. The outside-design implementation at `src/engine.js:766` calls `leave` with a reason in that case. `src/engine.js:467` changes the guest's failed/happiness state and `stats.lost`, then `src/engine.js:36-38` allocates an event ID and changes `nextId`. Therefore a legal move that closes a route cannot satisfy both contract clauses. This is a real observable side effect, not merely a wording preference: it changes saved state and future IDs. Explicitly permit the existing renovation departure consequences on accepted real moves, while preserving the absolute byte-identical rule for rejected actions and exact no-ops. Keep no movement charge, refund, purchased-object replacement or random draw. Do not suppress useful departure events or fork renovation to satisfy an overly broad assertion.

The pinned probe used `createGame()`, `tick(game, 3)`, then public wall placements at `(7,10)`, `(8,9)` and `(8,11)` around the first reserved chair at `(8,10)`, whose eastern neighbor is its table. Before the final placement `nextId` was 96, `stats.lost` was 0 and the event list contained `event-89`. The final placement allocated its own object and departure event `event-97`, leaving `nextId` 98, `stats.lost` 1 and the guest in `leaving`. The resulting save round-tripped exactly. This probe establishes the existing helper's side effects; it does not claim to execute the not-yet-implemented MOVE action.

**F1 — Medium: outdoor acceptance leaves the permanent indoor setup instruction unaddressed.** `design.md:40-42` permits a complete restaurant without floor or enclosure and retains the existing room/entrance status. The existing interface at `src/main.js:360-370` unconditionally shows “Build an enclosed room” whenever `hasRoom` is false, independently of whether outdoor seating and service work. `src/engine.js:909` likewise emits a room-closure warning. Following the specified engine changes alone leaves a valid, operating outdoor restaurant permanently presented as needing a room. Preserve the factual `hasRoom`/`hasEntrance` fields, but make the enclosure suggestion optional or conditional on setup context. Include the outdoor service hint in actual-control and pixel acceptance. This needs a narrow interface/message adjustment, not a new readiness model.

The remainder of the design has a sound boundary. Validate the entire parent/child move before any write, retain IDs, preserve stock and queue records, and reuse `rebuildPaths` after the group mutation. Existing clean stock and prepaid/return capacity use storage IDs (`src/engine.js:133-139`), and the wash transition resolves the reserved cabinet when it becomes the return target (`src/engine.js:693-695`). That supports allowing a reserved cabinet to move before the final return while protecting a current physical target. Protecting a committed appliance also protects its cabinet. Existing supported-object validation checks parent type, shared coordinates, shared rotation and one child per parent (`src/engine.js:1082-1088`); a migration or new schema is unnecessary for this bounded extension.

Outdoor actor traversal already uses world cells and furniture blockers, not flooring (`src/engine.js:388-412`). Removing the seat-floor rule from live version 2 validation, while retaining `validateV1Save`'s historical seat-floor requirement at `src/engine.js:1001`, is the appropriate compatibility split. Exact rejection snapshots and a corrupted literal version 1 fixture are meaningful guards here. Source, dirty-location and sink protections should remain explicit, including the existing wash sink reservation retained through the return task. The conservative toilet-adjacency rule is documented as an authored safeguard rather than an observed reference match.

The interface and visual work still needs implementation evidence. Cabinet/appliance picking must reach both IDs through real clicks; cancellation must leave the original live group in place; and a successful furniture placement must clear the tool only after acceptance. Existing scene stock and dish props attach to their storage/object groups (`src/scene.js:464-474` and `src/scene.js:481-503`), which is compatible with preserving IDs while rebuilding moved geometry. Ground height must participate in scene updates when adding floor beneath an existing item, not only when moving the item. These are concrete implementation checks already within the plan's rendering and real-control criteria, not additional speculative features.

The milestone division is proportionate. The outdoor and MOVE increment fixes established workflow gaps using current objects, state shape and pathfinding. Dedicated dishwasher behavior and daily wage settlement have stronger new research evidence but require their own coherent follow-up; adding them here would mix task models and money timing into the movement change. The research at `docs/research.md:118-123` accurately distinguishes developer statements, direct observation and authored safeguards. It does not establish complete reference parity. No fundamental architectural rewrite or repetitive review loop is justified by the inspected design.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Accepted moves may produce the existing renovation departure event and sequence changes | Accepted by the coordinator during this review. Preserve full rejection/no-op atomicity and clarify ordinary accepted renovation effects; do not fork or suppress the existing helper. | Repair commit pending; verify the exact integrated implementation and a route-closing MOVE. |
| F1 | A working outdoor restaurant retains a permanent indoor setup instruction | Accepted by the coordinator during this review. Contextualize enclosure guidance for usable outdoor seating while retaining room/entrance telemetry. | Repair commit pending; inspect a working outdoor restaurant through actual controls. |

## Verification

- Confirmed the exact target and clean initial worktree. Read the fleet canon, review runbook, local rules, work documentation format and relevant previous integration coverage. `docs/learning/lessons.md` is absent in this target; no lesson file was fabricated.
- Read the original design bytes, existing code and validators, and relevant test cases. Citations above include directly inspected code outside the design change.
- Ran the one public-action Node renovation probe described above. It reproduced the event/sequence effect and an exact valid save round trip. No temporary probe file or raw capture was created.
- Did not run `npm run check`, launch a browser, inspect new pixels, or claim MOVE implementation verification. The coordinator reserved broad gates and final browser acceptance for the integrated revision.
- No browser, native application, localhost server or background process was launched. The foreground probe completed. Only this authored review document is retained from this review.

## Round outcome

Both findings were accepted by the coordinator and repairs are pending. The underlying approach is coherent and appropriately bounded; the report found no other material design issue in money, parent/child ownership, storage reservations or save compatibility. The original target is not yet accepted as complete. Implementation, actual desktop controls, outdoor surface rendering and the exact integrated changes still require their planned final review and gates. Missing Claude coverage and native behavioral uncertainty remain explicitly unclaimed.
