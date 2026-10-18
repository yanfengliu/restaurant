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
