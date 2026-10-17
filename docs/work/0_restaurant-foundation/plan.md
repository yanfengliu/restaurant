# Corner Table playable restaurant foundation

Status: complete
Owner: Codex orchestrator
Created: 2026-10-17
Updated: 2026-10-17

## Problem and outcome

Build Corner Table, an original locally playable 3D restaurant management game informed by public design research.

## Scope

Include building, furnishing, animated service, menu pricing, employee priorities, hygiene, finances, expansion, scenarios and saves; user chose a browser game and emphasized visual accuracy and developer-blog research.

## Approach

Use Vite, plain JavaScript and procedural Three.js assets; share a serializable engine contract across isolated simulation, scene and interface workers based on 0778a21; root owns integration and acceptance.

## Acceptance criteria

- [ ] Research requested developer post and inspect its actual images; retain source attribution in research documentation only.
- [ ] Playable 3D building and management controls affect a coherent service simulation; original names and assets throughout product code and commit messages.
- [ ] Build, meaningful simulation tests, dependency audit and headless browser flows pass; visually inspect fixed and randomized camera views plus narrow layouts.
- [ ] Independent integrated review has no unresolved material findings; merge and push to main, then clean owned resources.
- [ ] Keep an ignored visual gallery with dated changes and reference comparisons; compare observed gameplay and pixels against the installed reference while preserving original product identity.

## Implementation steps

- [ ] Simulation worker owns catalog, engine, contract and tests; scene worker owns rendering and procedural models; interface worker owns setup, controls and research notes.
- [ ] Root integrates in codex/restaurant-game, verifies actual flows and visual evidence, obtains review and closes worktrees.

## Outcome

Foundation checkpoint merged and pushed to main at 5b575c9; product code was verified at f48688d. All 23 simulation checks, including 8,000 sequential active saves, syntax checks and production build passed; dependency audit reported zero vulnerabilities. Browser inputs verified natural service/payment, placement/rotation, 60% refunds, floor painting, menu prices/toggles, hiring/priorities/dismissal, six challenges, exact save/load/reload, malformed and empty-save retention, explicit recovery, Shift panning and right-button orbit. Five fixed and three exploratory views plus 1024px and 390px layouts were inspected; the current console had zero errors and warnings. The immediate demolition probe was corrected to wait for rendered geometry and then passed. Independent review rounds 0–2 are retained; F0–F3 are closed. Nine native reference states were captured and compared; native service completion remains unobserved. Full reference fidelity remains the ongoing goal, with controls, construction, visuals and supplies identified for subsequent milestones. The gallery remains ignored and informational. No remote CI is configured and no deployment was performed.
