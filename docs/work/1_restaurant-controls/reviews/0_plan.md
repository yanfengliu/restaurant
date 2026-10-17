# Review 0: plan

## Target

Strategic checkpoint on 2026-10-17 against `32502067a95317d51a147fcea51d649a3984e189`: `docs/work/1_restaurant-controls/plan.md`, the retained research and local rules, and the foundation product code. This is a whole-effort scope and architecture assessment before the concurrent construction, scene, and UI changes are integrated. It does not review those unintegrated implementations or accept a future candidate.

## Reviewers and coverage

Codex reviewer `gpt-6-astra`, reasoning effort `xhigh`, read the plan, source contracts, relevant engine/catalog/UI/scene code, and research claims. The reviewer independently inspected eleven existing local images at original resolution: six installed-game captures, two supplied-post images, and three foundation captures. Their hashes appear below. No browser, native application, server, subagent, or fresh runtime test was launched. Foundation correctness findings already closed in work unit 0 were not reopened.

The current user direction prioritizes reproducing the studied gameplay and visual behavior before creative departures, while retaining neutral product identity and authored assets. The ignored gallery is informational evidence, not an acceptance gate or a measure of parity. Native service completion, replenishment, and long-term economy remain unobserved in the reviewed research; the integration owner reports that another direct study is waiting for a suitable period without competing desktop input.

## Reports

### Codex: gpt-6-astra, xhigh

The construction milestone is the right immediate correction and is appropriately bounded. Native captures show tall saturated brick walls, substantial dark caps and skirting, coarse peach floorboards, thin near-black HUD strips, and gray four-column furnishing palettes. The foundation captures show lower cream walls, finer tan flooring, a large light branding header, a prominent editorial overview, and a sparse three-column palette. The plan directly addresses these differences. Keep the current small engine/catalog/scene/UI separation; no framework or generalized simulation rewrite is justified by this checkpoint.

**F0 — current milestone integration risk: define enclosure and stroke semantics independently of walking.** `docs/work/1_restaurant-controls/plan.md:22` correctly requires four wall drags, automatic flooring, door replacement, and atomic charges. The existing catalog makes doors walkable, and the engine's path blockers are derived from solidity. Room enclosure therefore cannot simply reuse walking connectivity: a doorway must preserve the building boundary while allowing a path through it. Preserve paid or customized floor tiles when a boundary is opened. Validate a whole stroke and its total cost before applying it; do not leave partially charged construction when one segment fails. Exercise door replacement and adjoining-room boundaries as well as the initial rectangle, with paused save round trips and actual pointer release/cancel behavior. These are identified contract risks for the pending implementation, not reproduced bugs in worker branches that were outside this review.

**F1 — highest next gameplay priority: finish the supply, service, and washing cycle.** Native dish and tableware captures visibly require equipment, an ingredient crate, and a plate, and offer tableware ordering/delivery. Native employee priorities include Serving, Cooking, Dishwashing, and Cleaning. In the foundation, `src/engine.js:153-157` checks only equipment and menu unlocks; `src/engine.js:302-304` substitutes a cash deduction for ingredient consumption; `src/engine.js:317` removes an order upon serving; and `src/engine.js:279-283` assigns work from a single exclusive role. These differences affect the player's operating decisions, not just interface labels. The plan correctly queues stocks and four priorities next. Before claiming those systems reproduce the reference, observe a stocked meal through delivery/storage, cooking, serving/payment, used tableware, washing, and replenishment, and cycle the native priority control. Screenshots establish the prerequisites and controls, but not depletion quantities, delivery timing, priority levels, or scheduling rules. Public primary descriptions can guide the next design while direct observation is pending; keep their claims distinct from measured behavior.

Keep the implementation change narrow: explicit stock and clean/dirty/reserved tableware state, recipes that name their dependencies, and task choice using each employee's priorities. Preserve employee identity and wage when priorities change; `src/engine.js:445` currently changes both role and wage and cannot simply be relabeled as the observed priority matrix. Extend the existing task transitions and reciprocal reservation checks rather than adding a second simulation. Specify save migration/defaults with the new state and verify interrupted deliveries, meals, washing, and reassignment through save/load. Exact timing and balancing remain evidence gaps.

**F2 — next progression priority: align the starting economy, calendar, and challenge structure together.** The native scenario capture starts with 3000 coins, no employees, and three separately starred goals, including monthly dish revenue and waiting time at a given population. The reviewed research records later scenarios gated by accumulated stars and candidate monthly wages. The foundation starts with 6250 in the furnished mode or 15000 on an empty plot (`src/engine.js:55`), charges continuous hourly wages and daily rent (`src/engine.js:345-354`), and has freely selectable cumulative goals with a single completion flag and a $500 reward (`src/engine.js:331-340`, `src/engine.js:474-477`). Six selectable briefs do not establish equivalent progression. After the first functional service cycle, implement the corresponding time-window counters, tiered goals and unlocking, and a coherent starter budget. Changing furniture prices alone will not reproduce the observed economic decisions. Do not assert exact time scales or unobserved later maps until they have supporting evidence.

