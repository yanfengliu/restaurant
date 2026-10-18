# Character proportions and scene atmosphere

Status: active
Owner: Codex orchestrator
Created: 2026-10-18
Updated: 2026-10-18

## Problem and outcome

The current actors have short box torsos and limbs, while the studied pixels show taller adult silhouettes, rounded shoulders and limbs, and distinct clothing and hair masses. The scene is also brighter and more yellow-green, with conspicuous repeating ground patches and hard dark shadows. Bring those visible features closer to the studied appearance through original procedural geometry and restrained material and lighting changes, while preserving the working restaurant service loop.

## Scope

The `scene-fidelity` worker owns `src/scene.js`: actor geometry, proportions, outfits, hair, standing/walking/seated/carry poses and anchors, plus scene light, shadow, palette and ground appearance. Include only the smallest coherent art increment. Preserve the current buildings, furniture, street layout, camera defaults and controls; broader environment modeling and creative departures are later work. No engine, catalog, interface, dependency, save, RNG, money, pathfinding or simulation changes.

The orchestrator owns the canonical plan and registry, reference attribution in `docs/research.md`, actual-input headless browser acceptance, ignored comparison gallery, integrated gates and final review. The worker proposes this plan before product edits and waits for direction; no browser, server or GUI is allocated to the worker. An independent reviewer assesses the direction and exact integrated change.

## Approach

Use base `3c659e49f83b88b41dc55a65fb262f59138a7f19` in `.worktrees/scene-fidelity`. Inspect original-resolution evidence before editing: `output/reference-study5/21-cycle-transition-01.jpg`, `27-cycle-transition-07.jpg` and `04-dishwasher-empty-five-capacity.jpg`; compare current `output/gallery/63-service-room.png`, `56-four-dishes-waiting.png` and furnished `30-furnished-supplies-room.png`. These show the intended direction, not measured dimensions or a claim of full parity. Retain observed differences and remaining uncertainty in the orchestrator's comparison evidence.

Author a compact articulated adult model using rounded or tapered torso, pelvis, limb and head forms, with simple shoe, sleeve, collar/apron and hair shapes. Aim initially for roughly 1.65–1.75 world units above the support surface against the existing 0.84-unit table height; tune the inferred proportion from rendered comparisons rather than treating it as a native measurement. Preserve deterministic appearance from existing actor data. Use hip, knee, shoulder and elbow pivots where needed so walking does not swing whole limbs about their centers, seated hips meet the chair with bent knees and feet near the floor, and carried ware meets the hand without clipping the torso. Use existing seat/table records for visual orientation only.

Keep actor world coordinates, IDs, selectable identity, event routing and simulation footprints unchanged. Preserve `personModel`/`syncPeople` behavior and the `userData` interface consumed by animation, ware parenting and person thumbnails, including `body`, `head`, legs, arms, `carried`, `indicator`, `baseY`, `seed` and appearance. Keep support-surface grounding, ghost/model behavior, stored and held ware, and unattended washing intact. New geometry uses existing disposal tracking; no external assets, speculative shaders or mutable inspection surface.

Tune existing ambient/directional light, exposure, fog and material colors toward muted olive ground and warm neutral surfaces with softer, less opaque shadows. Reduce the repeating grass-patch contrast without changing land extents or ground height. Keep authored floors, steel, white ware, dirty ware and held meals distinct; avoid a global tint that conceals service state or darkens thumbnails. Start with existing renderer facilities and a bounded geometry increase.

## Acceptance criteria

- [x] The orchestrator and independent effort reviewer accept this bounded direction and shared rendering contract before implementation. Review `0_plan.md` accepts the plan at `c0fe2db`; implementation was authorized after that acceptance.
- [ ] At matched close and room views, standing staff and guests read as taller adults with rounded shoulders/limbs, coherent outfits and visible hair variation; current short box silhouettes are removed. Record observed improvements and residual differences against the named reference pixels.
- [ ] Inspect standing idle, walking and turning, seated waiting/eating, meal carrying, dirty-ware carrying and clean-ware carrying. At front, rear and side angles, feet stay on grass and authored floors, seated hips align with chairs, knees/feet clear the table, held ware meets the hand, and indicators clear the head. Check person thumbnails and actual actor selection.
- [ ] Inspect the outdoor service scene and furnished room at desktop widths 2560, 1440 and 1024. At each width use a repeatable room framing and close detail framing; at 2560 add fixed opposing/side views and at least three exploratory orbit/elevation/zoom combinations. Inspect each retained native-resolution image and bind evidence to its digest. No mobile work.
- [ ] Ground reads as a subdued continuous surface and shadows are softer without losing contact or depth. Peach/wood and kitchen floors, furniture, stored stock, clean/dirty ware, meals, dishwasher hood/rack states, hover and placement previews remain legible under the new light.
- [ ] Through real browser controls, exercise orbit/zoom, actor selection and a service trace covering seated guests, held meal, dirty return, unattended wash, clean retrieval and storage; retain the existing ownership/conservation checks and reload boundaries. Preserve all 78 tests and pass `npm run check` on the final integrated revision. No audit rerun is required without dependency changes.
- [ ] Record the behavior-changing session in `docs/devlog/summary.md`, update the ignored gallery with useful before/after comparisons, resolve material independent review findings and finish the fleet integration gates with no owned process leftovers.

