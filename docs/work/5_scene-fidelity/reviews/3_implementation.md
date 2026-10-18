# Review 3: implementation

## Target

Repository `restaurant`, the original character prototype retained in the worker worktree under `.worktrees/scene-fidelity/tmp/rigging-study/prototype-v5/`. The canonical plan context is recoverable commit `f46439171247f86d3d4e50ddf5549bebe3544b9c`, with plan SHA-256 `a21844b5e2804f3fae05f99dd9835528422a86db3be5f9c25149caef5fa4fb67`. The reviewed authoring source, generated asset, editable Blender file, fixtures, receipts and rendered images are retained ignored evidence; they are not product code at this review boundary. Their exact digests appear below. The coordinator must preserve these inputs until the reviewed bytes have a recoverable repository binding or a deliberate retained-evidence handoff.

This round decides whether the mesh and its deformation are suitable for the authorized runtime-integration stage. It does not review the later character factory, game pose adaptation, actor variants, disposal implementation or final game rendering. The rejected renderer remains `ebc138cd7aab414adc16b79468138e19337d7b52`, with the user's objection and open F0 retained in [round 1](1_integration.md). The accepted correction contract is in [round 2](2_plan.md).

## Reviewers and coverage

The independent Codex agent performed direct source and saved-pixel review under the assigned fleet Astra/xhigh review pin. It inspected all 22 V5 PNGs individually at their native 640×768 or 384×384 resolution, read the complete retained `source.py`, and read the topology/export and Blender-to-Three fixture receipts. It independently calculated the listed SHA-256 digests. It also compared the candidate qualitatively with the rejected mannequin renderer and the studied native-game references, whose different camera, lighting and delivery scale prevent a pixel-equivalence claim.

Earlier direct inspections covered eight V2 neutral-body images and sixteen V3 neutral/bent/carry/walk images. Those observations and rejected outcomes are retained below. V1 and V4 outcomes were reported by the coordinator/worker and are not presented as independently inspected here. No Blender, browser, GUI, server, external CLI or product gate was launched for this round. The reviewer changed only this report. The optional external CLI lanes remain abstentions after the prior automatic-approval rejections; no retry or alternate transmission was used.

## Reports

### Codex independent prototype reviewer

Approve exact V5 mesh/deformation bytes for the bounded runtime-integration stage. I found no remaining material mesh or anatomy defect in the inspected prototype views that requires another art candidate. This is a staged approval: F0 stays open until the actual game poses, contacts, movement and presentation pass integration review.

The connected clothed surface is a material improvement over the rejected renderer's visibly separate capped limb pieces. The shoulders join the upper arms, the elbow and knee bends retain a continuous silhouette, the pelvis flows into the thighs, and the hands have a palm/thumb shape rather than terminating as pegs. The four neutral angles show a readable adult body at close and ordinary scale. The explicit head profile avoids the earlier diamond-shaped silhouette. Its facial and hair forms remain simplified, which is compatible with the studied low-poly adult direction. This inspection does not require a different face or a sixth art iteration.

The decisive repair is visible in the opposing walking poses and seated hips. V3 stretched the trousers into large angular wings and a side flap; V5 removes those shapes. The V5 seated side view also has a coherent pelvis/thigh contour without the previously reported under-seat spike. The isolated elbow and knee 0°/45°/90° views retain useful joint volume without visible gaps, disconnected beads or sharp collapse. Static plate carry shows the hand supporting the underside with the plate level. These are specific visual results, not conclusions inferred from having an armature or normalized weights.

The seated fixture is **not** an accepted natural guest pose. Both forearms remain palms-up and the hands stop short of the table edge. Runtime pose adaptation must turn the forearms/hands appropriately and place them naturally at the actual game table, without collapsing the wrist/elbow surface or intersecting the tabletop. The actual chair cushion, hip position and feet must be checked together. The prototype's studio props and automatic whole-body vertical support adjustment are useful deformation evidence but do not establish those game contacts.

Walking still requires temporal review. Two static strides do not prove grounded support, lack of sliding, natural start/stop transitions, pause behavior or agreement between displayed travel and gait. The retained bridge envelope reaches Y = −0.0441098903 across its sampled poses/blends, so runtime support correction and conservative posed bounds must account for that. It must not be hidden by changing engine coordinates, furniture dimensions or footprints. Carry acceptance must also cover the game's real dish, beverage and washing-stack forms while moving, rather than only this single static plate.

