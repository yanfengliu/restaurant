# Reference controls and restaurant construction

Status: active
Owner: Codex orchestrator
Created: 2026-10-17
Updated: 2026-10-17

## Problem and outcome

Match the observed construction interaction, room materials and compact management interface before creative departures.

## Scope

Include axis-aligned wall/floor strokes, automatic enclosed-room flooring, observed basic construction prices, entrance readiness feedback, tall brick walls, peach floors, wall visibility controls, WASD camera movement, compact dark HUD and four-column palettes. Ingredient/tableware stocks and four-priority employee scheduling are the next dependent milestone.

## Approach

Use the nine installed-game captures and research notes as factual baselines. Keep the existing serializable engine, procedural assets and neutral product identity. One worker owns engine/catalog/tests, one owns scene input/rendering, and one owns UI/style/README; root agrees interfaces and integrates.

## Acceptance criteria

- [ ] Four real pointer drags build a continuous room on bare owned land and automatically floor its interior; a door can replace a wall without losing the floor. Charges are deterministic and invalid actions preserve state.
- [ ] Real controls support wall/floor strokes, WASD/Shift panning, orbit, zoom and wall visibility; narrow construction selection leaves a usable canvas.
- [ ] Native screenshots show compact dark bars, serif labels, gray four-column palettes, taller brick walls and peach default floors; update ignored gallery comparisons.
- [ ] Existing service/persistence invariants, relevant browser flows and independent review pass before merge and push to main; report remaining reference gaps rather than claiming complete parity.

## Implementation steps

- [ ] Engine worker adds room detection/construction behavior and verified prices; scene worker adds stroke callbacks, pan/wall APIs and reference materials; UI worker binds them and replaces the presentation layout.
- [ ] Root compares actual controls and rendered pixels against retained evidence, updates the gallery, repairs justified findings and lands the reviewed milestone.

## Outcome

Active from the reviewed foundation at main 5b575c9. This is an intermediate fidelity milestone; the broader requested game remains in progress. Native cooking, delivery and service completion are not yet observed.
