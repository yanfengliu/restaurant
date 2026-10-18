# User-reported defects

## 2026-10-18 — Characters look unnatural

Symptom: the user reports that the characters still look weird and requests learning rigging, with external research or tools if useful.

Investigation: the first scene pass at `ebc138c` improves adult height and lighting, but its separate capsule limbs, visible joint transitions, blunt hands and rigid rest poses still read as a mannequin. The ignored gallery was still showing the preceding milestone when the report arrived; the current renderer also has the visible defect, so the report is not dismissed as stale imagery. Simulation and source/math checks do not establish natural character appearance.

Root cause: character construction uses independent rigid primitive segments and procedural pivot rotations rather than a coherent body/clothing surface with blended joint deformation and intentionally authored natural poses.

Status and check: open. Research armatures, skin weights and deformation; compare an authored rigged correction against the retained earlier pixels. Before closure, inspect shoulders, elbows, hips, knees, wrists and hands in idle, walking, turning, seated and three carrying states from front, rear and side. Preserve feet, chair and hand contacts, selection, portraits and placement previews. Retain a regression check covering the weighted rig and representative extreme poses, alongside actual browser pixel acceptance; record its red/green proof and bounds at closure.