The complete authoring source supports the chosen representation. It constructs one branched body surface, applies connected topology and subdivision, replaces the failing head branches with an explicit ring profile welded at the neck, and assigns bounded blended weights. It explicitly disables Preserve Volume on the body armature. It exports positions, normals, indices, material assignments, weights, named parent-local rest transforms and inverse binds through one Z-up to Y-up conversion. The retained posed landmarks are measured from Blender's evaluated mesh. Separate small eyes/ears do not undermine continuity at the deforming body joints. Ordered bounds are now measured after coordinate conversion, correcting the reversed-Z metadata observed in V3.

The reviewed receipts report 2,558 body triangles plus 400 accessory triangles, 20 bones, at most three influences and 147,815 exported JSON bytes. The bridge receipt binds the same asset digest, reports one connected body, checks 452 lower-body vertices for unrelated-bone influences, and gives a maximum of 0.000009917849384 positional error across eleven posed fixtures. Its recorded rigid-elbow and detached-elbow mutations fail. I read these receipts and the authoring logic; I did not rerun their checker or claim an independent numerical execution. These measurements support the export and bounded-cost contract, but do not prove draw calls, actor-count performance, selection, independent skeleton ownership or disposal in the game.

The next implementation should use these approved geometry/weight bytes and adapt poses to existing surfaces and interfaces. Independent skeletons for actors, previews and portraits; deterministic appearance; hand-held ware; actor-ID picking; conservative animated bounds; and skeleton/bone-texture cleanup remain required by round 2. Any changed geometry or weights need a new byte binding and affected visual recheck. The present approval does not transfer automatically to a changed candidate.

### Retained candidate outcomes

- **V2, body-only inspection:** eight neutral views showed a useful continuous body, coherent limb taper and simplified hands; no material neutral-body reason to discard it was found. The head was explicitly outside that assignment and remained rejected by the coordinator for its diamond shape. Straight neutral images did not establish deformation, seating or carry acceptance.
- **V3, rejected deformation candidate:** the explicit head was useful, as were isolated elbow/knee bends and static plate carry. Both walking poses exposed material pelvis-to-thigh distortion: obvious angular trouser wings in `walk-1-threequarter-close.png` and a side hip/thigh flap in `walk-2-threequarter-close.png`. This was relayed promptly before the next repair. The coordinator separately reported the seated fold and excessive hand height. The candidate was not approved for runtime promotion. Its `report.json` also reversed the converted Z bounds, so those endpoints could not safely become a runtime box.
- **V5, accepted for the next stage:** all 22 images were inspected. The visible hip deformation blockers are resolved. The remaining seated reach/orientation and motion/contact requirements belong to the already-planned runtime pose integration and remain open acceptance work. This is not a finding that the final game already meets the user's request.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | The rejected renderer has mannequin-like character forms; the complete visual correction remains unaccepted. | Independent recommendation: accept V5's exact mesh/deformation prototype for runtime integration. Keep F0 open because game poses, motion and contacts have not yet been demonstrated. | Integrate the approved bytes; correct seated pronation/reach and actual chair/table/foot contacts; inspect real movement, ware, selection, HIRE and portraits; review the exact integrated source and evidence before closure. |
| F0, prototype history | V3 pelvis weights produce angular trouser wings/flaps during walking. | V3 rejected. The visible defect is resolved in V5's two opposing stride images and seated contour. | Preserve the rejected candidate evidence and verify the same corrected deformation survives runtime pose blending. |
| — | No new material mesh/anatomy blocker in V5's inspected views. | No further art candidate is indicated by this review. | Proceed only within the accepted runtime-integration contract; final M5 acceptance remains pending. |

## Verification

The reviewer read the retained source and receipts, inspected all named prototype PNGs, calculated their digests, and merged the recoverable canonical plan context into its isolated reviewer branch. No product gate, scene runtime or lifecycle measurement was duplicated. The studio render is evidence of the authored LBS mesh under those fixtures; it is not browser-rendering or gameplay evidence.

The fleet work-document checker passed for all six work units with this report present. The documentation whitespace check also passed. These checks establish report structure and formatting only.

For the qualitative comparison, the reviewer reopened `output/playwright/scene-after-2560-close.png` and `output/reference-study5/27-cycle-transition-07.jpg` plus `04-dishwasher-empty-five-capacity.jpg`. These retain the digests already recorded in rounds 0–1. Their source dimensions are 2560×1440; this tool delivery resized them to 2048×1152. The comparison supports the continuous-versus-segmented silhouette assessment, not exact scene matching. The prototype images below were delivered at their native dimensions.

### V5 retained input binding

All paths in this table are relative to `.worktrees/scene-fidelity/tmp/rigging-study/prototype-v5/` in the primary repository. The source and editable file must remain recoverable through the later integration handoff.