## Implementation steps

- [x] Agree the proposal, evidence bounds and shared contracts; integrate the canonical plan before product work.
- [ ] Implement actor forms and pose anchors, then the bounded light/material/ground pass; inspect the diff for scope and preserved interfaces.
- [ ] Hand off the bounded scene change and devlog for orchestrator headless acceptance, one serialized full gate, independent review and integration. Repair only evidenced material findings within scope.

## Outcome

Initial implementation is integrated at `ebc138c`. All 78 simulation tests, syntax and build pass, and a real furnished service trace covers eating, dirty carry, unattended five-dish washing, clean carry and storage with phase reloads and conservation. Matched room and close views show improved height, outfits, quieter ground and softer shadows. These checks do not establish acceptable character anatomy or animation.

The user's 2026-10-18 report that the characters still look weird is material and remains open in `docs/learning/defect-register.md`. Separate capsule segments still read as a mannequin. The worker is researching a connected authored mesh, weighted skeleton and natural poses, with Blender available headlessly. The independent reviewer agrees that bones alone will not correct the silhouette. A revised scoped contract and one-model visual prototype must be accepted before further product edits; final acceptance and closure are pending that correction.

## Rigging correction proposal — 2026-10-18

The user reports that the characters still look weird. The matched close views and portraits at `ebc138c` confirm a material visual failure: separate capsule sleeves, forearms, hands and trouser sections produce rounded beads, shoulder gaps and a mannequin silhouette. Taller proportions and a hierarchy of rigid groups did not satisfy the character acceptance criteria. Keep that issue open. This proposal supersedes the actor construction method above; retain the atmosphere pass and existing gameplay boundaries.

### Tool and source choice

Use installed Blender 5.2 in background mode to author and inspect one original, connected, low-poly clothed adult mesh and a small deforming armature. Connected shoulders, sleeve-to-forearm transitions, pelvis-to-thigh topology and shaped palms with thumbs must solve the silhouette before clothing or hair variants multiply. Add sufficient loops at shoulders, elbows, hips, knees and wrists for blended weights; do not join overlapping capsule objects and call that a continuous body. Use normalized manual vertex groups, with at most four bone influences per vertex. Preview with linear armature deformation, matching the installed runtime's skinning; avoid a Blender-only deformation improvement that disappears in the game.

Blender is justified here by editable topology, inspectable weights and repeatable posed views before integration. A native Three.js SkinnedMesh remains the runtime. Rebuilding the same body directly in JavaScript offers no demonstrated advantage for this defect. A general character importer, facial rig, motion capture, cloth simulation and downloaded character assets are excluded. No network upload or external asset service is needed. The technical research and its limitations belong in `docs/research.md`, maintained by the orchestrator.

### Bounded files and export contract

Proposed product scope is `src/scene.js`, a small `src/characters.js` factory/pose helper, `src/assets/character.json`, original authoring source `scripts/build-character.py`, an export bridge check `scripts/check-character.mjs`, the check-script hook in `package.json`, and the dated devlog. The orchestrator owns plan, defect, research, review and gallery records. No dependencies or existing engine/interface/catalog/save fields change. Approve this file expansion before implementation.

The Python source is the reviewable editable source of the mesh, armature, materials and small idle/walk/seated/carry pose set. It produces a recoverable `.blend`, original-resolution posed renders and export receipts under ignored `tmp/rigging-study/`. Commit only compact local mesh/rig/pose data, targeting fewer than 5,000 triangles, 24 bones, four influences per vertex, three draw calls per actor and 256 KiB of generated text. Report measured counts and size; exceeding those bounds requires reassessment. Do not commit bulky `.blend` or rendered evidence files.

Export rest vertices, normals, indices, material slots, normalized bone weights, named parent-local bind transforms, inverse binds and a few authored pose/keyframe samples. Bake the Blender-to-game coordinate conversion once and retain a fixed cross-tool posed-landmark fixture. Import the generated JSON synchronously through Vite; no asynchronous character loading or change to `createScene`, `update`, `personModel` or thumbnail callers. Static material slots permit deterministic existing-name appearance without different body topologies.

