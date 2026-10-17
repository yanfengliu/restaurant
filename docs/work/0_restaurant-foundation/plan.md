# Corner Table playable restaurant foundation

Status: active
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

Active. Integrated candidate 79f3d2a builds and passed 22 simulation checks, including 8,000 sequential active saves; dependency audit reported zero vulnerabilities. Browser inputs verified natural service/payment, placement, rotation and pause. Two independent review rounds are retained; occupied-facility removal, save-failure preservation and camera-copy repairs are awaiting final integration and review. An immediate post-placement demolition probe initially ran before the new mesh rendered; the stable rendered hit is being rechecked before treating that probe as a product defect. The reference was installed during this session; a separate worker owns direct native gameplay study. The ignored gallery is informational and no deployment is requested.