| File | SHA-256 |
|---|---|
| `source.py` | `1ee39fd6eff598fa6033235d34b95627fac0e583cdb3c0947d78c8ead73a1a55` |
| `character.json` | `c38038565be8cc832c89861f5740c1848beb677b6f97b37f08960524b7305543` |
| `character.blend` | `08a9c06433bf393d5bdb9d2468a0646ac6888ac8917e4bf761d7b20df0f868b9` |
| `report.json` | `652d112515a54c55a9b0b854d1b41498f19dad2a9ed17dcc2702d211bbb681a3` |
| `pose-fixtures.json` | `0114dbe6355bc59b3a7b6eded1878f3aba52ee2d9b27c89c965b7f02598ad51a` |
| `bridge-proof.json` | `3c138ec758a9c141b555c7d413d4635341c6509e84861cb75acd1062c4b9e8b8` |

### Inspected image binding

The following tables bind only images actually inspected in this review sequence. Candidate directories are retained separately; none of their outcomes is silently replaced by V5.

#### Prototype v2

Directory: `prototype-v2/`; `character.json` SHA-256: `5896f83a8abc2b3911ccf619c7b3b6f0c37aad68ced4fb03c39eb47737bcc232`.

| Inspected PNG | SHA-256 |
|---|---|
| `neutral-front-close.png` | `90433a14a8bf60c187d40111dce343a3e3449c791774eedaa6430db632f1aeeb` |
| `neutral-side-close.png` | `8c27c09c1d031ee866d5607c6f98621ece9dfeb3a902d08cdf07f28d4a6b6d6c` |
| `neutral-rear-close.png` | `df4cd13e0fa437bc4648da1cf0f2c483172b4770f9ff59b28ebf3d226ee3498b` |
| `neutral-threequarter-close.png` | `f1d345cb13cc0960ae864f79595c9f58d6ef0b6421ac2fad5fcd8286fac0eb36` |
| `neutral-front-normal.png` | `1b709dc4a229994e2b31b45937605bf3cc7a282a332f898e27564e174e597b9e` |
| `neutral-side-normal.png` | `9c4361946775733f7fc23705dd20d2a0b9059286a583bfd84d7950473837c988` |
| `neutral-rear-normal.png` | `665c0e0e2a0a54e22eac70f0081d4fcbf0b5b602b9b0831486b16cb49e7e7d9b` |
| `neutral-threequarter-normal.png` | `28ab56318cf6b39cf9abd8628f3ec2c2a60c5f6031c4c60a72fdd8dcf5daa800` |

#### Prototype v3

Directory: `prototype-v3/`; `character.json` SHA-256: `8c2ff8c1a5eb6788266d63d0cdec7f7f6ec8fba0c02e47ae3775f014be1e107e`.

| Inspected PNG | SHA-256 |
|---|---|
| `neutral-front-close.png` | `3b8446717b42da7228bbce771f824bfc240ee55cd6c673e3968c3649d5a8c787` |
| `neutral-side-close.png` | `c369db1d2fa2ef89d0430539c477cd6863ea4739aa0cec77f8ad489a7a38f0b1` |
| `neutral-rear-close.png` | `f453942d0ead9e688018eb76d344f1d06b783c2988ec0de758710e32b572ba19` |
| `neutral-threequarter-close.png` | `1b0d03742da8da49a50f1e5f227c01316fa52330bc1fb9f59b0219784aa30029` |
| `neutral-front-normal.png` | `1a2f8adcba17ad63c56363bd7d441c9a0f71e94856a526d1719bf00f2ab3bc91` |
| `neutral-threequarter-normal.png` | `499dd30dfe480fbcde25aa5328e4321e5482130c4e72c2f91eba441ce04d78c7` |
| `elbow-45-threequarter-close.png` | `632a8a307893b41fc9802492fca0267478ac02eeecddd1ea6df35ef60bda4c5f` |
| `elbow-90-threequarter-close.png` | `3f94894ede5fb8317c6f15c6dbf7393253370fa11287f04a250ccf24e4be0a0e` |
| `elbow-90-side-close.png` | `ef80c338b50263e4f7ecde2bf2a6584e9fa888e8bca7430ed32140b38f48a138` |
| `knee-45-threequarter-close.png` | `16858bba6f9edfc92d80cb0385ddea7241054ad11f0186d3e79f5e68eacd45a0` |
| `knee-90-threequarter-close.png` | `6842dbe09789875c57b69fc92f02a48251dccc8a9743a8cbe7f76a3b44208761` |
| `knee-90-side-close.png` | `85e22c515c857162013f4e335c18d66a384ebfb16c42b35e3a9cb5e17deba566` |
| `carry-threequarter-close.png` | `b3e279e0342dc92ec3298047f495e68f3c6b6652de838609455ab04c23f1d439` |
| `carry-side-close.png` | `bcf955edf74875fc81f9e4050d54ac79d6f9275b5bd27416cf94986bf5f8aedd` |
| `walk-1-threequarter-close.png` | `18b9c48ebf246c0048c15eb928ee171f2a2e5e513f6bd0aece97d7c47c4e74dc` |
| `walk-2-threequarter-close.png` | `a2c628d2de68357105266789a6fc42280e0522bbd5f79821bdedb6e3f9c5f6b7` |

