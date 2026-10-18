# Review 2: plan

## Target

Repository `restaurant`, the rigging correction proposal in `docs/work/5_scene-fidelity/plan.md` at recoverable commit `0331dc9dbd0d2f4b497c375da75bccc1b4c6123f`. The complete plan SHA-256 is `77ed11145a51e7072eca960dc427e55e4e65c9844a413f262295b46415f5111e`. This round reviews the revised method, file scope, export/runtime contracts and staged acceptance. It does not review prototype geometry or approve a corrective implementation. The rejected renderer remains `ebc138cd7aab414adc16b79468138e19337d7b52`, with F0 and the initial observations retained in [round 1](1_integration.md), integrated at `c970f79`.

## Reviewers and coverage

The independent Codex agent reviewed the exact committed proposal directly under the assigned fleet Astra/xhigh review pin. It reread the full retained negative integration report and checked the proposal against the known renderer callers and installed Three.js skinning/lifecycle contracts examined in that round. It verified the plan digest and read the opening metadata of the coordinator's first-pass manifest, which still records the presentation defect as open. No Blender, browser, GUI, server, runtime gate or external CLI was launched. No product file was changed.

Both optional external CLI lanes remain abstentions after automatic approval rejected their potential repository transmission. No retry or alternate transport was used. This report is independently authored direct agent review, with no attribution to absent CLI reviewers.

## Reports

### Codex independent rigging-contract reviewer

Accept this bounded proposal. No new material contract finding was found. The correction changes the representation responsible for F0: a connected body/clothing surface with useful joint topology and blended weights replaces the independent capped limb pieces. The proposal explicitly rejects joining overlapping capsules and calling the result continuous. It also requires natural rest, walking, sitting and carrying poses, so the presence of bones alone cannot satisfy acceptance. These requirements address the observed silhouette and deformation failure rather than merely renaming the current group hierarchy.

The tool choice and staging are justified. One original model is authored and inspected in headless Blender before variants and service-cast integration. Linear armature deformation matches the intended runtime method; Blender-only Preserve Volume improvement would not establish the exported result. Front, side, rear and three-quarter views, ordinary gameplay size, close views, 0°/45°/90° bends, shoulder reach, seated hips and carrying checks give concrete ways to reject gaps, beads, pinching and disconnected garments. The prototype comparison must use the rejected renderer and studied references at comparable scale, with existing table/chair and ware dimensions wherever contact or adult proportions are being judged. Approving the proposal does not approve uninspected prototype bytes.

The file expansion is proportional to this correction. A small character factory/pose module, compact local data, reviewable authoring script and one cheap export check are coherent responsibilities. The proposal excludes a general importer, asynchronous loading, new dependencies, downloaded characters, facial rigs and gameplay changes. Synchronous Vite JSON import preserves the existing scene and thumbnail call contracts. The triangle, bone, influence, draw-call and generated-text limits are explicit targets with measured reporting and reassessment on excess; they are not evidence of acceptable appearance or runtime performance by themselves.

The export contract addresses the main conversion risks: rest geometry, normals, indexed material assignments, normalized weights, named parent-local transforms, inverse binds, one coordinate conversion, and a fixed cross-tool posed-landmark fixture. Comparing Blender's posed landmarks with actual Three.js bone-transformed vertices gives an independent check against axis, bind and weight mistakes. The check must use that retained external expected result rather than regenerate both sides from the same exported transforms. Its numerical bounds and finite input validation remain separate from the visual disqualifiers, as the proposal requires.

The runtime and lifecycle requirements cover the concrete integration hazards identified in round 1. Each actor, HIRE preview and thumbnail gets independent bones, skeleton and pose state, avoiding the skeleton sharing in ordinary SkinnedMesh copies. Geometry and material ownership is explicit so preview cleanup cannot invalidate a live actor. The accepted identity ancestor and hand attachment preserve the unchanged selection traversal and ware parenting (`src/scene.js:722`, `src/scene.js:590` at the rejected baseline). Skeleton/bone-texture disposal supplements the existing geometry-only removal path (`src/scene.js:368`). The inspected conservative pose envelope and posed detail/thumbnail bounds must cover blends and actual triangle selection, not just the rest mesh.

Driving gait from displayed travel, freezing locomotion while paused, and limiting root adjustment to visual contact alignment are sensible corrections for plausible motion while keeping engine coordinates authoritative. The retained service and desktop checks remain necessary after integration: a Blender prototype does not establish hand-held ware presentation, game selection, thumbnail framing, grass/floor grounding, or resource behavior in the browser. Representative actor-count/frame behavior and repeated actor/preview/thumbnail cleanup will bound the runtime claim. The proposal requires those checks without treating the existing 78 simulation tests as proof of natural animation.

F0 remains open. The earlier atmosphere improvements and functional first-pass evidence are preserved, while the initial positive appearance assessment stays explicitly superseded. The next useful decision is acceptance or rejection of one prototype's exact geometry, weights and posed images. Do not multiply variants or promote the full runtime correction while the mannequin disqualifiers remain.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Existing characters retain mannequin-like body and joint forms. | Still open; accepting the corrective method does not resolve the defect. | Inspect and accept the one-model prototype's exact bytes and poses, then review the integrated correction and actual-input evidence. |
| — | No new material issue in the revised contract. | Independent recommendation: accept the bounded method, file expansion, export/runtime contracts and staged acceptance. | Coordinator may proceed with the authorized prototype stage. |

## Verification

The reviewer merged the recoverable proposal commit into its isolated branch, verified the complete plan digest, and confirmed that the integrated round-1 report matches its previously authored report. The fleet work-document checker passed for all six units, and source plus plan contents match the reviewed target. The earlier pixel captures remain evidence of the rejected renderer; no new rig pixel or runtime result is claimed here. This documentation-only review does not duplicate the product gate or change the state of the open defect.

## Round outcome

Accept the rigging correction proposal at `0331dc9` with no new material plan finding. F0 remains open through the prototype and corrective implementation stages. Prototype-byte approval, numerical export checks, actual game views and motion, lifecycle verification, the final integrated gate and independent review remain required before closing M5.
