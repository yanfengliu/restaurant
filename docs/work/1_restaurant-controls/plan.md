# Reference controls and restaurant construction

Status: complete
Owner: Codex orchestrator
Created: 2026-10-17
Updated: 2026-10-17

## Problem and outcome

Match the observed construction interaction, room materials and compact management interface before creative departures.

## Scope

Include axis-aligned wall/floor strokes, automatic enclosed-room flooring, observed basic construction prices, entrance readiness feedback, tall brick walls, peach floors, wall visibility controls, WASD camera movement, compact dark HUD and four-column palettes. Ingredient/tableware stocks and four-priority employee scheduling are the next dependent milestone.

## Approach

Use the eighteen installed-game captures and research notes as factual baselines. Keep the serializable engine, procedural assets and neutral product identity. Engine, scene and interface workers own separate scopes; root agrees interfaces and integrates. The user narrowed the target to desktop browsers during implementation.

## Acceptance criteria

- [x] Four real pointer drags build a continuous room on bare owned land and automatically floor its interior; a door can replace a wall without losing the floor. Charges are deterministic and invalid actions preserve state.
- [x] Real desktop controls support wall/floor strokes, WASD/Shift panning, orbit, zoom and wall visibility; panels leave a usable canvas. The user explicitly removed mobile scope on 2026-10-17.
- [x] Native screenshots show compact dark bars, serif labels, gray four-column palettes, taller brick walls and peach default floors; ignored gallery comparisons are being retained.
- [x] Existing service/persistence invariants, relevant browser flows and independent review pass before merge and push to main; report remaining reference gaps rather than claiming complete parity.

## Implementation steps

- [x] Engine worker adds room detection/construction behavior and verified prices; scene worker adds stroke callbacks, pan/wall APIs and reference materials; UI worker binds them and replaces the presentation layout.
- [x] Root compares actual controls and rendered pixels against retained evidence, updates the gallery, repairs justified findings and lands the reviewed milestone.

## Outcome

The repaired product revision d5e5bd7 passes 31 simulation tests, syntax and production build. Actual inputs verified four inclusive wall strokes (28 paid segments, 36 automatic interior tiles), free wall-face door replacement, four-tile floor painting, invalid-stroke atomicity, Escape cancellation, WASD/Shift/right-drag camera controls, wall modes, price focus and paused save/reload. All 22 catalog previews loaded from real meshes. Eight fixed views, three exploratory angles and panels at desktop widths 2560/1440/1024 were inspected; ignored controls-verification.json binds their hashes. Initial harness failures were an expected software-GPU ReadPixels advisory and a wrong Facilities selector; neither is hidden as a product fix. Vite retains its bundle-size advisory.

Landed and pushed to main at 054ea93. Review rounds 0–2 retain strategic gaps and F4/F5 repairs; round 2 independently closes the input and endpoint findings at dd5b194, with later code unchanged. Claude abstained because its weekly quota was exhausted. The ignored gallery now has thirteen progress views, eighteen native observations and three combined comparison boards. Supplies, progression, material/catalog breadth and complete native service comparison continue in dependent work; ingredient/tableware deliveries are directly observed, while full cooking/payment/washing remains unverified.
