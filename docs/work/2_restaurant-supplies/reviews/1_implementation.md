# Review 1: implementation

## Target

Strategic review of repository `restaurant` at integration commit `d0317755f91733a9378ca8516640faed9a86bfe3`, particularly `src/scene.js`, the milestone plan and research notes, against approved design `f9f0fc7b6906ba8f0d03d1f53801a24389a78499`. This bounded review assessed architecture, scope, acceptance and verification limits; it was not an integrated product approval.

The simulation and interface workers' then-uncommitted files, based on `f9f0fc7`, were read only for implementation context. Their changing bytes were not a reviewed implementation target, and this report assigns them no approval. The report is retained on documentation base `a5b650602eb01b7be9c135041e4a9b334ef65f40`; that later commit does not change the original review target. Its canonical contract/schema documentation updates were separately inspected while retaining this report.

## Reviewers and coverage

An independent Codex strategic reviewer read the fleet canon, local rules, milestone design and plan, prior design review, research, canonical game contract, and relevant engine, interface and scene code. The lens was fundamental flaws, avoidable complexity, milestone validity, remaining fidelity gaps and the bounds of proposed acceptance evidence. No additional reviewer was spawned and no CLI review process was started.

Claude abstains: the coordinator reported the pinned lane's same-day weekly-quota API 429, which produced no review. That unavailable lane was not retried or represented as agreement. No browser, server or native application was launched, and no runtime/build gate was rerun during this strategic assessment.

## Reports

### Codex strategic reviewer

Milestone 2 is a coherent bounded stock-to-service increment, but it cannot establish full reference parity. Individual ware ownership, reserved return capacity, frozen legacy migration and deterministic simulation directly serve persistence and interruption correctness. A separate inventory service, generic command framework or broad engine refactor would add work without improving the milestone. The persistence/conservation effort is justified by the approved scope rather than evidence of needless abstraction.

**F4 — P2: ready station meals use the wrong engine field.** At `d031775`, `src/scene.js:493` checks `order?.status === 'ready'`, while the authoritative order field is `state`. This prevents the stationary ready-meal branch from passing its recipe to the food geometry builder; food can appear only after another ownership phase supplies the recipe. Use the authoritative field and inspect a ready meal at its station before pickup. This was a code-grounded finding, not a browser reproduction. It was initially communicated as S0 before the coordinator assigned the work-unit ID F4.

**F5 — P2: shared-table diners overlap their dishes.** At `d031775`, `src/scene.js:486-487` places every guest-owned ware unit at identical table-local coordinates `(0.15, 0.845, 0.14)`. The engine supports multiple reserved chairs around one table, so simultaneous diners' plates and food overlap. The guest provides a `seatId`, but the rendering branch does not use it or another per-diner arrangement. Position dishes by seating or another deterministic arrangement and inspect a two-seat shared-table meal. The nearby dirty-location branch already indexes units, but that does not fix guest-owned dishes. This was code-grounded, not browser-reproduced, and initially communicated as S1 before assignment of F5.

The acceptance wording at `docs/work/2_restaurant-supplies/plan.md:25` originally said rendered views must pass comparison. That must mean inspected comparisons which explicitly record observed matches, differences and unknowns, rather than reference-parity approval. `docs/research.md:99-105` leaves the washing equipment and complete native service loop unverified. Successful browser washing proves browser functionality, not the unobserved reference behavior. Fifteen simulation seconds per day, ten-day ingredient cadence, five-day tableware transit, 30-day months, skill formulas and wage formulas remain approved playable inferences. In particular, research line 102 says approximately nine-day deliveries also fit the observed snapshots; deterministic tests of ten-day boundaries cannot calibrate that choice.

The proposed real-controls purchasing → delivery → recipe → hiring → service → washing → active-save flow is appropriate. Its evidence must also demonstrate the criterion's shortage and recovery behavior. A single successful meal does not establish all visible intermediate dish states: inspect stationary-ready, carried, guest-owned, dirty, washing and returned ware, including shared-table dining. Deterministic tests can establish implemented skill effects without requiring an unreliable browser wait for a rare breakage event, but cannot establish the reference's exact formulas. Keep the final integrated check, exact-revision review and affected controls verification focused; do not repeat broad gates without a changed artifact or unresolved question.

The highest-value remaining fidelity work concerns the opening experience: outdoor storage/moving and one-shot furnishing controls directly observed in `docs/research.md:98-105`, then initial economy/scenario progression and native service calibration. At the assessed stage, empty games still started with $15,000 and retained the original scenario goals, against the observed $3,000 start and scenario-specific monthly objectives. Those are declared later-scope differences, not reasons to expand milestone 2. Additional decorative variants should follow these gameplay differences. The reference's full cooking/payment/washing cycle needs a bounded observation with the necessary layout and equipment before another large mechanics contract is treated as parity work.

The original assessment also requested canonical documentation reconciliation: `docs/game-contract.md:9` still described role-based hiring/priorities, line 33 retained the old clock, and AGENTS still named save version 1. This recommendation concerned the original target. The later inspected documentation diff in `a5b6506` updates these contracts and the version-2 migration invariant; that follow-up does not retroactively turn this strategic review into implementation approval.

## Findings and disposition

Owner dispositions supplied by the coordinator are recorded separately from the authored report above.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F4 | Ready station meal renderer reads `status` instead of `state` | Accepted by coordinator. | Interface/integration worker assigned the focused scene repair; committed repair and actual ready-meal capture remained pending when this report was retained. |
| F5 | Multiple diners' dishes overlap at one table | Accepted by coordinator. | Interface/integration worker assigned separate per-diner placement; committed repair and shared-table capture remained pending when this report was retained. |

The coordinator accepted the comparison-bound clarification and edited the current plan accordingly; that plan edit was still uncommitted and is not part of this report's reviewed target. Outdoor placement, source catalog/economy/scenario calibration and one-shot furnishing behavior are reserved for a separate bounded contract after milestone 2 lands. The canonical documentation recommendation was addressed in inspected commit `a5b6506`.

## Verification

- Read the recoverable committed integration/design targets and relevant implementation context. The scene file is unchanged between `d031775` and report base `a5b6506`; F4/F5 therefore remain applicable at that base.
- Inspected existing reference and browser overview captures: `output/gallery/reference-live-20-service-room.png`, SHA-256 `1562269772bc6fafe39b5458a34dce8cbe0e5d81eca7ef11aea511b958c04e05`, and `output/playwright/controls-full-2560.png`, SHA-256 `17268fb1d2f2dce3a759b507237e81372a61d44e9d16260471acc833dfd1a62f`. The tool displayed resized overviews. Different layouts/scales and the older browser state limit these to qualitative context, not native-resolution item inspection or milestone-2 visual approval.
- No browser/native controls, runtime tests, production build, CLI review or reference timing measurements were performed in this round. Full migration, money, task graph and rendered-link correctness remain for exact integrated implementation review and the coordinator's final gates.
- The strategic assessment created no files or task-owned processes. Report retention changes only this authored review document. The work-document structure check passed with three units, and the staged whitespace check passed before commit; these checks do not establish product correctness.

## Round outcome

The bounded milestone remains strategically valid without an architectural rewrite. F4 and F5 require committed repair and focused rendered verification. Comparison claims must preserve the explicit observed/different/unverified distinction; complete native washing and timing parity remain unknown. A new exact-revision integrated review is required after engine, interface and scene changes land together, covering migration, money, task/ware ownership and rendering links. This round grants no product approval, and Claude coverage remains unavailable.
