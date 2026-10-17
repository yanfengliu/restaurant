# Review 0: design

## Target

Initial design target: repository `restaurant`, commit `1042cd60a219f0299c20d811245273d843536f0c`, `docs/work/2_restaurant-supplies/design.md` and its plan, against landed product base `37d1dc9`. Follow-up contract repairs were inspected exactly at `8bc50bd3e7c6d11d90fab16e9d5c95b95b04620f` and `f9f0fc7b6906ba8f0d03d1f53801a24389a78499`. Those are documentation changes, not a reviewed implementation. The review checkout stayed on the initial target while the committed amendment diffs were read from Git.

## Reviewers and coverage

Independent Codex reviewer `gpt-6-astra`, reasoning effort `xhigh`, read the proposal, existing catalog, service/task transitions, construction interruptions, payroll and save validation. Focus: version-1 migration, reusable-ware ownership and conservation, capacity and refunds, delivery/calendar rules, interruption semantics and shared APIs. Four bounded probes of the existing engine checked whether the migration edge cases are real reachable or valid version-1 states. No product code was changed.

Claude abstains: the pinned lane's same-day smoke previously returned weekly-quota API 429 without a review. It was not retried. No browser, server, native application, new dependency or secondary reviewer process was launched. Reference timings and formulas were not independently measured; coordinator-approved inferred defaults were treated as product decisions, not reference-parity claims.

## Reports

### Codex: gpt-6-astra, xhigh

The design is a coherent extension of the existing engine, provided its migration and orphan-meal cases are explicit. It does not need a separate inventory service, generic command framework or second simulation. The state machine, individual ware identity, prepaid queue reservations and conservation ledger are appropriate for this scope. Four material gaps in the initial proposal were sent promptly to the owner and repaired before implementation authorization.

**F0 — P1 design blocker: defer ware grants for queued legacy orders until preparation commits.** Initial `design.md:209` grants a ware unit immediately to every queued old order, but queued version-1 orders have no source until preparation starts (`src/engine.js:395-397`, validator `675`). A queued order can also have no assigned cook. Cancellation before preparation therefore has neither a source station nor necessarily a counter to receive its granted unit. Deleting the unit would violate the proposal's conservation rule, while retaining an order-owned unit after order deletion breaks ownership.

A public-action baseline probe fired the starter chef, advanced until the first order, and obtained a valid save at 10.5 simulation seconds with a queued burger, progress zero, no `sourceId` and no assigned staff. The bounded correction is to migrate it as ware-free `legacy-pending`; only the successful frozen debit/preparation transaction grants and links its ware, then changes funding to `legacy-paid`. `8bc50bd` states that rule explicitly. Implementation must check both cancellation before preparation and repeated interrupted/resumed preparation without a second debit or grant.

**F1 — P1 design blocker: migrate physical meal ownership and unrecoverable historical fields by phase.** Initial `design.md:207` groups cooking and ready orders together, but version 1 keeps an order `ready` while its waiter is already carrying it to the guest (`src/engine.js:401-405`). A migration that assigns all ready ware to the station/order cannot preserve the serving task and new reciprocal carrier link. The accepted repair at `8bc50bd` distinguishes station-ready/pickup from `staff.task === 'serving'`: the latter receives `carriedMeal` ware with reciprocal employee/order ownership and unchanged path, task and timer.

The existing engine also deletes an order on serving and retains neither recipe identity nor cooking quality on the guest (`src/engine.js:409-410`). A ready legacy order has already passed the proposed new quality-snapshot point, so it cannot acquire that field later through normal completion. The follow-up at `f9f0fc7` explicitly supplies neutral quality 1 for already-ready meals and meal quality 1 for already-served guests, while queued/cooking meals derive quality on future completion. Unknown served recipes receive a declared migration fallback plate instead of an invented recipe identity. Only completed positive-bill meals with a surviving table create dirty units; failed pre-meal leavers do not. These defaults close the remaining phase-mapping gap without purporting to recover information the old format never recorded.

A baseline probe removed the starter counter through the public action and advanced to 19.5 seconds. The valid state had a `ready` order, its waiter in `serving` with two remaining path cells, no counter, and no order quality. Advancing to eating produced a guest with bill 18 and no recipe ID, order ID or meal-quality field. Migration fixtures should preserve these cases and cover station-ready, pickup, serving, eating, toilet and positive/zero-bill leaving separately.

**F2 — P1 design blocker: freeze version-1 validation before extending the catalog.** Initial `design.md:195` says to validate old rules, but the existing validator resolves recipes from the live catalog and requires its current length (`src/engine.js:672-688`, `695-700`). Adding Fries makes the new catalog contain seven recipes while every valid legacy menu has six. The engine worker also raised this coupling; this reviewer independently confirmed it by adding Fries only to the probe process's imported catalog, then loading an otherwise untouched starter save. Loading failed with “the menu is missing recipes.” The process restored the in-memory catalog afterward; no repository file changed.