**F3 — remaining visual priority: add representative material and object families, not just one new wall color.** The supplied-post detail image shows peach paneling with masonry ends, three frame silhouettes, a round clock, and three flower-box proportions. Its room image combines red patterned flooring, pale chairs, exterior brick, interior paneling, and perimeter planters. The live table palette shows many materially different table shapes and selectable color swatches. A brick/peach starter and four-column layout will improve the current comparison, but a four-column grid holding the same small catalog is not the observed variety. Follow with a bounded representative set of tables/chairs, wall and floor finishes, frames, clock, planters, and their placement/color controls. Ensure previews depict the placed model: the foundation's separate regex-based SVG previews in `src/main.js:145-156` will otherwise diverge as variants are added. Reuse item descriptors and model construction where practical; a new asset pipeline is not required.

For visual comparison, pair equivalent room sizes and roughly equivalent camera framing with the same panel open. Inspect the room silhouette and usable canvas first, then materials, catalog previews, and smaller details. Keep source screenshots and their existing hashes in the ignored gallery; record qualitative matches, differences, and unverified behavior without a completion percentage or invented pixel-match score. Do not turn the gallery into another required service.

## Findings and disposition

These are strategic findings for work unit 1; IDs are local to this work unit and do not reopen the closed foundation findings. The integration owner owns implementation scheduling and final dispositions.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Construction topology and stroke atomicity need one shared contract | Open integration consideration; no pending worker implementation was reviewed. | Agree enclosure versus walkability and preserve floors; verify the integrated action and pointer paths. |
| F1 | Supplies, reusable tableware, and four priorities are the main gameplay gap | Already queued by the plan as the next dependent milestone; full native behavior is not yet observed. | Complete a bounded native service study when available, then implement and verify the corresponding lifecycle with explicit persistence. |
| F2 | Economy and six briefs do not reproduce the observed scenario progression | Follow-up recommendation; outside the current construction milestone. | Align starter budget, calendar counters, wage basis, goal tiers and unlocking after service behavior is established. |
| F3 | Material and furnishing families remain substantially narrower than the evidence | Follow-up recommendation; current milestone improves the largest visual differences first. | Add representative variants and faithful previews, then compare equivalent scenes using retained evidence. |

## Verification

Read the exact committed plan and relevant source at `3250206`. Existing foundation test/build/browser results were context only and were not rerun for this strategic review. Current source and inspected images support the stated differences; they do not verify the pending implementation, native service timing, inventory depletion, later scenarios, or complete parity.

The following existing files were viewed at original resolution and hashed during this review. Paths are repository-relative; images remain ignored local evidence and were not added to Git.

| File | SHA-256 |
|---|---|
| `output/gallery/reference-live-01-scenario.png` | `fd18e932701cecbd5993c502f6a84f5de4a1985c9b788f3a5479d1a48eded26f` |
| `output/gallery/reference-live-03-enclosed-room.png` | `37a1426367272c5f1a59ee5028ac1d903c96408b779142b909e2cfba1f97439a` |
| `output/gallery/reference-live-04-tables.png` | `916e665929f0fc478fc0b09260eb27f9a25199f3fab4185b65f45971af94dc96` |
| `output/gallery/reference-live-06-dish-requirements.png` | `444041829fcdb61b80677823f65110df4b3a83b551fe34f307437f453ef50a80` |
| `output/gallery/reference-live-07-tableware.png` | `3b61d254d53c0c6a60a2e34a078215d123109689bf4f027faefea50de67275b5` |
| `output/gallery/reference-live-09-priorities.png` | `4283a94a8c93970e538b6e95c90b4534e091677bae81ff8dc2f4d79050cdab3b` |
| `output/gallery/reference-detail.png` | `4c98514416de2262a83ed48f6d6e618e4c8632a3dd09590e7631778e0259a617` |
| `output/gallery/reference-room.png` | `1056cc1960815c42b9bce50d70ad269b08ecce118ea778c8850af242e3f161ce` |
| `output/playwright/current-room.png` | `c91f22294108cba3907708b00a17a47f828b39e008a33f3af5fc1ab1714af56b` |
| `output/playwright/build-1024.png` | `c2bf7ca1b60ec09619f93a8dcdfa3f6284c61b5a7c03dfe7f94977643187906f` |
| `output/playwright/staff-controls.png` | `2471984e4bab563b67645567f12ffa2081a224a7d35126c8c9dc3ea19cac6a50` |

## Round outcome

Continue the bounded construction and interface milestone, then prioritize the observed supply/service/washing lifecycle and employee priorities, followed by coherent progression and representative catalog/material families. The existing architecture is sufficient if the new transitions, reservations, and saved state remain centralized. This checkpoint gives direction and identifies evidence gaps; it does not approve the forthcoming integrated candidate or declare the broader requested game complete.
