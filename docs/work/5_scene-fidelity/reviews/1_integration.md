# Review 1: integration

## Target

Repository `restaurant`, exact integrated renderer `ebc138cd7aab414adc16b79468138e19337d7b52`, assessed against the accepted plan at `c0fe2dbbf1a5998ec4e3a84440e2c046643d455d` and prior product `3c659e49f83b88b41dc55a65fb262f59138a7f19`. The implementation commit changes only `src/scene.js` and the session devlog. Reviewed scene SHA-256: `b3083c50ff964c6a356fea90bb73bc7ee8c26c3919da79bb6128cf972ffe9010`. The isolated review branch merged the exact integrated target while retaining its original authored plan-review commit; its product bytes match the target.

The later documentation context is `959c3497a526b2d3ee97e69065bdb9fe9cf60c17`, which records the user defect, research limits and superseding plan outcome without changing the renderer. That committed context and the initial reviewed renderer are both recoverable; the forthcoming correction is outside this round's target.

## Reviewers and coverage

The independent Codex agent performed the review directly under the fleet's assigned Astra/xhigh review pin. Coverage includes the full renderer diff, unchanged engine seat/guest and hiring contracts, grounding, ware parenting, selection, HIRE previews, thumbnail framing and disposal callers. It also read the installed Three.js capsule and PCF shadow implementations where dimensional or filter behavior mattered. No product file was edited. No subagent, browser, GUI, server, duplicate runtime gate or external CLI was launched by this reviewer.

Both optional external CLI lanes abstain after the coordinator's fresh automatic approval rejections for possible repository transmission. No retry or alternate transport followed. This report is direct independent agent review; it does not claim a Codex CLI or Claude report.

## Reports

### Initial Codex independent review — source and geometry

No material introduced source defect was found. The change stays within the agreed renderer scope: engine state, catalog, persistent data, RNG, money, actor coordinates and simulation footprints remain unchanged. The camera defaults, controls, furniture/buildings and scene public interface are unchanged. Appearance still derives from existing actor name data (`src/scene.js:480`), so model construction consumes no game randomness and the HIRE candidate, hired employee and reloaded employee keep consistent appearance. The light uniform is an appearance variant, not a new engine role.

The articulated geometry and pose calculations agree with their intended support relationships. Hip height 0.88, thigh length 0.40, shin length 0.36 and shoe bottom offset 0.12 give a standing minimum of zero relative to the support surface (`src/scene.js:499`). The walking calculation uses both hip and knee angles and applies the inverse combined angle to the foot before compensating the lower sole's height (`src/scene.js:884`). It constructs no new geometry during animation. With the seated body offset, the pelvis bottom is approximately 0.555 above support, matching the unchanged chair cushion top 0.5525 (`src/scene.js:189`); the seated sole is approximately 0.0007 above support. Those numbers are static geometry calculations, not measurements of the native game or substitutes for visible pose inspection.

Seating now includes the actual current engine states `waiting`, `ordered` and `eating`, with table-facing orientation derived only from existing records (`src/scene.js:879`). The unchanged engine requires those states to remain at the reserved chair with no remaining path (`src/engine.js:1232`), which supports the rendering assumption. Arrival and departure remain standing/walking. Visual smoothing and state transitions remain subject to the actual-input trace below.

Carrying now attaches beneath the right forearm (`src/scene.js:538`). Its carrying shoulder angle −0.15, forearm angle 0.15−π/2, and carried-group angle +π/2 sum to zero, keeping ware level as the actor turns or walks (`src/scene.js:892`). The anchor places the plate underside approximately at the palm surface, forward of the torso. Existing `syncSupplies` still owns ware presentation and parents all three carried states to that same group (`src/scene.js:590`); no ownership or dish phase is inferred from the pose. Indicators rise with body height and stay above the taller head.

Nested joints preserve the original `userData` entries, actor `objectId`, data pointer and appearance key (`src/scene.js:542`). Unchanged ray selection walks ancestors to the same ID (`src/scene.js:722`). HIRE still builds `personModel` from the candidate, applies its existing translucent materials, and uses `personHeight` on the hovered support surface (`src/scene.js:681`). Portraits still frame the upper body from measured bounds (`src/scene.js:843`). All new primitive geometries pass through `addMesh`, and the existing recursive `clearChildren` disposes them and removes them from the geometry set (`src/scene.js:368`); full disposal cancels animation and releases renderer resources. No new asynchronous resource owner is introduced.

The atmosphere change is bounded. Lower direct-light dominance and PCF radius 3 soften shadows using facilities supported by the installed Three.js source. Repeating grass patches are removed without changing land extents or support heights. Steel, foliage, background, fog color and exposure change, while floor geometry and service-state materials remain structurally intact. Thumbnail lighting remains separate, although the shared renderer exposure also affects thumbnails and therefore requires the inspected preview evidence. The static source establishes these bindings, not frame rate or full visual parity.

### Initial saved browser and pixel observations

At the initial review, the coordinator's completed evidence receipt had not yet been supplied. Preliminary individual inspection included matched 2560 close before/after, the 1024 close view, 1440 room view, one opposing fixed view, one exploratory overhead view, candidate portraits and the floor HIRE ghost. These showed a visible improvement at unchanged framing, complete portrait heads, readable floor placement and retained furniture/service detail. They did not establish the remaining grass or live service acceptance by themselves. The superseding assessment below rejects completion despite those improvements.

### Superseding user feedback and presentation finding