`8bc50bd` explicitly freezes the old recipe, role and graph rules, including the exact six-entry menu; it then appends disabled Fries after legacy validation and validates the copied version-2 result. Retain the frozen preparation debit map as already specified. Tests must validate old six-entry menus and old active sources before migration, reject invalid old graphs, preserve old prices/enabled choices, and add the new disabled entry exactly once. Version-2 catalog edits must not silently reinterpret version-1 validity.

**F3 — P1 design blocker: cancelled carried meals need a disposal path without clean-storage capacity.** Initial `design.md:163-171` requires complete sink/counter routes and a reserved return slot for washing, but does not fully define disposal of a meal already carried when its guest cancels. The counter slot freed during cooking may already be reserved by a prepaid replacement. A migrated restaurant may have no counter at all. All walking routes can be clear while clean return capacity is unavailable, so a route-blocked flag alone does not resolve this condition.

The accepted `8bc50bd` contract transfers the cancelled meal's ware and source target atomically to the employee's forced `meal-dispose` task before deleting its order. This phase returns the dirty unit to its existing source station without a sink, counter or `returnStorageId`. A blocked route retains the carrier and protected source; firing or sale cannot destroy the links. Once deposited, ordinary washing waits for its complete route and reserved return slot. This uses the existing dirty-station state, preserves conservation and avoids inventing storage capacity. Implementation must exercise full-capacity and no-counter cancellations, paused saves before/after transfer, a blocked return route, later recovery, and attempted source sale or carrier dismissal.

The remaining transaction and calendar rules are sufficiently concrete for implementation: ingredient delivery plans capacity-limited quantities and charges once; insufficient funds skip that cycle; tableware prepays and reserves capacity, arrives without a second charge, and refunds only still-pending units. The explicitly permitted negative current-day net expense handles later-date cancellation. The independent calendar clock and elapsed transit deadlines avoid changing actor-speed units. Fifteen seconds per day, first shipment at 135 seconds, later 150-second ingredient intervals, 75-second tableware transit and 450-second wage periods are mutually consistent defaults. Monthly accrual and dismissal settlement prevent an employee from escaping earned wages by firing before the boundary. These are reasoning checks of the specification, not executed version-2 behavior.

The amended API now distinguishes configured `scheduledCost` from capacity-limited `nextCost`; readiness, usable-versus-owned supplies, cookable recipes and blocked reasons give the interface enough information without duplicating preparation decisions. The proposed source and return-slot links should remain authoritative through renovation. Existing `rebuildPaths()` resets staff and order assignments indiscriminately (`src/engine.js:472-481`, outside this documentation diff); implementation must replace that behavior where new held-ware states require retention or atomic refusal. A passing legacy test suite alone cannot establish those new invariants.

## Findings and disposition

These IDs start at zero for work unit 2. Owner dispositions below are separate from the authored findings.

| ID | Finding | Disposition and reason | Repair and closure evidence |
|---|---|---|---|
| F0 | Queued legacy ware can be stranded before preparation | Accepted by owner; resolved in the design. | `8bc50bd` defers the grant to the successful one-time preparation debit. |
| F1 | Migration misses carried ready meals and absent historical fields | Accepted by owner; resolved in the design. | `8bc50bd` adds carrier-aware migration; `f9f0fc7` adds explicit quality and unknown-recipe defaults and completed-meal filtering. |
| F2 | Live catalog extension can reject valid version-1 graphs | Accepted by owner, corroborated by engine worker and independent probe; resolved in the design. | `8bc50bd` freezes version-1 validation and adds disabled Fries only afterward. |
| F3 | Carried-meal disposal lacks a no-capacity path | Accepted by owner; resolved in the design. | `8bc50bd` specifies atomic employee ownership transfer and return to the protected source without a wash reservation. |

## Verification

- Read the full original design at `1042cd6` and exact amendment diffs through `f9f0fc7`; product files were unchanged by those commits.
- Existing-engine probes confirmed valid queued/no-source, serving-ready/no-counter, and already-eating/no-history states, with save validation passing for each. A process-local catalog-extension probe confirmed the old validator's menu-length coupling. These establish the reported migration preconditions, not the correctness of code that has not been written.
- No broad runtime/build/browser gate was rerun for this documentation review. Version-2 conservation, delivery/refund accounting, clock boundaries, active-state migration, interruption recovery, API values, deterministic long-run saves and real purchasing/service/washing remain implementation acceptance work.
- No new empirical claim about reference capacities, timing, skill effects or wages was made. Approved formulas remain labelled inferences.
- Work-document structure passed with three work units, and `git diff --check` passed; no product changes or task-owned processes were created.

## Round outcome

The amended design at `f9f0fc7b6906ba8f0d03d1f53801a24389a78499` has no unresolved material design blocker identified in this review. The owner was notified that implementation may begin under that contract. F0–F3 are closed at the design level only; implemented migration and the supplies/service graph require their own exact-revision tests, actual-input verification and independent review. Claude coverage remains unavailable.
