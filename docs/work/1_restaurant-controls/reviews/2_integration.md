# Review 2: integration

## Target

Repository `restaurant`, exact integrated revision `dd5b19403693eab6c1171e0d21eb03aef1bcd889`, compared with round 1's `c97757cea052c6561c1d5f1f01f2f6c748ccdf0e`. Product repair: scene commit `621e45c`, integrated as `d5e5bd7`; the target additionally carries the prior report and the next work-unit allocation. Scope is the F4/F5 repairs and any coverage invalidated by their 13-line scene diff. Engine/catalog/UI/bootstrap/styles are unchanged from the preceding reviewed product. Review branch: `codex/review-controls-focused`.

## Reviewers and coverage

Independent Codex reviewer `gpt-6-astra`, reasoning effort `xhigh`, inspected the exact repair and its surrounding picking, model construction, hover, and engine replacement paths. Source-extracted Three.js probes exercised the actual model builder and picker without starting WebGL or a browser. This review did not launch a server, browser, native application, or second reviewer process.

Claude remains an abstention: the same-day pinned smoke documented in round 1 returned a weekly-quota API 429 and no code-review report. It was not retried for this focused change. Prior substantive review and limits remain retained in `1_integration.md`; they are not replaced by this round.

## Reports

### Codex: gpt-6-astra, xhigh

**F4 is fixed at this revision.** `src/scene.js:453-455` recognizes a door placement over an actual wall/window hit and uses that host's coordinates. Other placement and flooring tools retain ground-plane picking. `src/scene.js:413-415` also positions the ghost at the resolved tile and applies the host's stored rotation. This matches the unchanged engine replacement block at `src/engine.js:155-157`, outside the repair diff: it preserves the host ID and rotation while changing its type and purchase cost. Empty-land doorway placement continues to use the selected rotation.

The actual repaired `pick()` source was invoked with Three.js raycasting against meshes built by the target's actual `model()` function. Eight cases passed: wall and window hosts, rotations 0° and 90°, each at full height and the existing 0.13 low-wall scale. Each projected face click returned the hit host's ID and tile (12,8), rather than the ground cell behind it. This establishes the geometry/picking behavior, not DOM event delivery. The integration owner independently reran the identical real-pointer failure from round 1 at screen (799.19596,533.53355): object-5 became the door at (12,8), its recorded purchase cost was zero, cash did not change, and no extra door appeared at (11,9).

**F5 is fixed at this revision.** `src/scene.js:182-185` now aligns a one-neighbor wall panel with a perpendicular local-z neighbor. With no neighbor it keeps the stored orientation; two or more neighbor arms retain their previous behavior. Repeating the exact round-1 geometry reproduction—row (6–8,6), column (6,6–8), remove (7,6)—changed the gap from +0.3525 tiles to approximately −0.025 tiles including trim. The negative value represents the intended trim overlap. Twenty axis checks passed across stored rotations 0°, 90°, 180°, 270°, each with no neighbor or one of the four local cardinal neighbors.

The repair changes derived wall geometry, not serialized object rotation. A renovated endpoint may therefore have a neighbor-derived beam direction different from its stored orientation. Door replacement continues to use the stored orientation, and its preview now displays that orientation before commitment. No save rewrite or changed door-alignment contract is implied. The examined change removes the reported wall gap without introducing a new material correctness issue.

The integration owner also exercised the exact F5 renovation through two real pointer strokes and a Delete click on the visible face of (7,6), then zoomed and Shift-panned for inspection. The owner reported the surviving (6,6–8) run's cap and brick body continuous, while (8,6) remained correctly isolated across the deliberately removed tile. Evidence is retained as ignored `output/playwright/wall-endpoint-renovated.png`. This visual result is attributed to the owner; this reviewer independently measured the model geometry.

No new material finding was identified in the focused diff. The repairs do not change money, save validation, simulation timing, stroke accounting, enclosure topology, thumbnail caching/readback or renderer disposal. Their existing coverage and explicitly recorded limits remain applicable. In particular, this review does not convert the previous software-GPU readback advisory into a warning-free performance claim.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Construction topology, floors and atomicity contract | Resolved for this milestone using round-1 engine checks and the repaired integrated scene/input paths. | Integration owner completes the final gate on the final candidate. |
| F1 | Supplies, reusable tableware and four priorities | Strategic future work; not a completion claim of this finite milestone. | Work unit 2 and subsequent evidence-backed gameplay work. |
| F2 | Calendar, economy and tiered progression | Strategic future work outside this milestone. | Follow the established progression priorities. |
| F3 | Representative material/furnishing families | Strategic future work; actual-model thumbnails address only preview fidelity. | Continue catalog/material work without claiming complete reference parity. |
| F4 | Wall-face door placement targets another tile | Closed by the focused source/raycast review and owner-attributed identical real-pointer regression check. | Repaired product included in `dd5b194`. |
| F5 | Single perpendicular wall neighbor leaves a gap | Closed by the original geometry reproduction, axis cases and owner-attributed real renovation/pixel check. | Repaired product included in `dd5b194`. |

## Verification

- `node --check src/scene.js` passed at the exact target.
- Source-extracted Three.js 0.186.1 probes: eight actual-picker host cases passed; the original endpoint gap closed; twenty endpoint/isolated orientation cases passed. Geometry probes used the existing integration worktree dependency installation and did not install anything. The public-action geometry setup also round-tripped through the unchanged save validator.
- The final repair is scene-only, so the preceding eight targeted construction tests and bounded active-service/save probes were not needlessly repeated. The owner's final complete gate is separate from this focused review and was pending when this report was authored.
- The work-document checker passed with three allocated work units, resolving the preceding checkout's allocation-witness mismatch. `git diff --check` passed. Only this report was authored in the review worktree.
- No task-owned browser/server/native processes exist from this review. The prior Claude smoke processes were already stopped; their now-unneeded task-specific raw smoke directory was removed after the substantive quota outcome was retained in round 1.

## Round outcome

No unresolved material finding remains in the reviewed construction milestone at `dd5b19403693eab6c1171e0d21eb03aef1bcd889`. F4/F5 are closed, with source/geometric evidence kept distinct from the owner's actual-input and pixel checks. The integration owner can proceed to its final acceptance gate and landing. This verdict does not complete the broader game request or close strategic follow-ups F1–F3; Claude review remains unavailable.
