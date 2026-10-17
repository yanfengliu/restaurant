# Review 1: integration

## Target

Repository `restaurant`, integrated product revision `c97757cea052c6561c1d5f1f01f2f6c748ccdf0e`, reviewed against `32502067a95317d51a147fcea51d649a3984e189`. Scope: the construction milestone's engine/catalog changes, version-1 save compatibility, tests and contract; wall/floor rendering, input, catalog previews and disposal; UI bindings, styles and README. Review checkout: branch `codex/review-controls-integration`. Later uncommitted desktop-only policy/plan edits were context, not reviewed product changes. Worker repairs after this target are outside this round.

## Reviewers and coverage

Codex reviewer `gpt-6-astra`, reasoning effort `xhigh`, independently read the integrated source, exercised eight targeted Node tests and bounded engine/geometry probes, and inspected two owner-generated scene/catalog images. The image tool delivered those 2560×1440 files at 2048×1152, so this reviewer does not claim native-resolution pixel acceptance. No browser, server or native game was launched by this reviewer; actual pointer-flow and wider visual results below are attributed to the integration owner.

The canonical multi-CLI runbook was applied. Installed versions were Codex CLI 0.158.0 and Claude Code 2.1.281. The pinned Claude `claude-opus-5-5[1m]` smoke resolved that model but returned API 429, weekly quota exhausted, with no model usage or code review. That lane abstains. A sandbox-network attempt retried without completion; its exact task-owned process tree was terminated after sandbox permissions blocked cleanup. The permitted network smoke then exited normally. This report is independent Codex coverage, not a two-reviewer approval.

## Reports

### Codex: gpt-6-astra, xhigh

Two material scene/input defects remain. The finite milestone should not be accepted at this revision, although the construction state and accounting changes passed the checks described below.

**F4 — P2: use the clicked structural object's tile when replacing a wall with a door.** At `src/scene.js:437-450`, picking discovers a hit object's ID, but line 448 substitutes the object's actual coordinates only when the active tool is neither `FLOOR` nor `PLACE`. Consequently the door tool discards the clicked wall's location and uses the ray's intersection with the ground plane. `src/main.js:100-102` dispatches that cell, and the engine permits a standalone door there. With the new tall walls, a normal click on a visible wall face can put the door behind the wall, consume the first-door grant, and leave the room without an entrance.

Reproducer using the default camera: on an empty plot, enclose x=9–15, z=6–12, choose the doorway, and click the face of wall (12,6) around world point (12.5,1.4,6.41). A Three.js camera/ray probe gives ground point (11.51912,0,7.39088), so the current picker dispatches tile (11,7). Public placement succeeds with a free door at (11,7); the wall at (12,6) remains, and `hasEntrance` stays false. This calculation used the target's camera values and Three.js 0.186.1; it was not a browser-input test. Independently, the integration owner reproduced the same defect with real pointer input: four wall drags enclosed x=9–16, z=8–15; a face click at screen (799.19596,533.53355) left wall (12,8) unchanged and created the free door at (11,9). The owner retained `output/playwright/wall-face-before.png`, `wall-face-after.png`, and `wall-face-check.js` as ignored evidence.

For a valid wall/window replacement, resolve both hover preview and placement from the hit host segment. Keep the ground-plane behavior for placement on empty land. Recheck visible faces from multiple camera directions and after hiding/lowering walls, rather than only clicking the tile-center projection on the ground.

**F5 — P2: retain a perpendicular wall connection when renovation leaves only one neighbor.** `src/scene.js:179-182` constructs neighbor-directed wall arms only for two or more connections. A single connection falls back to a full panel along the object's stored rotation. Shared-corner strokes intentionally preserve the original object's rotation (`src/engine.js:141-142`), so after one corner branch is removed, that rotation can be perpendicular to its remaining neighbor. The engine still blocks adjoining cells, but the rendered wall has a visible hole.

Reproducer on an empty plot: draw a wall row through (6,6), (7,6), (8,6); draw a column through (6,6), (6,7), (6,8); then remove (7,6). Corner (6,6) remains at rotation 0 with its only connection toward +z. Evaluating the target's actual model-construction functions with Three.js gives the corner's maximum z as 6.635 and the next segment's minimum z as 6.9875: a 0.3525-tile gap even including the trim. The brick bodies have a 0.41-tile gap. This is a geometry measurement, not an independently rendered screenshot. Honor a lone perpendicular connection while preserving meaningful orientation for genuinely isolated walls; verify endpoints after both branch removal and extension, with reversed strokes and rotations.

**F0 — engine portion resolved; integrated input/rendering needs F4/F5 repairs.** The earlier construction-contract risk was addressed by separate structural flood-fill and walking blockers (`src/engine.js:87-121`), whole-stroke validation before spending (`134-162`), and retention of existing floors. Door replacements preserve the host ID/alignment and actual purchase cost; first-door history survives sale and save/load. The documented fallback for older saves with unknown sold-door history is explicit. Eight targeted tests pass. An additional adjacent-room probe confirmed retained custom floors and a paid interior second door, and active-service renovation remained serializable. F4/F5 are separate, concrete failures in connecting those state semantics to the 3D surface.

