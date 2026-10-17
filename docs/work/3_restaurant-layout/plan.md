# Outdoor layouts and furniture moving

Status: active
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

- [ ] Commit the shared action, occupancy, support and outdoor contracts before workers implement them; distinguish observations from inferred safeguards.
- [ ] Move empty and stocked storage without charges, ID changes, stock loss, queue/reservation loss or broken save graphs; move a supported parent and rehost its child coherently.
- [ ] Reject occupied, committed, unsupported, colliding and unowned destinations atomically; cancelled UI moves preserve the original object.
- [ ] Place appropriate furniture on owned grass and render its base and carried contents at the correct surface; accept legal outdoor paths and version 2 reloads without weakening frozen version 1 validation.
- [ ] Exercise Move, rotation, cancellation, failure and one-shot placement through actual headless desktop browser inputs; inspect relevant fixed/exploratory scene views and panels at 2560, 1440 and 1024 pixels wide.
- [ ] Run `npm run check`, deterministic movement/save/service probes and independent review of the final integrated revision; resolve material findings, merge/push main and remove owned worktrees/processes.
- [ ] Update the ignored visual gallery and attributed research, retaining accurate comparison bounds and washing uncertainties.

## Implementation steps

- [ ] Research outdoor and washing behavior while the engine owner proposes the bounded movement contract.
- [ ] Approve the contract, implement engine and interface scopes in isolated worktrees, then integrate in dependency order.
- [ ] Verify actual controls and pixels, obtain independent integrated review, fix justified findings and complete the fleet integration gates.

## Outcome

Pending. Record the verified revision, checks and limitations at closure.
