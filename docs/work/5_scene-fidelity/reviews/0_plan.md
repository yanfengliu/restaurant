# Review 0: plan

## Target

Repository `restaurant`, plan `docs/work/5_scene-fidelity/plan.md` at recoverable commit `c0fe2dbbf1a5998ec4e3a84440e2c046643d455d`, SHA-256 `718a0687d14f60e6b0a7e7ba9b06571635122f105e56c563761369e2e0eb205b`. The whole-effort lens uses completed M4 at `3c659e49f83b88b41dc55a65fb262f59138a7f19`, its plan and integration review, relevant unchanged rendering callers, and the six individually inspected images bound below. No proposed implementation was reviewed.

## Reviewers and coverage

The independent Codex agent performed this review directly using the fleet's assigned Astra/xhigh review pin. It read the repository and fleet instructions, M4 outcome and review, the committed M5 plan, `README.md`, relevant research notes, and the actor, environment, carrying, grounding, selection and thumbnail paths in `src/scene.js`. It inspected all six supplied images at original resolution. It changed only this authored report and used no subagents, browser, GUI, server or runtime gate.

Both optional external CLI lanes remain unavailable for this round after the coordinator's fresh automatic approval rejections for possible repository transmission. This reviewer did not retry them, route their prompts through another transport, or attribute nonexistent CLI reports. The direct review below is separately grounded and attributed.

## Reports

### Codex independent effort and plan reviewer

The proposed increment is coherent and acceptable. The current service and supply loops have a completed, bounded M4 verification record; adding more gameplay content would not address the largest visible differences in the supplied scenes. The baseline characters have short rectangular torsos and straight block limbs, whereas the reference images show taller adult proportions, narrower silhouettes, rounded limbs, distinct clothing masses and varied hair. Current yellow-green ground has a conspicuous repeated patch pattern and dark, long, hard-edged shadows. The reference ground is quieter olive with less dominant shadows and warmer, muted surfaces. These are qualitative pixel observations, not measurements of native geometry or lighting parameters.

The plan at lines 14 and 22 appropriately keeps the work in `src/scene.js`, combining body proportions with their pose anchors. It preserves buildings, furniture, layout, camera defaults and controls, and excludes engine, save, catalog, money and pathfinding changes. Its 1.65–1.75-unit actor height is explicitly an initial inference, not a claimed native measurement. The supplied browser room and native close views have different layouts and zooms, so their raw screen sizes cannot establish scale parity. The matched close and room framing at lines 31–33 is necessary to judge improvement without hiding it through a camera change.

The pose and interface safeguards target the actual integration risks. Existing `personHeight` treats floor and grass grounding differently (`src/scene.js:415`), ware attaches to `userData.carried` (`src/scene.js:549`), selection resolves the ancestor's `objectId` (`src/scene.js:681`), portraits crop from the body's bounds (`src/scene.js:802`), and walking, sitting and carrying consume the current limb/body references (`src/scene.js:840`). Enlarging only the outer model would leave visible seat, hand, floor or indicator errors. The proposed coordinated hips, knees, shoulders, elbows and anchors, plus the unchanged IDs and `userData` contract at plan lines 22–24, are the smallest plausible correction. Actual pixels must still establish that the implementation meets these constraints.

The light and ground pass at line 26 is proportionate. Reduce repeated patch contrast and dominant shadows while preserving readable contact, clean/dirty ware, meals, steel and appliance phases. The plan correctly rejects a global tint that hides service distinctions or damages previews. It does not justify new buildings, vegetation systems, content, role mechanics, shaders, dependencies or camera changes. Distinct outfits should remain deterministic appearance choices from existing actor data; the images do not establish new staff professions or scheduling rules.

Acceptance at lines 32–35 covers the relevant standing, turning, seated and three carrying states, both support surfaces, opposing views, exploratory views, three desktop widths, unchanged selection, thumbnails and a complete service trace. The coordinator should reach the HIRE preview through the candidate control and inspect it on grass and flooring as part of the existing ghost/placement requirement. The service trace is useful because it exercises the changed ware parent and hand anchors over time; the 78 simulation tests alone cannot establish their visual correctness. A single final integrated gate and focused repairs are adequate. There is no reason to restart the completed native service study or expand this increment into another research loop.

No material plan defect was found. The scope has a clear stopping condition: visibly improved actor silhouettes and subdued atmosphere, preserved interaction and service presentation, and resolved material findings on the integrated renderer change. This review accepts implementation under the plan; it does not establish implementation quality, full game parity or completion.

The whole-effort read also identified two inherited help-text discrepancies: `README.md:23` restricts hiring prose to floor tiles despite outdoor hiring, and `README.md:29` still describes monthly settlement and service-only accrual after M4 changed those rules. The coordinator repaired both separately at `6994d241ccb32cfafb690f50718ab8233989d23c`; the reviewer read that exact diff and confirmed clear owned ground, accrual after hiring while simulation time advances, and daily settlement. They are not renderer scope or a blocker to this plan.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| — | No material plan finding. | Coordinator accepted the independent recommendation and authorized implementation under this plan. | Implementation and exact integrated source/pixel review remain required. |
| — | Inherited README hiring/payroll prose is stale. | Coordinator accepted a separate documentation correction; excluded from the scene worker's scope. | Resolved at `6994d241ccb32cfafb690f50718ab8233989d23c`; exact diff inspected. |

## Verification

The reviewer read the exact committed plan, fast-forwarded its isolated review worktree to `c0fe2db`, and confirmed the plan digest above. The fleet work-document checker passed for all six units. No runtime test or browser acceptance was performed in this planning review. M4 test and service results are cited only as the completed prior milestone's recorded bounds, not rerun or extended to M5. The coordinator accepted the HIRE-preview clarification and will cover grass, flooring and portraits through actual controls.

Each image below was opened individually at original resolution. The comparison establishes visible direction only; the images differ in framing, restaurant layout and service state. Source images remain ignored research evidence, not product assets.

| Inspected image | SHA-256 |
|---|---|
| `output/gallery/63-service-room.png` | `5e73d0af4a694230a09ad7f6646327d862dec84eb254352d4df5e7de6a0be955` |
| `output/gallery/56-four-dishes-waiting.png` | `1cc176d971d27782a0b0387511a0cff3f2d994c771ab161cdf8b242b5e6c5276` |
| `output/gallery/30-furnished-supplies-room.png` | `ec0a07ab1b20d3c68b1991b719c0e216ab3450ce038e94423c29951c88ba3cec` |
| `output/reference-study5/21-cycle-transition-01.jpg` | `a5b5d2eaed9137f2280b39b7639f7d5bc5079cfd972de877c03edf0986e3cb33` |
| `output/reference-study5/27-cycle-transition-07.jpg` | `b70321c68e79976574ff4979e926cb6f129d6ad55c4e11563fe3983cf9ae3438` |
| `output/reference-study5/04-dishwasher-empty-five-capacity.jpg` | `400c10fa76863dcd028e17e0d3de47ed2ea7c354834302491c4c16b59fa1308e` |

## Round outcome

Accept the plan at `c0fe2db` with no material open finding. Direct independent review is available; both optional external CLI lanes abstain. Exact implementation review, actual-input desktop pixel acceptance, the final integrated gate, gallery evidence, integration and cleanup remain the coordinator's closure tasks.
