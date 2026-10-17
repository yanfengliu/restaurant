# Stock, service and employee priorities

Status: planned
Owner: Codex orchestrator
Created: 2026-10-17
Updated: 2026-10-17

## Problem and outcome

Make the observed equipment, ingredient and tableware prerequisites govern a complete service loop, with employees choosing among four task priorities.

## Scope

After milestone 1, add storage-limited stock, configurable deliveries, reusable dishes and washing, recipe dependency feedback, generic employees with serving/cooking/dishwashing/cleaning priorities, candidate skills and monthly wage display. Keep valid version 1 saves loadable. Broader catalog, calendar and scenario progression follow separately.

## Approach

Engine/catalog/tests, interface, and scene each retain separate owners; root agrees the shared actions and save migration before dispatch. Use direct captures and primary developer descriptions, clearly separating observed mechanics from inferred timing. Native completion study is pending a quiet desktop window after two input interruptions.

## Acceptance criteria

- [ ] A player can equip storage and kitchen, choose quantities, receive capacity-limited supplies, enable a recipe only when its prerequisites are met, serve and collect payment, then collect and wash used tableware; shortages visibly stop further preparation.
- [ ] Four independently adjustable employee task priorities and three candidate skills affect actual task selection, walking, food quality and breakage; wages have a coherent displayed period.
- [ ] Saves preserve inventories, active orders, dirty dishes, deliveries and employee priorities; malformed graphs fail safely and valid earlier saves migrate without silent loss.
- [ ] Actual desktop browser controls and rendered views pass comparison, ignored gallery is updated, relevant deterministic tests and independent review pass before main merge/push; mobile is outside the user's scope.

## Implementation steps

- [ ] Root settles storage/delivery/task/save interfaces from evidence; scoped workers implement and verify the connected service loop.
- [ ] Root exercises purchasing through washing and interrupted saves, compares evidence, resolves reviewed defects, and lands the milestone.

## Outcome

Planned; implementation waits for the reviewed construction milestone and the shared contract. Complete reference parity remains unverified.
