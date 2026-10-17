# Outdoor layouts and furniture movement

Status: approved by the orchestrator on 2026-10-17; implementation in progress.
Owner: engine worker, with interface and scene consumers coordinated by the orchestrator.
Base: `f73de59`.

## Outcome and evidence boundary

Allow furnishing and staffing owned bare ground. Movement keeps the purchased object and its contents rather than selling and buying it again. The orchestrator approved outdoor placement for every item, outdoor staff placement and outdoor dining based on primary developer evidence. Attribution and native comparison details belong in `docs/research.md`. Occupancy and task safeguards below are implementation decisions to preserve valid service graphs; their exact native behavior is not yet established.

## Shared action contract

`MOVE { id, x, z, rotation? }` relocates one existing object, including walls, windows and doors. Coordinates must be integer cells inside owned land. An omitted rotation preserves the current rotation; a supplied rotation must be a finite number and normalizes to the nearest quarter turn, like placement. Movement itself creates no charge, refund, event, ID allocation or random draw; ordinary renovation consequences below still apply. A moved door preserves its actual purchase cost and the first-door grant history.

A ground object needs an empty ground cell, ignoring itself and its own supported child. A cabinet carries its supported appliance to the same coordinates and rotation. Moving an appliance independently requires a compatible cabinet at the destination with no other child; its `parentId` changes and it inherits the destination cabinet's rotation. A supplied appliance rotation is validated but cannot override support alignment. Moving onto the current support is an unchanged success. A ground move to identical coordinates and normalized rotation is an unchanged success, including for an occupied object. Invalid coordinates, rotation or support still reject before this no-op decision.

A real move rejects if any current guest or employee occupies the destination's rounded tile. This avoids relocating actors as a side effect of placing furniture beneath them. An empty path tile is legal; the renovation mechanism replans the actors' routes after acceptance. This destination rule applies to the supported appliance as well, although its existing solid cabinet normally prevents occupancy.

## Protected furniture

Validate every member of the moving group before mutating either parent or child. Refuse a real move when an object is:

- A table or chair reserved by a guest who is not leaving.
- A toilet adjacent to a toilet guest's current position after arrival, or their path endpoint before arrival. This conservatively protects either of two adjacent toilets when the guest's model has no explicit toilet ID.
- An order's committed source, including a ready meal in transit, or an employee's current task target or reserved sink.
- A dirty dish's location or the sink holding a washing dish.

Clean dishes and ingredient stock stay attached to their storage ID and do not prevent movement. Prepaid tableware entries keep their cabinet ID, quantity and existing deadline. Wash return reservations keep their cabinet ID and do not prevent movement unless an employee is already returning to that cabinet as their current task target. Other stages resolve the moved cabinet's coordinates when they later begin their return route. Moving a cabinet with an active supported appliance rejects, even if the cabinet itself has no active link.

These movement checks do not relax storage-sale rules. A stocked, prepaid or reserved store still cannot be sold.

## Atomicity and renovation

Finish all validation before writes. Rejections preserve the complete serialized state, including events, money, supplies, random seeds and `nextId`. Accepted moves change object coordinates/rotation/parent where relevant and trigger existing renovation effects. They preserve object order, purchase cost, ID, supply ownership, quantities, delivery deadlines, wage accrual, cash and financial totals. Capacity is unchanged.

After a structural move, call the existing `floorEnclosedRooms` once: former floors remain and any newly closed boundary gains only its missing interior peach floors at no charge. MOVE never replaces a destination wall or window, unlike a newly placed door. Call `rebuildPaths` once after moving the complete group. This invalidates the access cache, replans guests and employees and preserves carrying links and wash-return reservations when a route becomes blocked. Existing renovation behavior may make an arriving guest leave when their chair becomes unreachable, updating their happiness, lost statistics and departure event/ID sequence. These effects remain observable on a real accepted move; only rejected moves and exact no-ops guarantee full byte identity. Do not create a second pathfinding implementation or change service timing.

## Outdoor behavior and persistence

Remove the floor prerequisite from PLACE and HIRE. Keep owned-land, world bounds, guest collisions, support requirements, costs and staff limits. Floors remain independently purchasable, structural closure still creates interior floors, and room/entrance status retains its existing meaning.

Dining seats require an adjacent table and chair without a floor prerequisite. Entry and all actor paths already cross bare ground, so no pathfinding allowance is needed. Update the corresponding warning and the version 2 guest-seat validator. Do not change the frozen version 1 validator, its old floor-dependent reserved-seat rule, literal migration fixtures or the schema version. Existing version 2 saves remain valid; newly valid outdoor guests reload and continue normally.

`getStats.hasUsableSeating` reports whether at least one dining chair has an entry route. Engine enclosure advice and the interface construction hint use this same field: usable outdoor service does not require a room or door, while blocked seats still receive route advice. Existing `hasRoom`, `hasEntrance` and `buildingReady` telemetry remains unchanged.

No new furniture types, prices, opening budgets, scenarios, dishwasher behavior or timing changes enter this work unit.

Wall art keeps its authored height and face offset only while a nearby wall supports its mount. Otherwise a clock or painting rests its measured geometry base on the current grass or floor surface. Placed objects and destination ghosts share the same mount calculation, and moving a wall or art or adding flooring reevaluates that placement. This is a placement consistency safeguard; corresponding native visual behavior remains unverified.

## Verification bounds

Engine checks use public actions except deliberate malformed-save mutations. Pin full snapshots before every rejected MOVE. Cover missing IDs, nonfinite rotations, fractional/unowned cells, occupied/colliding/unsupported destinations, parent+child active protections, no-op identity and empty versus stocked moves. Move structural segments to open and close a boundary; verify free interior flooring, preserved old floors, moved door cost/grant and collision rejection instead of destination replacement.

Exercise incoming tableware before arrival, clean ware after arrival, a return reservation during collection/washing, refusal during the final return, source/dirty/sink protections, exact state round trips and deterministic future continuation. Compare cash, expenses, all stock and ware IDs, delivery records, sequence and random seeds across moves. A mixed renovation/service sequence must repeatedly serialize, validate, reload and reach completed service with conserved dishes.

Exercise a complete restaurant and staff placement on bare owned land without synthesizing floors. Confirm guests reserve, eat, pay and wash; load its outdoor guest states. Corrupt a literal version 1 guest save by removing its reserved seat floor and require rejection, proving the migration gate remains strict. The interface owner and orchestrator cover actual browser controls, cancellation, one-shot tools, grounded geometry and desktop pixels.

## Risks and mitigations

The guest model does not persist toilet IDs, so target-adjacency protection is deliberately conservative. Active tasks on a supported child must protect its parent move too. Cabinet reservations reference IDs rather than coordinates, so preserving them is safe only if every later route uses the current object and replanning runs after the group mutation; targeted tests must establish both cases. Accepting outdoor guests extends the existing version 2 validator but must never flow backward into the frozen version 1 validator. UI ghost validation is advisory; dispatch remains authoritative when simulation activity changes a move's validity between pointer selection and release.
