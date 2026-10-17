# Supplies and employee contract proposal

Status: proposal; implementation requires coordinator approval and the construction milestone to land.

Owner: simulation worker; design base `b16105e`, implementation must start from landed main `37d1dc9` or a later coordinator-approved base.

This extends the current engine and [game contract](../../game-contract.md), with no new dependency or scenario rewrite; the coordinator's calendar decision below is necessary to make deliveries and monthly wages coherent.

## Evidence and bounds

[Research notes](../../research.md#supplies-and-priorities-follow-up-2026-10-17) distinguish the observed rules from unmeasured timing and capacity.

Observed: cabinet/counter $50 supports one $50 cutting board or $100 countertop fryer at the same ground tile; shelf $100; refrigerator $150; shelf ingredient prices potato/flour $1 and tomato/coffee/avocado $2; fridge steak/chicken $5; ingredient delivery quantity is a recurring batch, charged on arrival; tableware costs $15 each, prepays on plus and refunds an undelivered unit on minus; priority clicks cycle normal → high → off → low → normal.

Primary developer descriptions establish shelf capacities of 12/24 and the last documented cabinet capacity of 10; the additional observed ware types are stemmed glass, pan, bowl, cup and tumbler glass. Fridge capacity, full service/washing/payment timings, delivery transition frames, candidate wages and scheduling outcomes remain unverified.

The quantities, timing, recipes and scheduling rules below are proposed inferences for a coherent playable loop, not claims of measured parity.

## Catalog and physical support

Add `shelf` ($100, capacity 12), `bigshelf` ($400, capacity 24), `cuttingboard` ($50) and `fryer` ($100); retain `counter` ($50) and `fridge` ($150).

`PLACE` keeps ground-grid coordinates: placing `cuttingboard` or `fryer` resolves the counter at exactly `(x,z)` and creates a child `{ id, type, parentId, x, z, rotation, purchaseCost }`; no counter, a second child or another ground occupant rejects the action atomically.

One ground object and at most one supported appliance share a tile; parent and child coordinates/alignment must agree, the parent must be a counter, and a child never adds another path blocker to its solid parent.

Removing a supported child respects active tasks/orders; removing its counter is refused until the child is removed, with no cascade sale or silent stock disposal.

Retain existing freestanding `prep` objects and their IDs as valid preparation equipment; a cutting board also satisfies the six existing recipes' `prep` capability, avoiding a forced conversion of saved kitchens.

Use 12/24 ingredient units for shelf/big shelf and 10 clean/reserved-return tableware units per counter; fridge capacity 12 is provisional and must remain labelled as an inference.

All listed ingredients occupy one storage unit; shelf and fridge classes cannot substitute for one another, and the renderer reads each storage object's actual contents through a derived API.

## Version 2 state

Use save version `2`; `deserialize` accepts validated version 1 or version 2 and returns version 2.

Keep cash, land, objects, guests, orders, events, menu and scenario fields; retain the construction grant/purchase-cost rules.

Add authoritative `calendarSeconds` since Year 1, January 1 midnight; derive existing `day` and `time` fields and display dates from it, validating their agreement on load.

Add `supplies = { stocks, ingredientBatches, ingredientNextDay, tablewareQueue, tablewareNextAt, ware, wareLedger }`.

| Field | Canonical data |
| --- | --- |
| `stocks` | Sparse `{ storageId, ingredientId, quantity }[]`; one record per positive storage/ingredient pair. |
| `ingredientBatches` | Every ingredient ID maps to an integer from zero through total compatible storage capacity; quantity is the next recurring batch, never a desired total stock level. |
| `ingredientNextDay` | Future absolute calendar day divisible by 10; initialized once and advanced after each attempted batch. |
| `tablewareQueue` | Positive `{ tablewareId, storageId, quantity }[]`, unique by type/counter pair; units are prepaid and reserve that counter's capacity but are unavailable for cooking. |
| `tablewareNextAt` | Absolute elapsed deadline while the queue is nonempty, otherwise `null`. |
| `ware` | Individually identified reusable units with exactly the owner/location fields required by their state below. |
| `wareLedger` | Per-type nonnegative integer `{ granted, delivered, broken }`; grants include starter and migration units. |

Ware states are `clean { storageId }`, `order { orderId }`, `carriedMeal { staffId, orderId }`, `guest { guestId }`, `dirty { locationId, dirtySince, assigneeId? }`, `carriedDirty { staffId }`, `washing { staffId, sinkId }` and `carriedClean { staffId }`.

A wash assignment additionally reserves `returnStorageId` on its ware until it returns clean; its counter slot cannot be double-booked by a purchase or another wash job.

Dirty locations are existing tables or cooking stations; ownership transfers delete previous links in the same transaction, with reciprocal `wareId` on an owning order, guest or employee.

Capacity counts physically clean units, prepaid incoming units and reserved wash returns; dirty/in-use dishes elsewhere in the room do not occupy clean storage, so a kitchen may need more cabinet space before washing can continue.

An order adds `{ wareId?, ingredientsCommitted: boolean, funding: 'regular' | 'legacy-pending' | 'legacy-paid', legacyDebit? }`; only the migration path creates legacy funding.

Do not retain historical storage IDs after ingredient consumption; those sources may legitimately be sold later, while `ingredientsCommitted` prevents a second debit after interruption or save/load.

Generic staff retain actor/assignment fields and use `{ role: 'employee', skills: { cooking, speed, clumsiness }, priorities: { serving, cooking, dishwashing, cleaning }, monthlyWage, wageAccrued, wareId? }`; `game.candidates` persists three `{ id, name, skills, monthlyWage }` records.

Keep `idle`, `taking-order`, `cooking`, `pickup`, `serving` and `cleaning` task names; add `dish-collect`, `dish-to-sink`, `dish-wash`, `dish-return` and `meal-dispose`, each with required target/ware/owner fields rather than a generic command framework.

## Actions and read APIs

Retain construction, pricing, opening, speed, save/load and scenario actions.

| Action | Rule |
| --- | --- |
| `INGREDIENT_BATCH { ingredientId, quantity }` | Set an absolute recurring batch, zero through compatible capacity; no charge or stock change. Increasing a batch requires matching storage; zero remains valid without storage. |
| `TABLEWARE_ORDER { tablewareId, delta: 1 | -1 }` | Plus reserves available cabinet capacity, prepays $15 and queues one unit; minus cancels one still-pending unit of that type and refunds exactly its $15. |
| `HIRE { candidateId, x, z }` | Atomically choose an existing candidate and place a generic employee on a valid owned, floored, walkable tile; no unverified recruitment fee. |
| `PRIORITY { id, taskGroup, priority? }` | Group is `serving`, `cooking`, `dishwashing` or `cleaning`; explicit priority sets `normal/high/off/low`, omission cycles normal → high → off → low → normal. |
| `FIRE { id }` | Release unheld assignments safely; refuse while an employee physically carries a meal or dish. |

The new UI uses candidate/group actions; the old `{ role }` hiring and priority payloads are retired together with the class-selection UI, rather than silently creating specialist classes.

Add catalog exports `INGREDIENTS`, `TABLEWARE` and `TASK_GROUPS`; each ingredient declares ID, name, storage class and unit price, and each recipe declares concrete ingredients, tableware, equipment capabilities and primary cooking equipment.

Add `getSupplies(game)` returning ingredient rows `{ id, name, storageKind, unitPrice, onHand, usable, batchQuantity, batchLimit, storageCapacity, storageFree, storageAvailable, nextQuantity, nextCost, blockedReason }`, tableware rows `{ id, name, unitPrice, clean, usable, inUse, dirty, returning, queued, broken, capacity, free, canAdd, canCancel }`, and per-storage `{ id, capacity, used, reserved }`.

Its `deliveries.ingredient` and `deliveries.tableware` records expose `{ status, nextDay, remainingSeconds, progress, nextCost, blockedReason }`, where status is `idle/waiting/due/blocked`, progress is 0–1, and a tableware arrival never has a second cost.

Add `getRecipeStatus(game)` returning rows `{ recipeId, enabled, unlocked, canEnable, canOrder, canPrepare, status, requirements, missing }`; status is `locked/missing-equipment/missing-stock/missing-tableware/ready`, and requirement rows are `{ kind, id, label, required, available, owned, met, reason }`.

Kinds are `equipment/ingredient/tableware`; `available` counts reachable usable units while `owned` includes inaccessible stock, and `missing` is the derived list of unmet requirements.

Menu/equipment readiness uses the reachable floor/access graph without requiring hired staff; actual preparation additionally proves that the chosen employee can reach every required stock source, dish counter and station before any commitment.

`TOGGLE_RECIPE` always permits removal; adding requires unlock, reachable equipment, ingredients and a clean dish. Enabled dishes remain visible and orderable during later stock/clean-ware shortages; `canPrepare` blocks actual preparation and explains the shortage.

Keep `availableRecipes` as enabled, unlocked equipment-ready dishes, independent of plates temporarily in use; add `cookableRecipes` for the current stock/clean-ware subset so an existing menu does not disappear when its last plate is being used.

Keep existing `getStats` fields and add `monthlyWages`, `wagesAccrued`, `wagePeriodDays: 30`, `{ dayOfMonth, month, year, label }` calendar data, available candidate records and supply warnings; mark `hourlyWages` deprecated and derive its old-rate equivalent only for compatibility.

## Deliveries and charges

Ingredients arrive at absolute calendar days 10, 20, 30, 40 and so on, at the start of that date; tableware arrives five game days (75 simulation seconds) after the first queued purchase, and pause/speed affect both exactly once.

For a new game starting at January 1 midnight, the first ingredient deadline is January 10 (135 simulation seconds away), then January 20/30 at 150-second intervals; show the current interval's progress rather than resetting it when a batch quantity changes.

At an ingredient deadline, plan each requested batch against matching free storage in catalog ingredient order and storage ID order, cap actual delivered quantities by capacity, then charge only those actual quantities once and apply all arrivals atomically.

If cash cannot cover the entire capacity-limited planned delivery, skip that cycle without a debit and show a reason; full storage incurs no ingredient charge, and `ingredientNextDay` advances by ten in either case.

A six-potato batch with capacity and funds therefore produces stock 0 → 6 → 12 and cash deductions $6 → $6, with the batch setting remaining six.

Tableware plus/minus works while paused; plus selects a compatible counter and reserves a slot, first queued plus starts one absolute elapsed deadline, later additions share it, and cancellation of the final queued unit clears it.

Plus increases cash-paid expenses by $15; a successful minus adds $15 cash and subtracts $15 from cumulative and current-period net expenses, without adding sales revenue; repeated cancellation of an empty queue rejects unchanged. A refund on a later date may make that day's net expenses negative, which version 2 validates explicitly.

Arrival creates the already-paid units without another cash change; if their counter is inaccessible when due, the prepaid queue and elapsed deadline stay intact, status becomes blocked, and minus still refunds queued units.

Selling storage with stock, clean ware, incoming or return reservations, a supported child or an active target rejects atomically; no implicit transfer, destruction or refund cancellation occurs.

An otherwise empty ingredient store also cannot be sold while its removal would make a configured batch exceed remaining compatible capacity; reduce the batch first, with no hidden alteration of the setting.

Do not add ingredient aging/spoilage this milestone; its source description is known, but exact quality decay and behavior are unverified and not needed for the requested stock/service boundary.

## Declared recipes and consumables

Keep the six existing IDs, menu prices, unlock thresholds and equipment capabilities; preparation may use legacy `prep` or a cutting board, while a stove remains their primary hot-cooking source.

New recipe ingredient-cost displays sum declared quantities times current unit prices; they do not reuse the former abstract preparation charge.

| Recipe | Proposed consumed units | Reusable ware | Primary source |
| --- | --- | --- | --- |
| `burger` | flour 1, steak 1, tomato 1 | plate | stove |
| `salad` | tomato 1, avocado 1 | plate | preparation equipment |
| `pasta` | flour 1, tomato 1 | bowl | stove |
| `steak` | steak 1 | plate | stove |
| `risotto` | rice 1, mushroom 1 | bowl | stove |
| `chef-special` | chicken 1, avocado 1 | plate | stove |
| `fries` | potato 1 | plate | fryer; cutting board also required |

Fries price is the observed $15; its proposed cook time is 8 simulation seconds and its unlock threshold is zero.

Rice ($1) and mushroom ($2), both shelf stock, are narrowly inferred additions needed to declare the existing risotto coherently; all other ingredient prices/classes use the observations above.

The six ware IDs are `plate`, `stemglass`, `pan`, `bowl`, `cup`, `glass`, each $15, matching the observed plate, stemmed glass, pan, bowl, cup and tumbler glass types.

New furnished games include one accessible big shelf, two accessible counters, declared starter stock within capacity and twelve granted dishes (eight plates/four bowls); empty games have no stock, dishes or recurring orders until configured.

## Service, washing and priorities

Taking an order snapshots its menu price; at actual preparation start, atomically consume all required ingredient quantities and reserve one clean ware unit, then set `ingredientsCommitted` and link that unit to the order.

Ingredients are paid through delivery only; regular preparation no longer also charges the old recipe `cost`, and a stock/clean-ware shortage leaves a queued order waiting without a partial debit or negative inventory.

Cook → ready → pickup → serve transfers the same ware unit from order to guest; eating completion leaves that unit dirty at the table, then the existing toilet/departure/payment flow continues.

At cooking completion snapshot `order.quality = 0.6 + 0.4 × cookingSkill`; transfer it to `guest.mealQuality` when served and use it in meal happiness, with those 0–1 fields validated and persisted through active saves.

A table with dirty ware accepts no new guest reservations; dirty ware also lowers hygiene, with the oldest/dirtiest reachable dish collected first.

Dishwashing jobs reserve a free return slot and choose a complete reachable table/station → sink → counter route before collecting, then collect, carry, wash and return the same unit; proposed wash time is 4 simulation seconds.

Clumsiness may break dirty ware once on its first carried grid step, incrementing the broken ledger and releasing its reserved return slot exactly once; probability `0.04 × clumsiness` is an initial bounded inference, and persisted `breakageChecked` prevents a reload from rerolling that carry.

Cancellation never creates or deletes a ware unit: uncommitted regular orders have none; committed abandoned meals become dirty at their station; a carried meal becomes employee-owned dirty ware in a forced `meal-dispose` return phase before the cancelled order is deleted.

Priority changes affect the next job and do not abandon a carried dish or half-cooked order; firing/renovation must preserve reciprocal links, finish/release a safe unheld phase or refuse the action atomically.

If renovation blocks a carrying route, keep its owner, targets and reserved return slot, with `blocked: true` and a reason until replanning succeeds; an empty blocked path is valid only when the required route really is unreachable.

Generic employees choose reachable jobs by high → normal → low, exclude off, then choose oldest job with a fixed group tie order `serving, cooking, dishwashing, cleaning`; an unavailable high-priority job does not block a reachable lower-priority job, and a cleaning job's age resets after completion so equal-priority dishes cannot starve behind a permanent cleaning timestamp.

Generate three seeded, varied candidate profiles with skills `cooking/speed/clumsiness` in 0–1; cooking changes served-meal quality, speed changes walking (`0.75 + 0.5 × speed`), and clumsiness changes carried dish breakage; new employees do not cook faster solely because of their cooking skill.

Propose monthly wage `round(30 + 45 × cooking + 45 × speed + 30 × (1 - clumsiness))`, with varied profiles and no role-based salary presets; these amounts are balancing inferences, and candidate replacement after a hire uses persisted seeded randomness.

## Calendar and monthly payroll

Coordinator-selected inferred defaults are `DAY_SECONDS = 15` and 30 days per month, so a month lasts 450 simulation seconds; actor walking, cooking, eating and washing remain in their existing simulation-second units.

Display `1 Jan`, `2 Jan` and so on using twelve 30-day months and a derived year; keep `day` as the absolute monotonic day and `time` as its derived 0–24 fraction for existing engine consumers, while the UI hides the rapidly advancing hour clock.

The snapshots establish normal followed by Fast during study but not an exact multiplier; these calendar constants are explicit playable defaults rather than a measured calibration.

Each employee stores `monthlyWage` and `wageAccrued`; accrue `monthlyWage / 450` per simulation second, pay and clear the accrued amount at a 30-day month boundary, and settle exactly the accrued amount on a successful dismissal.

Midmonth hires therefore pay only their accrued fraction at the next boundary; hiring has no upfront fee, rejected dismissal never charges, and firing cannot erase earned wages.

Remove future automatic daily rent and hourly wage debits; the observed pre-month-boundary ledger matches construction, plate prepayment and ingredient arrivals without either charge, and earlier recorded expenses are never refunded or rewritten.

## Version 1 migration and graph validation

First validate the complete old graph with its existing rules; migrate a copied state and validate the resulting version 2 graph, with no partially returned game after failure.

Preserve object/actor/order IDs, next ID sequence, clocks, positions, paths, task progress, menu choices, cash, revenue, expenses, existing construction grant and refunds; only new records allocate new IDs.

Convert each old employee to a generic employee with matching preferred task groups; give the former cleaner equal normal cleaning/dishwashing priorities so an always-available cleaning job does not starve washing, and keep every in-flight task resumable.

Set legacy monthly wage to `(old hourly wage / 20) × 450` and `wageAccrued = 0`, explicitly preserving the former effective per-simulation-second rate while moving future payment to month boundaries; old chef/waiter/cleaner wages 6/4/2 become monthly 135/90/45.

All wages through the load instant were already charged by version 1, so migration does not accrue earlier days again; preserve `day/time` by converting their phase to `calendarSeconds`, then use the new future calendar rate and delivery/payroll policy.

Map old cooking skill to the new 0–1 quality statistic, preserve already completed preparation progress, and use speed 0.5 to preserve the old walking multiplier; future cooking duration follows each recipe rather than the previous skill-driven speed rule.

For each existing cooking/ready order, grant and link one ware unit and mark `legacy-paid`; its old recipe charge has already happened, so it never pays for or consumes ingredients again.

For a queued old order, grant its ware and mark `legacy-pending` with a frozen version 1 debit: burger 4.5, salad 3, pasta 4, steak 9, risotto 6, chef-special 11; debit that amount once when preparation starts, then mark `legacy-paid`, without also consuming new stock or reading a changed recipe-cost display.

Eating guests receive a granted guest-owned unit; completed meals with an existing table become dirty units there, while historical completed meals without a remaining table create no new dish or charge.

Migrated kitchens gain no invented stock or moved/new storage: in-flight work completes, and the UI explains the storage/delivery prerequisites for subsequent new orders; lack of a counter can block later washing without invalidating the imported state.

Validate unique global IDs; ground/support occupancy and compatible parents; integer stock/queue/ledger quantities; matching storage classes and capacity; finite deadlines; allowed states; exact required owner/location fields; task/role-group/target/path compatibility; recipe-compatible committed meals; and reciprocal employee/order/guest/ware ownership.

Conservation must hold per tableware type: `granted + delivered = live ware units + broken`; a queued prepaid unit is outside that equation until delivered, and clean/queued/reserved-return occupancy never exceeds compatible storage capacity.

Every actor path remains cardinal and collision-free with the existing reserved-chair exceptions; supported appliance targets use the parent cell, and dirty ware or active delivery/wash targets prevent unsafe furniture removal.

## Acceptance checks and decisions needed

Tests cover unsupported/duplicate child placement and parent sale atomicity; fixed batch 6 → 12 with charge-on-arrival and full/partial-capacity/funds outcomes; prepaid plus/minus/refund and exact-once arrivals; no double ingredient charge; all recipe shortages; dirty table blocking, collection, washing and seeded breakage conservation; four-state cycle and real scheduler effects; three skill effects; 15-second date advancement, 10-day shipment boundaries, monthly/prorated/dismissal payroll and unchanged pre-boundary ledger; pause/speed; construction/removal interruptions; malformed parents/owners/deadlines/ledgers; active delivery/service round trips; and migration fixtures spanning queued/cooking/ready/eating/toilet/leaving without duplicate debit or lost links.

Use at least 8,000 consecutive quarter-second round trips over new supplies/service states and compare future deterministic state, plus real browser purchases and a meal-to-washed-plate cycle through controls; native service timing remains explicitly unverified.

Coordinator approval is still required for this complete field/API contract and the inferred candidate-wage formula, quality formula, fridge capacity and carried-step breakage probability before implementation; the shelf/cabinet capacities, ware IDs, rice/mushroom bridge, four-second wash, non-preemptive priorities, day length, ingredient boundaries, five-day tableware delay, zero-fee hire and month-boundary payroll are coordinator decisions recorded above.

Ingredient freshness, broad catalog/progression, zoning, per-table menus, employee clothing, precise native timing calibration and scenario changes remain later work.
