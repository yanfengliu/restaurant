# Dishwashing equipment and daily wages

Status: proposed; the equipment job model awaits the bounded native service trace and orchestrator agreement.
Owner: service-engine worker
Base: `1508bb3`

## Evidence and limits

The catalog study establishes a free-standing Kitchen dishwasher priced at $150, with an empty 0/5 contents indicator and placement on bare owned ground. The published daily-pay rule divides monthly salary by the days in the month. The current installed-game trace has not yet established the dishwasher loading, unattended cycle or clean retrieval behavior, or demonstrated actual wage debits. Attribution and dated observations belong in `docs/research.md`; the statements here set the implementation boundary.

Keep the existing authored clock: 15 simulation seconds per day, 30 days per month. Four-second washing, partial-day wage proration, sub-cent accounting and bankruptcy thresholds remain playable defaults unless the study supplies contrary evidence. Do not label these defaults as measured behavior.

## Daily wages

Keep `monthlyWage` as the advertised salary and `wageAccrued` as the complete unpaid liability. Accrue `monthlyWage / 450` per simulation second. Settle and clear all employees' accrued amounts at each day boundary, including the month boundary, exactly once. Charge the completed interval before clearing it; the new day's expense total includes that boundary settlement. Store full finite numeric precision and round only display text. Pausing adds no accrual. Hiring adds no upfront debit and accrues only subsequent elapsed time. Dismissal settles that employee's outstanding accrual once and retains the existing carrying/washing refusal.

Keep salary and settlement periods distinct in the read API: `monthlyWages` and `wagePeriodDays: 30` describe advertised salary; add `dailyWages` and `wageSettlementDays: 1` for the settlement cadence. `wagesAccrued` remains outstanding money owed. Interface text must say salary per month, paid daily, rather than imply a full month's charge each day.

A version 2 save may contain unpaid accrual from many days of the old monthly policy. Loading preserves that amount, cash and all historical expenses exactly. The first subsequent daily boundary pays old liability plus newly accrued time once, then later boundaries pay only subsequent time. Dismissal before that boundary settles the complete liability. The current validator accepts month-to-date liability up to one monthly salary at any time of day. Preserve that whole accepted range and allow the current day's new accrual above it: the ceiling is monthly salary plus monthly salary times the current day phase in seconds divided by 450, with numeric tolerance. This phase-aware bound remains valid as time advances until daily settlement; a fixed higher ceiling would merely move the overflow edge. Do not reset or cap liability to a day.

Version 1 validation and migration retain their frozen behavior. Already-paid historical wages become `monthlyWage = wage * 22.5` with zero new accrual. Do not charge them on migration or infer unpaid days from the old clock.

## Equipment and compatibility

Add catalog type `dishwasher`: Kitchen category, $150, free-standing, solid, one ground cell, `washCapacity: 5`. This is processing capacity, separate from the `capacity`/`storageKind` properties that account for shelf, fridge and cabinet stock. Do not create five dishes, grant clean inventory, reserve cabinet storage or debit supplies merely by placing the appliance.

Keep the existing `sink` type, price, IDs and graph valid. Historical kitchen sinks can finish their existing dish tasks and retain their previous washing capability. Do not convert or relocate saved objects or infer their purpose from coordinates. New furnished games use the dedicated dishwasher for kitchen dishwashing; existing saves acquire one through ordinary construction if desired. Whether the old sink remains offered in the furnishing catalog is an interface decision, not a destructive migration.

Keep save version 2. The existing serializable graph already stores every conserved dish as one record; extend only the equipment/task alternatives actually required by the agreed process. Accept old graphs without mutation. Keep the version 1 validator frozen and validate its migrated graph with the current validator. No schema bump, load-time wage payment, invented stock, new recipe, scenario or calendar policy is needed.

## Equipment job model awaiting evidence

The current loop reserves one sink and one return cabinet per dish and keeps the same employee through collection, washing and return. A five-unit contents indicator alone does not prove a five-employee washing loop, an unattended buffer, a shared timed batch or a stack that must fill before it runs. Do not implement one of those mechanisms merely to display 0/5.

After the orchestrator observes loading, cycle and retrieval, agree the smallest graph that represents those transitions. Every design must retain one live record per dish, reciprocal task owners, one reserved return slot per committed unit, persisted progress, breakage checked once and truthful occupancy. A dishwasher must reject a sixth occupied or reserved slot atomically; inaccessible/full equipment leaves dirty dishes without partial assignment or missing units. Removing or moving equipment with committed work is refused, while exact no-op moves retain the existing unchanged-success behavior. Paused saves resume the same progress and ownership without duplicate reservations, rerolls, payments or clean units.

If the bounded study cannot establish the mechanism, defer that behavioral change explicitly and implement only the independently supported wage correction after approval. A model that still handles only one dish must not claim to provide the observed five-unit capacity.

## Verification contract

Use public engine actions for construction, hiring, priorities, ordering and service. Direct fixture setup is reserved for named historic-save or invalid-record cases, with bounds stated in the test. Preserve literal version 1 fixtures and add literal pre-change version 2 snapshots for active dish phases and month-to-date unpaid accrual; generating a supposed historic fixture with the changed serializer proves only self-agreement.

Money checks cover just before/on/after a day and month boundary, partial-day hire/dismissal, pause and each speed, multiple days crossed by a capped tick, insufficient cash/bankruptcy, reload before/after settlement, old version 2 arrears and version 1 already-paid history. Assert cash, lifetime/daily expenses, individual accrual and aggregate wages independently; compare deterministic future twins after round trips.

Equipment checks follow the agreed loading/cycle/retrieval phases through actual service, validate every phase after reload and prove per-type `granted + delivered = live + broken`. Cover simultaneous work up to five slots, sixth-slot pressure, cancellation/disposal, blocked source/equipment/return paths, breakage, cabinet reservation capacity, sell/move/no-op behavior and every new malformed owner/progress/capacity record. Keep meaningful existing long-run service and historical-validation checks intact.

The orchestrator owns actual-browser input acceptance, individual appliance/panel pixel inspection, ignored-gallery comparisons, final integrated gates and independent review. No browser, server or GUI resource is allocated to this worker.

