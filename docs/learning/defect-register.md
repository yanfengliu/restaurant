# User-reported defects

## 2026-10-18 — Characters look unnatural

Symptom: the user reports that the characters still look weird and requests learning rigging, with external research or tools if useful.

Investigation: the first scene pass at `ebc138c` improves adult height and lighting, but its separate capsule limbs, visible joint transitions, blunt hands and rigid rest poses still read as a mannequin. The ignored gallery was still showing the preceding milestone when the report arrived; the current renderer also has the visible defect, so the report is not dismissed as stale imagery. Simulation and source/math checks do not establish natural character appearance.

Root cause: character construction uses independent rigid primitive segments and procedural pivot rotations rather than a coherent body/clothing surface with blended joint deformation and intentionally authored natural poses.

Correction: `e2365bf` replaces separate rigid parts with one connected Blender-authored body and normalized weights on a 20-bone skeleton. The authoring classifier initially assigned four trouser vertices to upper-body bones; the corrected weights and a whole-lower-body influence gate prevent that deformation class. Independent review also found abrupt carry transitions and a displayed-root snap on pause; smooth carry blending and a frozen visual root/heading address both.

Status and check: closed for the reported character defect after independent integrated review `docs/work/5_scene-fidelity/reviews/4_integration.md`. `scripts/check-character.mjs`, included in `npm run check`, compares 11 independent Blender pose fixtures with Three.js transforms (maximum error 0.000009918 world units), checks connectivity, weighted deformation, unrelated influences, independent rigs, resource disposal and temporal steps. Deliberately detached joints, rigid elbows, the literal bad trouser weights, abrupt carry changes and paused-root motion fail their respective checks. Numerical checks do not judge visual naturalness.

Visual closure: individually inspected native-resolution browser views cover idle, walking, turning, seated poses and meal/dirty/clean carry, hands, support feet, selection, portraits and floor/grass previews. Actual furnished plate and outdoor bowl service, reload and conservation pass. Fifty-two retained compositor frames from a complete 127-frame capture show release/empty-arm return, pause and first resumed motion; the earlier 21-frame selection is explicitly insufficient for release. The ignored gallery manifest records 131 inspected image hashes and rejects cropped/occluded images as whole-body proof. Full reference parity and hardware GPU performance remain unclaimed.