### Runtime and lifecycle contract

Each actor, HIRE preview and thumbnail receives independent Bone instances, Skeleton and pose state. Do not use ordinary Object3D/SkinnedMesh copying as independent rig cloning. Immutable source arrays may be reused, but mutable geometry/material ownership must be explicit so thumbnail or preview cleanup cannot damage a live actor. Preserve current selectable ID ancestors, actor cell/world positions, surface grounding, stored/held ware ownership and the `userData` fields used by scene animation and portraits. The public inspection surface stays read-only.

Attach `carried` to the hand bone with the palm beneath level ware and sufficient torso clearance. Author pose transitions from relaxed shoulders, slightly bent elbows and neutral wrists. Use smooth opposing arm/leg movement and support-foot contact; freeze locomotion when paused and drive walking phase from displayed travel so speed changes do not produce skating. Seated hips meet existing chairs, forearms rest naturally near the table edge, and indicators remain clear of the head. Restrict root motion to visual support/seat alignment; engine positions remain authoritative.

Provide an inspected conservative envelope covering all exported pose samples and blends for runtime culling/raycast broad phases; compute posed bounds for thumbnail framing and selected detail views. Verify actual triangle selection after posing. Dispose each unique Skeleton/bone texture when actors are removed, previews change, thumbnails finish and the scene tears down, alongside the existing geometry/material/texture disposal. Record representative actor-count/frame behavior and repeated thumbnail/preview/removal resource behavior; avoid claiming performance from triangle counts alone.

### Staged acceptance and gates

- [x] Orchestrator and independent reviewer accept this revised method, file scope, export bounds and shared contracts before product changes. Review `2_plan.md` accepts the recoverable proposal at `0331dc9`; runtime integration was subsequently authorized after the candidate 5 approval at `f464391` and review `3_implementation.md`.
- [x] Prototype one model in ignored output first. Candidate 5 has a connected clothed surface, coherent shoulders/pelvis and palms/thumbs. The orchestrator inspected all 22 native-resolution neutral and posed PNGs; the independent reviewer inspected the same bytes against the rejected renderer and native references. Mesh/deformation direction is approved for runtime integration, with final appearance acceptance still open.
- [x] Inspect neutral, 45° and 90° elbow/knee bends, shoulder reach and seated hip bends using the exported runtime deformation method. Candidate 5 removes the earlier head distortion, trouser wings and under-seat spike without bead joints or garment gaps. Asset SHA-256 `c38038565be8cc832c89861f5740c1848beb677b6f97b37f08960524b7305543`; 2,958 total triangles, 20 bones and 147,815 bytes. The seated palms-up fixture is not a final guest pose: forearm pronation, table reach and support-foot correction remain mandatory runtime integration work, alongside motion and transitions. Prototype approval does not close F0.
- [ ] Demonstrate the source/export bridge with a reproducible build, finite indexed geometry, complete normalized weights, valid bone hierarchy/binds and independent skeletons. Compare fixed posed landmarks from Blender with actual Three.js bone-transformed vertices to catch axis, bind and weight conversion errors. Hook the cheap runtime-data check into `npm run check`; name its numerical/export bounds and keep visual acceptance separate.
- [ ] Inspect a full walk cycle and idle-to-walk, seated and carrying transitions over time. Feet support the body without skating or popping, shoulders remain relaxed, seated forearms are natural, and each supported ware form stays level on the palm clear of the torso. Then inspect deterministic staff/guest appearance variants, HIRE previews on grass/floor, portraits and actual actor selection.
- [ ] Orchestrator repeats the existing real-input service, Save/Reload, desktop 2560/1440/1024 matched room/detail views, fixed opposing/side views and exploratory orbits. Individually inspect retained native-resolution images, bind them to digests and keep the user defect open until its visual disqualifiers are absent. Preserve the working atmosphere and appliance/ware readability.
- [ ] Under a serialized grant, pass the export check and `npm run check` with all existing 78 tests; no dependency audit without dependency changes. Obtain exact integrated independent review, address material findings, record limitations and complete fleet integration and owned-process cleanup.

Current correction state: candidate 5 mesh/deformation approved after five bounded art prototypes. Earlier over-budget/head/hip failures are retained; the last correction fixes four trouser vertices incorrectly weighted to upper-body bones. Eleven fixed Blender/Three.js pose fixtures agree within 0.000009918 world units; detached-joint, rigid-elbow and unrelated lower-body influence checks retain deliberate red evidence. No sixth automatic art redesign is authorized. Proceed with the already planned runtime factory, lifecycle, pose adaptation and grounding stage under the bounded files above. Final service, desktop pixels, motion, resource checks and independent integrated review remain open. The original scene implementation and all rejected candidates remain recoverable.