**F0 — Material: the articulated characters still read as mannequins rather than natural stylized people.** After the preliminary observations above, the user reported: “characters still look weird. Learn how to rig. Maybe external research or tool will help.” The reviewer reassessed the same inspected close views and source. The initial review correctly identified improved height, ground treatment and mechanically consistent anchors, but accepted their appearance too readily. Those improvements do not resolve the visible disconnected limb masses, abrupt joint transitions, rigid torso/shoulder forms and peg-like hands. The earlier positive pixel observations remain as history and do not constitute acceptance.

The cause is visible in the authored geometry. `segment` creates a complete closed capsule centered between two pivots (`src/scene.js:490`); upper and lower segments meet near their closed tips (`src/scene.js:502`, `src/scene.js:526`). Bending rotates these independent rounded pieces, without a shared surface or blended deformation around the elbow or knee. The lathed torso, separate pelvis and shoulder capsules retain a mannequin silhouette, and oval hands provide little palm/thumb definition. A new bone hierarchy alone would preserve those defects.

A revised implementation should first prove one coherent adult body and clothing silhouette using continuous weighted geometry with useful topology around shoulders, elbows, hips and knees. A tool-authored model and actual skeleton are reasonable means, provided the inspected deformation improves the visible result. This is not a requirement to build a general asset pipeline, add a facial rig, extract outside assets or expand gameplay. Preserve the accepted world scale, support surfaces, IDs, selection, deterministic appearance, ware ownership and service contracts.

The revised visual done condition should explicitly reject the reported defect. Inspect one model at ordinary gameplay and close zoom from front, side, rear and three-quarter views before multiplying variants. Shoulders must flow into upper arms and the pelvis into thighs; elbow and knee bends must preserve volume without bead-like ends, gaps, sharp pinching or garment separation. Hands should read as palms with a simple thumb mass. Neutral posture needs relaxed shoulders, slightly bent elbows and credible wrists. Walking and turning need smooth opposing limbs and supported feet without conspicuous skating or body popping. Seated waiting/eating must keep hips at the cushion, feet near the floor, knees clear of furniture and forearms naturally at the table. Meal, dirty-ware and clean-ware carrying must keep the palm under level ware, with a credible wrist and clear torso, in opposing views. Compare against the rejected revision and named native references using matching framing; a bone or vertex count is not visual acceptance.

Skinning also changes resource and selection responsibilities. The installed `SkinnedMesh.copy` shares its skeleton, and its documentation requires animated bounds to reflect the pose for culling and raycasting. A revised plan must provide independent actor/ghost/thumbnail poses, correct bounds, stable parent selection identity and hand-bone ware attachment. Owned skeleton resources must be disposed alongside geometry during actor removal, thumbnail cleanup and full teardown; the present generic `clearChildren` does not dispose skeleton bone textures. These checks follow directly from the proposed representation change.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The separate rounded body and limb masses retain an unnatural mannequin appearance. | Open. Coordinator accepted the user's reported presentation defect and recorded it at `959c349`; the earlier positive pixel assessment is superseded. | Research and review a bounded revised character/rigging contract and one-model prototype, then verify its actual rendered poses. |

## Verification

The reviewer confirmed exact target/product equality and the scene digest above. The fleet work-document checker passed for all six units. No duplicate automated runtime suite was run. Complete input traces and the final acceptance manifest were not yet delivered when the user's presentation feedback stopped acceptance. The coordinator separately identified the first grass HIRE capture as an instrument miss on an occluding wall, and the first selection click as a shelf hit; neither is treated as successful evidence here. The later plan at `959c349`, which this reviewer read, records all 78 tests, syntax and build passing and a furnished service trace through eating, dirty carry, unattended washing, clean carry and storage with reloads and conservation. Those are coordinator-attributed results; this reviewer did not independently inspect the complete run receipts in this round. Neither functional gates nor corrected input evidence can close the appearance finding. The source/math observations remain valid within their stated bounds.

The eight individually inspected images under ignored `output/playwright/` are bound below. These hashes preserve the exact initial-review pixels; they do not establish completion of missing control or motion checks.

| Inspected image | SHA-256 |
|---|---|
| `scene-before-2560-close.png` | `b3d552f292b96271f7a36d3c7f4343581184a656492a64e17b4c5d7fe22f4033` |
| `scene-after-2560-close.png` | `ffa1d5c8d858af3ce1142fe3805175983a64323ccd04be2e6d99b76c47750174` |
| `scene-after-1024-close.png` | `d3de159806b22f47875920d266f502ac926da2a7a0d59045b4ec04fa90773d57` |
| `scene-after-1440-room.png` | `1703e3a15f340c7fa85834e5d94233bfccdd33ab3657592217fb3a896ea7c324` |
| `scene-furnished-angle-3.png` | `1620ecabb7aeaffb53041ca998da1011357b1250d862029429b5bc4c6bf46dbf` |
| `scene-furnished-explore-1.png` | `7067ebfb783e40fe811e119ac83874e41862dcc3b98742ad9339a744f460ba20` |
| `scene-candidate-portraits.png` | `76931d6b06c8974d3f1d7ba6577642385e4e13cc78eae2c6af4fb2c962b35576` |
| `scene-hire-preview-floor.png` | `292cd58c379e141173828f3a402a540a996eda95d112f9418e9dd7becd117bb9` |

## Round outcome

Do not accept `ebc138c` as completing M5. F0 is a material open presentation issue confirmed after user feedback and reassessment of the inspected images. Preserve the initial observations and pursue the bounded revised contract and one-model prototype required by the plan outcome at `959c349`. Further source, deformation and actual-input pixel review must assess the corrective revision against the explicit visual done criteria above. This closed historical review round records negative acceptance; it does not approve the forthcoming revision or close the work unit.
