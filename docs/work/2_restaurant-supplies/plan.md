# Stock, service and employee priorities

Status: complete
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

- [x] A player can equip storage and kitchen, choose quantities, receive capacity-limited supplies, enable a recipe only when its prerequisites are met, serve and collect payment, then collect and wash used tableware; shortages visibly stop further preparation.
- [x] Four independently adjustable employee task priorities and three candidate skills affect actual task selection, walking, food quality and breakage; wages have a coherent displayed period.
- [x] Saves preserve inventories, active orders, dirty dishes, deliveries and employee priorities; malformed graphs fail safely and valid earlier saves migrate without silent loss.
- [x] Actual desktop browser controls pass; rendered desktop views are inspected and compared with explicit observed matches, differences and unverified bounds. The ignored gallery, deterministic tests and independent review are complete before main merge/push; mobile is outside the user's scope.

## Implementation steps

- [x] Root settles storage/delivery/task/save interfaces from evidence; scoped workers implement and verify the connected service loop.
- [x] Root exercises purchasing through washing and interrupted saves, compares evidence, resolves reviewed defects, and lands the milestone.

## Outcome

Merged and pushed at 405a02f, with final product ed9198c. Version 2 stock, deliveries, reusable ware, washing, employee skills/priorities and monthly payroll passed 53 tests and production build. Actual desktop inputs verified construction through payment and clean return, active meal/washing save reloads, and same-order shortage recovery. Desktop captures cover 2560/1440/1024 widths; fixed/exploratory views, key panels and all 37 model previews were inspected. The ignored gallery retains comparisons and hashes. [Final independent review](reviews/3_integration.md) closes F0–F6; Claude was unavailable through weekly quota. No remote CI is configured; the existing 691.24 KB bundle advisory remains. Native complete service, exact timing/economy and wider parity remain unverified. Outdoor placement/moving, one-shot furnishing and opening progression are next bounded fidelity work.