The reviewed design remains appropriately small. The existing path and task reset implementation at `src/engine.js:461-482`, outside changed hunks, was read because every accepted structural edit calls it. No additional material engine/save issue was reproduced in the bounded checks. This is not proof against every possible world arrangement.

The catalog now renders actual model/floor geometry rather than separate illustrative SVGs. `src/scene.js:541-572` caches the result by type/color/floor style, reuses a single 160×160 target, and releases temporary geometry and the private shadow material in `finally`. Existing shared materials remain owned by the scene and final disposal also frees the render target and cache (`607-612`). The state restoration is adequate for the actual public call path, which renders the world to the default framebuffer. No material cache/disposal fault was found by source inspection; GPU memory and performance were not measured. The owner's software-rendered browser emitted one `GPU stall due to ReadPixels` warning while generating previews. Synchronous readback occurs on cache misses, so retain this as a performance advisory rather than claiming a warning-free run or asserting corruption from the warning alone.

The compact bars, gray four-column construction panel, peach flooring and taller brick perimeter are visible in the inspected images. They support this milestone's direction; they neither establish complete fidelity nor close the strategic supply/progression/catalog gaps F1–F3. The README describes a desktop browser game and the controls actually being implemented. No mobile acceptance is claimed.

## Findings and disposition

Owner decisions are separated from the authored report above. IDs continue from round 0.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Shared construction topology and atomicity contract | Engine behavior verified in this round; integrated acceptance remains pending the concrete scene/input findings. | Recheck the final integrated revision after F4/F5. |
| F1 | Supplies, reusable tableware and four priorities | Strategic follow-up remains outside this finite construction milestone. | Next dependent gameplay milestone; distinguish direct observation from public descriptions. |
| F2 | Calendar, economy and tiered progression | Strategic follow-up remains outside this milestone. | Align after the service lifecycle is established. |
| F3 | Representative material/furnishing families | Follow-up remains open; actual-model previews improve one part of this recommendation. | Add the planned families without claiming this milestone supplies all variants. |
| F4 | Visible wall-face click can place a door on the wrong tile | Accepted for repair by the integration owner after a real-pointer reproduction; open at the reviewed target. | Scene worker assigned; focused review and actual-face input checks required. |
| F5 | A remaining perpendicular neighbor leaves a wall gap | Accepted for scoped scene repair by the integration owner; open at the reviewed target. | Verify one-neighbor joints after edits and retain isolated-wall rotation behavior. |

## Verification

- Eight targeted tests passed with `node --test --test-name-pattern='basic construction|four inclusive|construction strokes|single placement|window rooms|construction readiness|floor strokes|v1 saves' tests/engine.test.js`. They cover deterministic costs, shared corners, invalid-stroke atomicity, room flooring, custom floors, door grants, access readiness and compatibility validation.
- Additional public-action probe: enclose x=6–14, z=6–10, add a divider at x=10, add an exterior door at (8,6), paint (7–9,7) checker, add a paid second door at (10,8), then open a wall at (6,8). Floors and save round trips stayed consistent. The probe initially expected 18 floors; that expectation was corrected to 21 because flooring created before the divider must remain underneath it. This was a probe expectation error, not a product failure.
- Additional active-service probe: 320 quarter-second ticks, alternating a four-cell wall stroke at (15–18,18) with removal every 16 ticks. Twenty renovation batches and every immediate save round trip passed; two guests were served.
- Source-extracted Three.js geometry and camera probes confirmed F4/F5 with the pinned inputs above. An initial import attempt found no dependencies in the review worktree; the successful probe read the already-installed Three.js package in the integration worktree. Nothing was installed.
- Owner-attributed evidence at `c97757c`: all 31 Node tests and build passed; desktop controls, invalid strokes, Esc cancellation, input focus and catalog loading passed; wider visual inspection used fixed and exploratory angles. The owner also reported the preview readback warning and the separately confirmed F4 failure. These results are not presented as checks run by this reviewer.
- Independently inspected image bytes: `output/playwright/controls-catalog-2560.png`, SHA-256 `93119e3118c2b10e5f80c86126e58233c5fde1171e7c0fcc15136a664b12216d`; `output/playwright/controls-cutaway-2560.png`, SHA-256 `d7c03d7396c3d2d8fd6de1a3063d3fe2b1b61af80de432c9c0f7ca46a6a25302`. Display-resolution limitation is recorded above; the files remain ignored evidence.
- `git diff --check` passed. The work-document checker refused the exact-target checkout because its registry conflicts with the shared local allocation witness. No allocation records were changed by this reviewer; the owner was notified to run the structural check in the up-to-date integration checkout after carrying this report.

## Round outcome

Do not accept `c97757c` as the final construction milestone while F4 and F5 remain open. Repair and independently re-review those focused paths on the next exact integrated revision. F1–F3 remain explicitly scoped future work, not hidden completion claims. Claude coverage was unavailable; the report preserves the independent Codex findings and bounded passing evidence without inventing agreement.
