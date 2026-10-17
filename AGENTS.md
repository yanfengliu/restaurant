# Repository instructions

## What this is

Corner Table is an original, locally playable 3D restaurant management game.
The stack is Node.js 24.12.0, Vite 8.3.4, Three.js 0.186.1, and vanilla JavaScript modules.

## Fleet policy

Follow [the fleet constitution](../fleet/FLEET.md), including scoped worker ownership, independent review, and final integration gates.
Repository constraints are in [docs/policies/local-rules.md](docs/policies/local-rules.md).
The fleet sync owns any generated constitution block.

## Gates

- `npm run check`: JavaScript syntax, Node simulation tests, production build.
- `npm run audit`: dependency advisory gate after dependency changes.
- Verify changed controls through the actual browser inputs and inspect rendered pixels at desktop and narrow viewports.
- Use headless browser verification with task-owned process cleanup.

## Invariants and boundaries

- Engine state is serializable and validated on load; save schema version is 1.
- Prices, cash, path access, staff priorities, and simulation speed have explicit engine validation.
- Keep simulation logic in `src/engine.js`, catalog data in `src/catalog.js`, 3D rendering in `src/scene.js`, and interface state in `src/main.js`.
- Product names, content, geometry, interface art, and code belong to this original game.
- External research attribution belongs in `docs/research.md`.

## Conventions

Use ES modules and the smallest dependency set needed for the game.
Preserve read-only development inspection; do not expose mutable game state or direct engine actions on `window`.
