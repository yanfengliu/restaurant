# Dishwashing equipment and daily wages

Status: approved by the orchestrator on 2026-10-17.
Owner: service-engine worker
Base: `1508bb3`

## Evidence and limits

The catalog study establishes a free-standing Kitchen dishwasher priced at $150, with five slots and placement on bare owned ground. Repeated operating service shows one through four dirty plates waiting in the open rack, then five plates with the hood closed while the employee works elsewhere. This supports a full-five unattended batch. Exact cycle duration and clean retrieval were not captured; use the explicit employee-retrieval fallback below without claiming it was observed.

Daily wage debits began after the native restaurant completed its opening tutorial and enabled its menu. The isolated earlier non-operating trace had unchanged cash and does not override that operating trace. Retain the current product's immediate wage accrual after hiring; do not add an unmeasured tutorial payroll gate. Attribution and dated native captures belong in `docs/research.md`.

Keep the existing authored clock: 15 simulation seconds per day, 30 days per month. Four-second washing, employee clean retrieval, partial-day wage proration, sub-cent accounting, the existing breakage rule and bankruptcy thresholds remain authored behavior. Do not label these as measured matches.

## Daily wages

Keep `monthlyWage` as advertised salary and `wageAccrued` as complete unpaid liability. Accrue `monthlyWage / 450` per simulation second. Settle and clear all employees' accrued amounts at each day boundary, including the month boundary, exactly once. The new day's expense total includes that boundary settlement. Store full finite numeric precision and round only display text. Pausing adds no accrual. Hiring adds no upfront debit and accrues only subsequent elapsed time. Dismissal settles that employee's outstanding accrual once and retains the carrying/washing refusal.

Keep salary and settlement periods distinct in `getStats`: `monthlyWages` and `wagePeriodDays: 30` describe advertised salary; add `dailyWages` equal to total monthly salaries divided by 30 and `wageSettlementDays: 1`. `wagesAccrued` remains outstanding money owed. Interface text says salary per month, paid daily.

A version 2 save may contain unpaid accrual from many days of the old monthly policy. Loading preserves that amount, cash and historical expenses exactly. The first subsequent daily boundary pays old liability plus newly accrued time once, then later boundaries pay only subsequent time. Dismissal before that boundary settles the complete liability. The current validator accepts up to one monthly salary at any time of day. Preserve that accepted range and allow the current day's new accrual above it: ceiling = monthly salary + monthly salary * current day phase in seconds / 450, with numeric tolerance. This phase-aware bound remains valid as time advances until daily settlement; a fixed higher ceiling would merely move the overflow edge. Do not cap liability to a day.

Version 1 validation and migration retain their frozen behavior. Already-paid historical wages become `monthlyWage = wage * 22.5` with zero accrual. Do not charge them on migration or infer unpaid days from the old clock.

## Catalog and compatibility

Add `ITEMS.dishwasher`: Kitchen category, $150, free-standing, solid, one ground cell, `washCapacity: 5`. Processing capacity is separate from the `capacity`/`storageKind` properties for shelf, fridge and cabinet inventory. Placing the appliance creates no dishes, clean inventory, cabinet reservations or supply debit.

Keep the existing `sink` type, price, catalog entry, IDs and graph valid. Keep sinks purchasable and retain the Chef's Tasting Plate sink dependency, so an empty start can still attain that recipe. Legacy sink washing remains available with its existing employee-held four-second process; do not convert saved objects or infer their purpose from coordinates. New furnished games add a dedicated dishwasher while retaining recipe-required sinks. New loading jobs prefer a reachable dishwasher with a free slot, then fall back to an available sink; already assigned sink tasks finish unchanged.

Keep save version 2 and extend only the task/ware alternatives below. Old version 2 records load without mutation. Frozen version 1 validation remains unchanged before migration and current graph validation. No schema bump, load-time wage payment, invented inventory, new recipe, scenario or calendar policy is needed.

## Machine ownership and jobs

