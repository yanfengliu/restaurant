# Stock, service and employee priorities

Status: active
Owner: Codex orchestrator
Created: 2026-10-17
Updated: 2026-10-17

## Problem and outcome

Make the observed equipment, ingredient and tableware prerequisites govern a complete service loop, with employees choosing among four task priorities.

## Scope

After milestone 1, add cabinet-supported countertop appliances, storage-limited stock, recurring ingredient batches charged on delivery, prepaid/refundable tableware queues, reusable dishes and washing, recipe dependency feedback, generic employees with four task priorities, candidate skills and monthly wages. Include the calendar conversion needed for deliveries and payroll; the earlier 480-second day would make a ten-day shipment take eighty minutes. Keep valid version 1 saves loadable. Broader catalog and scenario progression follow separately.

## Approach

Engine/catalog/tests, interface, and scene each retain separate owners; root agrees shared actions and save migration before implementation. The quiet native follow-up verified deliveries, queue refunds, support requirements and the blank/up/X/down priority cycle. Use those captures and primary developer descriptions, separating observed mechanics from inferred scheduling, capacities and service timing; a complete native meal/washing cycle remains unverified.

## Acceptance criteria

- [ ] A player can equip storage and kitchen, choose quantities, receive capacity-limited supplies, enable a recipe only when its prerequisites are met, serve and collect payment, then collect and wash used tableware; shortages visibly stop further preparation.
- [ ] Four independently adjustable employee task priorities and three candidate skills affect actual task selection, walking, food quality and breakage; wages have a coherent displayed period.
- [ ] Saves preserve inventories, active orders, dirty dishes, deliveries and employee priorities; malformed graphs fail safely and valid earlier saves migrate without silent loss.
- [ ] Actual desktop browser controls pass; rendered desktop views are inspected and compared with explicit observed matches, differences and unverified bounds. The ignored gallery, deterministic tests and independent review are complete before main merge/push; mobile is outside the user's scope.

## Implementation steps

- [ ] Root settles storage/delivery/task/save interfaces from evidence; scoped workers implement and verify the connected service loop.
- [ ] Root exercises purchasing through washing and interrupted saves, compares evidence, resolves reviewed defects, and lands the milestone.

## Outcome

The construction milestone is landed at 37d1dc9. Root approved the [shared design](design.md) for focused independent review before implementation. Fifteen simulation seconds per calendar day, ten-day ingredient cadence and five-day tableware transit are inferred defaults bounded by the native date snapshots; recurring batches and their transaction rules were directly observed. Complete reference parity remains unverified.