#### Prototype v5

Directory: `prototype-v5/`; `character.json` SHA-256: `c38038565be8cc832c89861f5740c1848beb677b6f97b37f08960524b7305543`.

| Inspected PNG | SHA-256 |
|---|---|
| `carry-side-close.png` | `b8e2714b52fec19eef40aa732bdaa679129506333a11f12c087385381e41242d` |
| `carry-threequarter-close.png` | `40c7a216a8e86426bd60f0d827e1e1bbeb16fbd877c91c875b7545cbd18cf854` |
| `elbow-0-threequarter-close.png` | `030f812908649b2e15192784c13debbfdced65065ef67c02e838f45a81f4dc08` |
| `elbow-45-threequarter-close.png` | `f64e182d37743bf69bd3de808c4940a2c32c23b6b413d76192abf2c2c1ab74d5` |
| `elbow-90-side-close.png` | `5e524a7e54b93aed4c4e9d0b3309efd6244ab0685d4efa3b20df68c39a851751` |
| `elbow-90-threequarter-close.png` | `a5aa56c85135565f7db27bca87c47ba77cb9aa07a752a0fbb4df3b56e869cb55` |
| `knee-0-threequarter-close.png` | `687c74e46d7164b64f0a31b70b4b536b13e36691b7b2450715bede5847b0f1d9` |
| `knee-45-threequarter-close.png` | `915dd41236e92fb75a5946846ae3bbe2d802c6c795582a45de4f132c64b94850` |
| `knee-90-side-close.png` | `184575aa34fa144515d208930f2e03fb9733d8ec16cbdca5f91212961f740dbd` |
| `knee-90-threequarter-close.png` | `b6d94dd73b6b8e848e82e2e37e3de188a6f929b471690881cc0ce18f92e5243d` |
| `neutral-front-close.png` | `d8d600989e371eb07e0e3dc44d7cf22a94ab71ea87cb023f2f36664a25487090` |
| `neutral-front-normal.png` | `4e11f16968afe3351c1217b171294ae6b7e233cd2655c7845f4bfaed19c48bf5` |
| `neutral-rear-close.png` | `d03a432cdd89451e88ae99bc3922f7b2ccbeebec3c4ec8e9c15279a19f5f6e78` |
| `neutral-rear-normal.png` | `afab9689691f8e86a2ee0de5c1baa3c93e5dc9652873bc3730f7a8c728e89be4` |
| `neutral-side-close.png` | `c2a75d4ae0433a52ba5d193ed2a49decaa611d850f1ee281816d301727a86785` |
| `neutral-side-normal.png` | `2384336d6ac99ac5369448fefd9ff671d9dfb13ce44d6276eff03903b02f203b` |
| `neutral-threequarter-close.png` | `ba6450f8f4ddeb56825c223f8c438c09c912a435c5a3a6f48b35629d4f3003f5` |
| `neutral-threequarter-normal.png` | `93bfa588950b33800a4987fc190e39207b581f8c302f9301e99f0602fc4b50a9` |
| `seated-side-close.png` | `82cf7859c43f5dbfa83eb516ef0842401d2d25965c0382d24f855343d72244da` |
| `seated-threequarter-close.png` | `9a0a9c400c710aba998342dc3583a5ceb0a3ab37202f929afe15b00829dd937e` |
| `walk-1-threequarter-close.png` | `f1716ca3f424ccdc6b756e2a16a420328f85595cf0b66a9a9426f9d18a012fd1` |
| `walk-2-threequarter-close.png` | `b3687f8e8d769946b625e121668cade3ae72786ebaa98667e9b77d0c0600d60c` |


## Round outcome

Approve V5 asset `c38038565be8cc832c89861f5740c1848beb677b6f97b37f08960524b7305543` for the bounded runtime-integration stage. The mesh/deformation prototype has no remaining material blocker in the inspected views. F0 remains open: seated forearm orientation/reach, actual surface and foot contact, temporal gait, live carried ware, scene integration, independent resource ownership and final actual-input acceptance still require verification. This report does not approve the final game or close M5.