Keep one record per conserved dish in `supplies.ware`. Add machine tasks `machine-collect`, `machine-load`, `machine-unload` and `machine-return`; do not change the existing sink tasks. New employee ownership uses `dishwasherId`, not the legacy `sinkId` field. New rack states are `rackDirty`, `rackWashing` and `rackClean`.

A `machine-collect` job proves employee → dirty source → dishwasher → cabinet access, reserves a free machine slot and one cabinet return slot, and owns the dirty unit through `assigneeId`. Employee links are `{ wareId, dishwasherId, taskTarget: dirty location }`; the ware retains `{ locationId, dirtySince, assigneeId, returnStorageId }`. Incoming capacity is derived from active `machine-collect` and `machine-load` employee links, never persisted as a second counter.

Collection transfers the dish to existing `carriedDirty { staffId, returnStorageId, breakageChecked: false }`, changes the employee to `machine-load`, and targets the dishwasher. On the first actual dirty-carry movement, apply the existing `0.04 * clumsiness` breakage rule once; persist `breakageChecked`. A break removes that live unit, increments its ledger once and releases both reservations once. Racks, cycle completion and clean retrieval never reroll breakage.

Arrival deposits `rackDirty { dishwasherId, returnStorageId, rackSince: elapsed }`, releases the employee to idle, and keeps the reserved cabinet slot. A machine starts only when it contains exactly five `rackDirty` units. It atomically changes all five to `rackWashing`, retaining each unit's links, and records `object.washProgress: 0`. Advance this single progress value independently of employee priorities or paths. At four simulation seconds, atomically change all five to `rackClean` and remove `washProgress`. The loaded unit's `rackSince` survives until pickup and orders clean retrieval by load age. Underfilled racks remain waiting indefinitely; do not silently run a partial cycle.

A `machine-unload` job reserves one reachable `rackClean` unit with its `assigneeId`; employee links are `{ wareId, dishwasherId, taskTarget: dishwasher }`. Prove the machine → already-reserved cabinet route before assigning and check it again immediately before pickup. If that return route became blocked while walking to the machine, release only the unload assignee and leave the unit in the rack with its cabinet reservation; another unload job waits until the complete route exists. This is an authored fallback for the unobserved clean retrieval step. On arrival, transfer the unit to existing `carriedClean { staffId, returnStorageId }`, free its machine slot, and change the employee to `machine-return { wareId, taskTarget: returnStorageId }` without a dishwasher link. Arrival at that cabinet makes it `clean { storageId }` and releases the return reservation. Cabinets resolve their current coordinates if moved before becoming the active return target.

A rack can contain dirty and clean units between batches as employees unload completed dishes and load new ones into freed slots. A new cycle still requires five dirty units; a clean unit never joins a later wash. A batch in progress always owns exactly five washing units and no incoming, dirty or clean units.

## Capacity, cancellation and load validation

Five slots count incoming reservations plus `rackDirty`, `rackWashing` and `rackClean` units. The sixth assignment cannot reserve any machine or cabinet capacity; it waits dirty or uses another compatible appliance. A clean unit releases its machine slot only on employee pickup, not at cycle completion. All per-unit cabinet reservations remain until that unit is stored or broken. Tableware clean/usable counts include only units stored in cabinets; loaded clean dishes remain returning inventory, unavailable for cooking until stored.

Dismissal during unheld `machine-collect` clears that unit's assignee and both reservations, restoring an ordinary dirty unit. Dismissal during unheld `machine-unload` clears only its assignee; the rack and cabinet reservation remain intact. Carrying dirty or clean dishes remains non-dismissible. Autonomous racks have no employee owner and cannot be destroyed by dismissal or priority changes. Existing cancelled-meal disposal feeds the ordinary dirty queue unchanged.

Blockage of an active source or machine path retains ownership, capacity, return reservation and an explicit blocked reason, just as the existing sink loop does. The pre-pickup return-route exception above leaves ownership on the rack and releases only its unload assignee. Sell or real MOVE of a dishwasher with incoming, loaded or active unload work is refused atomically; an exact no-op MOVE still succeeds unchanged. Once its clean unit has been picked up, that unit no longer protects the machine, but its cabinet remains reserved/protected by the active return task.

Validation requires each new task's exact permitted links and reciprocal dish owner, each rack unit's existing dishwasher/cabinet and finite `rackSince` no later than elapsed, unique assignment, combined occupancy at most five, and no employee-held ownership on a rack unit. `washProgress` is finite in [0,4), present only on a dishwasher with exactly five `rackWashing` units, and absent for inactive machines. All five transition together. A machine with five waiting dirty units must already have started; inactive full-dirty rack records reject. Wrong equipment, excess capacity, missing or duplicate owners, mixed active cycles, stale progress and incompatible return links reject with explanatory errors. Every unit remains in per-type conservation totals.

## Read API and interface contract

Add `getSupplies(game).dishwashers`, sorted in object order, with rows `{ id, capacity, occupied, inbound, dirty, washing, cleanReady, progress, remainingSeconds, batchNeeded }`. `capacity` is 5; `occupied = dirty + washing + cleanReady` counts physical rack units; `occupied + inbound <= capacity` counts all committed slots. Display the physical rack count and incoming reservations separately. `progress` is shared cycle progress divided by four and `remainingSeconds` is four minus raw `object.washProgress` in seconds only during a cycle; both are zero otherwise. `batchNeeded` is `5 - dirty` when dirty units are waiting outside a cycle, otherwise zero. It means additional dirty units that must be physically loaded, including any units already inbound. Counts are derived from validated owners, not independent persisted counters.

Existing tableware rows include rack dirty/washing in `dirty`, and rack clean plus carried clean in `returning`; `clean + inUse + dirty + returning` still equals live units. Add breakdown fields `rackDirty`, `rackWashing` and `cleanReady`: the first two are subsets of `dirty`, and `cleanReady` is a subset of `returning`, so callers must not add those breakdowns to the live-unit total. The appliance inspector and hood use these summary fields. The UI explicitly says it starts with five dirty dishes and that clean dishes are returned by staff. Underfilled waiting racks show how many more dirty units are needed; warn when fewer than five live plus prepaid dishes exist because that stock cannot complete a full batch. Additional dishes or completing deliveries can resolve an already-loaded shortage. Legacy sinks can process uncommitted dirty dishes, but cannot retrieve dishes from an underfilled rack. Do not invent a partial-wash button or imply the machine has stopped working.

## Verification contract

Use public engine actions for construction, hiring, priorities, ordering and service. Direct setup is reserved for named historic-save or malformed-record cases with stated bounds. Preserve literal version 1 fixtures. Promote genuine pre-change version 2 snapshots retained under ignored `tmp/service-fixtures/v2-service-history.json`: revision `1508bb3aff609be2f556ca0403a8f79043a2c002`, engine blob `3d0e348b735b82a739b89c6446ba932f17a36d4a`, catalog blob `f58e8a76c873c4409ee27bae0e08227c0195c61d`, source/action metadata and twelve old-validator-checked phases. Retained fixture SHA256 is `3267876c1daaf29a37a7437d63953f384f044a6fddbbc972ec203bd277f3b1b8`; do not regenerate it using changed code.

Money checks cover just before/on/after day and month boundaries, partial-day hire/dismissal, pause and each speed, multiple days in a capped tick, insufficient cash/bankruptcy, reload around settlement, historical version 2 unpaid liability including its old accepted maximum, and version 1 already-paid history. Assert cash, lifetime/daily expenses, individual accrual and wage estimates independently; compare future twins after round trips.

Equipment checks follow actual service through four waiting units, fifth load/full batch, unattended shared progress/completion, clean retrieval and cabinet storage. Validate every phase after reload and prove per-type conservation. Cover simultaneous work up to five slots, sixth-slot pressure, mixed clean/dirty rack reuse, underfilled shortage warning, cancellation/disposal, dismissal, blocked source/machine/return routes, breakage, cabinet reservation capacity, sell/move/no-op behavior and malformed owners/progress/capacity. Keep long-run service and historical validation checks intact.

The orchestrator owns browser-input acceptance, individual appliance/panel pixel inspection, ignored-gallery comparisons, final integrated gates and independent review. No browser, server or GUI resource is allocated to this worker.
