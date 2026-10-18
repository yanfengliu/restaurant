# Review 4: integration

## Target

Corner Table integrated product revision `0be4fcf`, including implementation `d3ea610`, compared with rejected renderer `ebc138c`. The bounded implementation scope is `src/characters.js`, its integration in `src/scene.js`, `src/assets/character.json`, `scripts/build-character.py`, `scripts/check-character.mjs`, the fixed `tests/fixtures/character-poses.json`, and the package check hook. The reviewed plan is `docs/work/5_scene-fidelity/plan.md` at `0be4fcf`. The approved V5 mesh remains SHA-256 `c38038565be8cc832c89861f5740c1848beb677b6f97b37f08960524b7305543`.

This report preserves the initial integrated findings and explicitly reviews their repair at `e2365bf7c29516a5359649b1605f15c5c9362c0c` (worker implementation `e840afd`). The repair changes only the character helper, its scene adapter, temporal checks and devlog. The mesh, authoring source and fixed export fixture bytes are unchanged. The final recommendation approves this exact repaired product target within the source and image bounds below.

## Reviewers and coverage

The fresh independent Codex reviewer used the assigned fleet Astra/xhigh pin and an isolated `codex/runtime-review` worktree. It read the complete runtime helper, original authoring source, export checker and fixed-fixture contract, the scene integration and surrounding cleanup, picking, supply and thumbnail paths. It compared the retained V5 source with the promoted authoring script and independently hashed the asset, source and inspected images. Outside the diff, it read `src/main.js:654-655` and `src/engine.js:1228-1232`, checking that simulation updates and seated reservations remain authoritative. No engine, interface, catalog, lockfile or save-schema change occurs in the reviewed diff.

The reviewer inspected the images listed below individually at native resolution through original-detail image delivery. It ran short renderer-free pose probes, disposing their characters in `finally`. It did not launch Blender, a browser, server, GUI, external CLI or the full product gate. The integration owner owns actual-input browser acceptance and the serialized full check. Optional external CLI lanes remain unavailable after the earlier automatic-approval rejection; they were not retried or counted as approving reviewers. The reviewer changed only this authored report.

## Reports

### Independent runtime and whole-effort review

The approved connected mesh survives runtime integration without restoring the rejected capsule mannequin silhouette. Native room/detail views at 2560×1440, 1440×1000 and 1024×1000, opposing fixed views and exploratory overhead views show continuous shoulders, elbows, hips and knees. The hands now reach the actual table edge and have downward-facing palms, rather than the prototype's palms-up short reach. The visible hips meet the cushions, and the shown seated legs clear the chair fronts. Candidate portraits are framed and legible; HIRE ghosts remain translucent on floor and grass; the selected employee inspector displays the expected character. The static evidence does not establish temporal foot contact, pickup/release behavior or live carried ware.

Comparison with the native reference images is qualitative. Camera, layout, lighting and original assets differ. The current actors have a coherent simplified adult silhouette and no visible bead joints, shoulder gaps or trouser wings in the inspected game views. The rejected renderer provides a matched scene comparison. The three external reference images remain attributed in `docs/research.md`; this report does not claim pixel equivalence or full visual parity.

The architecture is proportionate to the defect. A synchronous local asset and a small pose helper avoid adding an importer, asynchronous loading, dependencies or engine state. `createCharacter` gives each actor independent bones, skeleton/bone texture, geometry attributes and materials (`src/characters.js:53-104`). The scene's `clearChildren` detaches scene-owned ware before disposing character resources (`src/scene.js:369-383`); removal/replacement, ghost replacement, thumbnail `finally` and scene teardown reach the disposer. Actual triangle picking still walks to the stable actor-ID ancestor (`src/scene.js:668-677`). The conservative mesh sphere is separate from the posed bounds used for portraits and hover outlines. No material ownership or disposal flaw was found by source inspection; CPU disposal events do not establish GPU memory behavior.

The promoted authoring source preserves V5 geometry and weights. Its changes from the retained original source add command-line output/evidence options, a render-free export path and fixed accessory triangle ordering. The ordering assertion compares oriented triangle sets before replacing their order, preserving the approved topology rather than masking a mesh change (`scripts/build-character.py:410-422`). The export checker binds the approved asset hash to fixed independent Blender landmarks, tests the compiled runtime factory and retains detached-elbow, rigid-elbow and literal rejected V4 garment-weight controls. The numerical bounds are explicit. The worker's receipt reports 2,958 triangles, 20 bones, 1,585 compiled vertices, eleven fixtures with maximum landmark error 0.000009918 world units, and 48 independently disposed instances. These are numerical/source and CPU resource claims, not visual or GPU performance acceptance.

Two material transition defects remain at the initial target. **F1:** the carrying branch applies its final arm target immediately whenever a carried child appears and removes it immediately when the child disappears (`src/characters.js:227-229`). Unlike walking and seating, it has no transition state. An independent one-frame probe at `dt = 1/60`, idle pose and support height 0.1 moved the right palm 0.4141123014 world units on both pickup and release. This makes an ordinary service event jump between distant arm poses and fails the planned natural carry transitions. **F2:** pausing snaps the displayed actor group to the simulation target and snaps its heading (`src/scene.js:831,838`), while `updateCharacter` freezes only the existing local pose (`src/characters.js:157`). Any interpolation lag becomes an instantaneous visible move at pause; the planted feet move with the group. A local-bone freeze assertion cannot detect this scene-level transform change.

The integration owner accepted both findings and authorized a bounded runtime repair: blend the carry transition, and freeze the displayed root and heading during pause while preserving initial load and true teleport handling. This requires no mesh redesign. The whole effort should continue with that focused repair and actual motion/service acceptance; another art candidate or a general animation framework is not justified by the current evidence. Five art candidates have already produced the approved mesh, and the remaining issues are localized integration behavior.

### Focused repair source review

At `e2365bf`, the carrying amount blends toward its target and the three right-arm joints interpolate from their current relaxed/walking pose toward contact. The carried group is kept directly above the actual moving palm, with its orientation leveled independently throughout pickup. Release blends the empty arm back. A small shared placement helper freezes the displayed root and heading on ordinary pause. Scene replacement explicitly requests reset, so loading a different saved game still reconciles authoritative coordinates; fresh actors and running teleports also snap intentionally. Ground correction on a paused actor preserves the local pose while allowing a newly painted floor to support the soles. These are scoped repairs to the reported defects, without a mesh or engine change.

The reviewer independently repeated a short exact-source probe against the integrated repair. First pickup displacement is 0.0551986973 world units; first release displacement is 0.0550604735, compared with the retained 0.4141123014-unit defective jump. With a real pending position/heading interpolation, ten paused updates preserved root `[0.0460554825, 0.1, 0]` and heading `0.1040552168` exactly. The new retained temporal checks cover the full settle, level ware contact during transition, fresh paused placement, floor edits and deliberate restoration of the old instantaneous endpoints and pause snap. The repair source addresses F1/F2; real input and dense temporal pixels remain a separate acceptance requirement.

## Findings and disposition

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | User-reported unnatural characters; original rigid renderer remained unaccepted. | Closed for the reviewed correction at `e2365bf`: integrated mesh, seating, grass/floor presentation, service and focused transition evidence pass the stated bounds. | Preserve the approved mesh. This is bounded technical/visual acceptance, not a substitute for the user's aesthetic judgment. |
| F1 | Pickup/release instantly moves the right palm about 0.4141 world units in one 60 Hz update. | Fixed at `e2365bf`: source and independent numerical repair checks pass, and the focused capture shows visible release and empty-arm return. | Numerical first steps are now about 0.0552 units with level ware. Original pickup evidence and the later clean-bowl release windows close the integration finding. |
| F2 | Pause snaps displayed root/heading to the simulation target despite frozen local bones. | Fixed at `e2365bf`: exact helper probe preserves root/heading, and actual pause frames remain visibly stationary. | Closed for ordinary pause. Fresh-load reset is covered by source and paused reload evidence; no mesh or engine change. |

## Verification

The integration owner reports `npm run check` passing at `0be4fcf`: 78 simulation tests, character checker and production build, with the existing bundle-size advisory. The reviewer read the worker's `tmp/rigging-study/runtime-proof.json` receipt and inspected the check implementation, but did not duplicate the full gate or Blender reproduction. Dependency audit is not required because dependencies and the lockfile are unchanged. The short reviewer carry probe ran against the exact worktree source and disposed its character; it measured CPU pose endpoints only.

The owner also reports the final integrated `e2365bf` check passing all 78 tests, character/temporal checks and build, with the existing 857.85 KB bundle advisory. The reviewer read the worker's `transition-proof.json` and the entire temporal-check diff, then ran the separate short repaired-source probe described above. No full gate was duplicated.

The reviewer read the complete actual-browser resource instrument and receipt in primary `tmp/scene-browser/rig-resource-browser.js` and `rig-resource-result.json`. The instrument wraps WebGL create/delete functions while retaining their calls and return values, counts live objects by identity, and reads cloned counter values without changing engine state. After warming the portrait cache, twelve actual UI cycles reopened cached portraits and created/cancelled a fresh HIRE preview. Every closed cycle returned to 5,046 buffers, 17 textures, 8 programs, 6 framebuffers, 3 renderbuffers and 3,864 vertex arrays. Each visible preview added six buffers, one texture, one program and one vertex array; cancellation removed them. The receipt records no JavaScript errors and unchanged paused game state. This supports repeated preview disposal and stable post-warm API resource counts in SwiftShader. It does not represent twelve independently regenerated portrait sets, actor-removal stress, hardware-GPU timing, driver memory or complete scene-teardown measurement.

The completed repaired-target furnished service receipt records seven served guests and no JavaScript errors, with ware conservation and save/reload equality at the exercised phases. Meal carry occurred at elapsed 19.5, seated eating at 23.5, dirty carry at 41.25, five-item machine washing at 115.5, unattended completion at 119.75, clean carry at 126 and all five batch items stored at 136. The reviewer read the complete actual-input harness and parsed receipt. UI controls set staff priorities and simulation speed; observation uses the read-only inspection clone. The native meal, eating and dirty-carry crops show connected limbs, level ware above the palm, seated palms facing down, table reach and chair clearance. Clean-carry-1 shows a complete actor and level clean plate. Clean-carry-0 clips the lower actor and clean-carry-2 misses the actor entirely; both are retained capture limitations and are excluded from complete-actor/angle acceptance. Walk frames at elapsed 20.25, 20.5, 21, 21.25, 21.5, 22, 22.5 and 23 show travel, changing stride and a handoff, but their irregular intervals cannot establish continuous smoothness or temporal sole contact.

The following repaired-target images were individually inspected at native 460×440. They are crops from the actual game, not isolated authoring renders. Hashes bind even the two explicitly excluded captures; listing an image does not turn its missing content into proof.

| Inspected file under primary `output/playwright/` | SHA-256 |
|---|---|
| `scene-rig-furnished-meal-carry-0.png` | `6c22b42b782bf527a576e577d714b146962c1b16efe3308e8725f78545c61e92` |
| `scene-rig-furnished-meal-carry-1.png` | `220ec36cc04d483ff944715d6898e8755b40602a75fcf6bfdeb4610f0b3671cd` |
| `scene-rig-furnished-meal-carry-2.png` | `ed09a20f31d52013e011be3e5e288d7cfc638027e384d653f60904411229b7c2` |
| `scene-rig-furnished-walk-0.png` | `65f2979bfa9f75502157f6abc612842263602b0309317f3a138963475c3f720d` |
| `scene-rig-furnished-walk-1.png` | `7e8f102b396f81c3e31ae28ad82632bc129b3114ce0083405aacd26eb96ea54a` |
| `scene-rig-furnished-walk-2.png` | `f2eaf7ee55475133196f8b77055624c9d9b41243fbda3e0ff37acd57626d8561` |
| `scene-rig-furnished-walk-3.png` | `b685ad73f303ee4e905c15020c5215c1dd3f51c4879778047df960fb5cde1c6d` |
| `scene-rig-furnished-walk-4.png` | `f307c4b218afd247edd382bfefc21bb0102ae6f900aed4d44e720e427a40aaed` |
| `scene-rig-furnished-walk-5.png` | `d92383adfaf94ab42ac56c674f4277b1aadda1363a2ed7a04feac4d6e819e907` |
| `scene-rig-furnished-walk-6.png` | `670035b2c667e496c146c3b2b2762a3cb247eeb0058df16bf3435d493227b2c2` |
| `scene-rig-furnished-walk-7.png` | `58dcf76c1db79c317988afdc9b44820bae13da5145b20679b4076e7eb9c4f835` |
| `scene-rig-furnished-eating-0.png` | `d59585b83c687d30b2df868fc72e831ea0e77f213ac902b238e342ec38cf84b5` |
| `scene-rig-furnished-eating-1.png` | `d360ef726bfe196008a3ace4253838091fe90944d696007adb59e1efb2b0e5f5` |
| `scene-rig-furnished-eating-2.png` | `fe419b06b356e9d34ad3a8dca5567153e0f84f0731e2fe4159c24d5666e96caf` |
| `scene-rig-furnished-dirty-carry-0.png` | `80c0ab031f050e189c29f107e3973202384198c66c36ee1d007c5e98e0b6b5f7` |
| `scene-rig-furnished-dirty-carry-1.png` | `ea0148d1a8475e8b39d9978496bb354d4954901a456590ae0f29b86d4930f948` |
| `scene-rig-furnished-dirty-carry-2.png` | `b221ac8b12b5403519404dbfad584cd609d9caa84a05fc75faed03da8feb766f` |
| `scene-rig-furnished-clean-carry-0.png` (lower body clipped) | `d722c5b72f6a82d6ff44693486800527a9202efd82e298ebde93c13136d58d63` |
| `scene-rig-furnished-clean-carry-1.png` | `ac2470ef36b0f9efe142590dffb393cc0cf1e4a8f425d1cd19a050a2d0c66060` |
| `scene-rig-furnished-clean-carry-2.png` (actor absent) | `de746832e0ef91d837fd133fa10a6326c6246ad2d74ed25209a34a77bd8028b9` |

Receipt bindings, relative to primary: `tmp/scene-browser/rig-furnished-result.json` SHA-256 `6542ed026e60360bbad7d281b00e0487ff6ab59ee9c5357ed710008db0374f1f`; its `rig-furnished-service.js` instrument `52336dc3f5a700ba2cf8dfd2ad3cebf13c859b867b83a3ba0f01943e4650076b`; `rig-resource-result.json` `9c01f0ec00f84ff2b3f78e92e10845d1d221091b6917a451dc5733b0982101bd`; its `rig-resource-browser.js` instrument `2b90fd3445ff6b35e13855ddb12446af7754ec64cec47453d79b266e66a05ae3`; worker `.worktrees/scene-fidelity/tmp/rigging-study/transition-proof.json` `996519040a4e06d18acf32235d397b51485179566dfc0cebad408bcbd8ee1b00`.

The final furnished room and close captures were also reopened individually at native 2560×1440 against `e2365bf`. They preserve the connected silhouette and downward-facing seated hands in the complete game composition. `scene-rig-verified-furnished-room.png` has SHA-256 `34330b211b806d9c5f3a0641b3292e5fce54151944b72f30247305d3a147e4e0`; `scene-rig-verified-furnished-close.png` has SHA-256 `0d3ad5e0f7f3523e38d9a2e76e546464842521a0a97898851ab688e9b881c57c`.

The initial static captures are under primary `output/playwright/` and remain bound to `0be4fcf`. Each listed file was inspected at its native dimensions; hashes were independently calculated. Static paused views cannot prove smooth animation or service ownership. The separate `scene-rig-grass-context*` files are byte duplicates of furnished views and are not counted as placed-actor grass evidence.

| Inspected file | Native dimensions | SHA-256 |
|---|---|---|
| `scene-rig-2560-room.png` | 2560×1440 | `692a6a6c9e45cf87092f68027a7f9016b81f1a259fe48dd9e16161adc6576a4e` |
| `scene-rig-2560-close.png` | 2560×1440 | `5b2b03478a4258385b616bc86386e93fd862f254eec215ead4dfa50bf77c3310` |
| `scene-rig-1440-room.png` | 1440×1000 | `d513e204cfb2e17b086cc91641349f45049b3f5ac3bb81fd30a020cdeb1124c9` |
| `scene-rig-1440-close.png` | 1440×1000 | `0f068f483ebb793fea93baf6cc4fc5009beb3ef57b328c3a2d72c1da7c109951` |
| `scene-rig-1024-room.png` | 1024×1000 | `b64afc42f4493767a97372ce80b92eeae516cb4d635815ef791b94764e8f71a7` |
| `scene-rig-1024-close.png` | 1024×1000 | `18beef851be77b76221cae49aae3e5b1e5f642a099fe2435766bea5690fc1a9e` |
| `scene-rig-furnished-fixed-1.png` | 2560×1440 | `8d4f83a00747e050e3d9494ecc21811a1bf1c2b4152496f02a3c91a7e622c4ff` |
| `scene-rig-furnished-fixed-2.png` | 2560×1440 | `de5e81f4108e822eaca96821a9f7f7d6736130502caf12998c9e027b6157c68a` |
| `scene-rig-furnished-fixed-3.png` | 2560×1440 | `ab3559547479bd8d2066fcff65cce5bc25de0b84b5d1b3eb969f1b076ef4960f` |
| `scene-rig-furnished-explore-0.png` | 2560×1440 | `9828aa4b1ba4187cd68db0a216cfc67878f29065dd50d73a9c02ead89e0d2d9f` |
| `scene-rig-furnished-explore-1.png` | 2560×1440 | `ca1983c6b9ab90d32201c3d8853ca5447ac7c73b1b180f34c8370afd232fcb3b` |
| `scene-rig-furnished-explore-2.png` | 2560×1440 | `becb0e434dd8a2089c367ad1bce4c064eac8102c4eeb9e3f501e177fd90e61a5` |
| `scene-rig-portraits.png` | 2560×1440 | `f41d92ee27111817d9289295ff82b271844b872af344a6e0decd35a134a5e9c0` |
| `scene-rig-preview-floor.png` | 2560×1440 | `7cc81f70e3b53d60f93e64c8aad6f0c84ed6dca830d7dc87c0a0d89a4380c00e` |
| `scene-rig-preview-grass.png` | 2560×1440 | `0b70518a34936f60acb60a6b7e412ffd24286d047f6ce037e6befe419a1dd649` |
| `scene-rig-actor-selected.png` | 2560×1440 | `65d1347308bcd956fc3b7cb7ef1c557c724d9017a4ed00a82afda12cde5f69d3` |

The reviewer also reopened the rejected `scene-rigid-baseline-close-0.png`, the three native reference files `21-cycle-transition-01.jpg`, `27-cycle-transition-07.jpg` and `04-dishwasher-empty-five-capacity.jpg`, and the retained V5 `seated-side-close.png`. The first four were delivered at 2560×1440 and the V5 image at 640×768. Their comparison is limited to the visible silhouette, seat/reach direction and surrounding presentation.

| Comparison file, relative to the primary checkout | SHA-256 |
|---|---|
| `output/playwright/scene-rigid-baseline-close-0.png` | `ae3ba307990bd4ef554bf780cb4784df91a10bc12bb2766c3288f46cea9917a2` |
| `output/reference-study5/21-cycle-transition-01.jpg` | `a5b5d2eaed9137f2280b39b7639f7d5bc5079cfd972de877c03edf0986e3cb33` |
| `output/reference-study5/27-cycle-transition-07.jpg` | `b70321c68e79976574ff4979e926cb6f129d6ad55c4e11563fe3983cf9ae3438` |
| `output/reference-study5/04-dishwasher-empty-five-capacity.jpg` | `400c10fa76863dcd028e17e0d3de47ed2ea7c354834302491c4c16b59fa1308e` |
| `tmp/rigging-evidence/prototype-v5/seated-side-close.png` | `82cf7859c43f5dbfa83eb516ef0842401d2d25965c0382d24f855343d72244da` |

The repaired outdoor set was independently inspected at the native dimensions below. Room and close views at all three widths, opposing fixed views, exploratory views and seated-eating views show actors on grass without the earlier duplicated-context evidence error. The visible shoes meet grass, seated hips meet cushions, the downward-facing hands reach the table, and the carried meal bowl stays level and clear of its carrier in the steady pose. Nearby staff can share a simulation position and occlude one another; this is not treated as a disconnected rig. The overhead HIRE image establishes a translucent placement preview on grass, not detailed foot-contact inspection. These remain static observations.

| Inspected file under primary `output/playwright/` | Native dimensions | SHA-256 |
|---|---|---|
| `scene-rig-outdoor-1024-close.png` | 1024×1000 | `9e3f1c39ae255d1853a9f234b6bc8e3c422a4fd966c502c901da35f9f7805b9d` |
| `scene-rig-outdoor-1024-room.png` | 1024×1000 | `340be6e92b431314fb6adb8b3cdbebd23a0cc0eab7089f3aa5140784b5817ea1` |
| `scene-rig-outdoor-1440-close.png` | 1440×1000 | `ac8e735bab66ad11ad6a87c2df8ffca587e53e453f1fd97d60b1eb8ae59eed36` |
| `scene-rig-outdoor-1440-room.png` | 1440×1000 | `ab1fb493fd3dbc997369b8b9242c8e8a481704495e0a094fb35975afa4d99ac8` |
| `scene-rig-outdoor-2560-close.png` | 2560×1440 | `d8cf08ecbb496897c7bdcf003bc65ebff3481d08e17cdd267483156357dce4a9` |
| `scene-rig-outdoor-2560-room.png` | 2560×1440 | `e97fb748d13dee7c578d903093f1957c34e3de6d1ec21f028f9b0f0d63e684d9` |
| `scene-rig-outdoor-eating-0.png` | 2560×1440 | `e739d1ff14604a0f5347db1f72ce922665c983e504ee893a10869e52f227ad27` |
| `scene-rig-outdoor-eating-1.png` | 2560×1440 | `c9418816298929ca692115a691e7f08c1bc2945c8016752e1ca94fd5c968d851` |
| `scene-rig-outdoor-eating-2.png` | 2560×1440 | `270d26eda14d4b10897ebc9c00103f3ea3b298935dbe1c99a3acfc1c92e79ea2` |
| `scene-rig-outdoor-explore-0.png` | 2560×1440 | `800e070bf1d6ade36affb5ba817f648e88b18e47c6fc8f88a9ff5dceaf00b9e9` |
| `scene-rig-outdoor-explore-1.png` | 2560×1440 | `970d6f98cdbd057e1cc9969a232b869f1f8d00d83bd27c0cbc7a0e5a66ca102f` |
| `scene-rig-outdoor-explore-2.png` | 2560×1440 | `b4584b0c2b701b7e92137457f7db5045117eb02db0648fd9d7d7fcf0b9dd88ba` |
| `scene-rig-outdoor-fixed-1.png` | 2560×1440 | `9180caaab900a11d26c7c0f17f0dffbaa4b251adf8d2a359874f53bc486873ef` |
| `scene-rig-outdoor-fixed-2.png` | 2560×1440 | `f3d4d21b5207cfe26928dabc6651fdf3f81327557715c17c71ca32c2e6dce551` |
| `scene-rig-outdoor-fixed-3.png` | 2560×1440 | `1022f5ce0bab42324ca3b03bf0c7ed02f312cfa149037513781c51bc8a43790b` |
| `scene-rig-outdoor-hire-grass.png` | 2560×1440 | `b1a6dbe7bd1efddeb3a6731eedd702260673f86ae4164feee0cf703b0aea2af0` |

The outdoor actual-input continuation passed without JavaScript errors and retained ware conservation, floorless setup and paused reload equality. Its observed meal carry was at elapsed 174, eating at 174.25, five-bowl washing at 290.75 and clean-bowl carry at 294.75. Clean-bowl views 1 and 2 show the complete carrier from opposing sides, with a level empty bowl above the hand; view 0 shows the same hand/ware relation while the dishwasher naturally occludes the lower body. This closes the earlier missing clean-angle evidence without changing product geometry.

The reviewer read the complete continuation harness and inspected all 21 retained compositor PNGs and the separate paused screenshot. The sequence is actual gameplay at 1× speed, with a fixed rule choosing three delivered frames before and after each observed event from 69 recorded frames. It shows changing stride before pickup, a bowl appearing and extending beside the carrier, and a visually frozen pause in frames 09–14. The earliest waist is partly hidden by the adjacent cook. The event times are observation/input times, not exact visible engine ticks. Critically, frames 15–20 still show the bowl held beside the guest, so this selected window does **not** prove visible release or the subsequent empty-arm return. The resumed first-motion interval is also not retained. This is an evidence-selection limitation, not a newly confirmed product defect; a later focused window is required before claiming release acceptance. The CDP timestamps span `1792291414.284260` to `1792291419.073444`, with irregular gaps, including the intentional pause and event-window gaps. They are not a 60 Hz recording or hardware-GPU performance measurement.

The outdoor receipt `tmp/scene-browser/rig-outdoor-result.json` has SHA-256 `b034d5c7b6566767724e96dcdc475efb8f709f8da9998a8fdbc85d87b747ae74`; its reviewed `rig-outdoor-continue.js` instrument has SHA-256 `b609e5d80d37c55f529ca6a2516fc6b602c734a785ec999c148344682d6a8a9f`. Frame hashes below were independently checked against the receipt.

| Inspected file under primary `output/playwright/` | Native dimensions | SHA-256 |
|---|---|---|
| `scene-rig-motion-00.png` | 1440×1000 | `e8bb15821db35023b541aaf138b821a74f45eb6c24d8308217daaa9c5aef9aac` |
| `scene-rig-motion-01.png` | 1440×1000 | `2c0b604e79d18cd4d0cfc9a06fc84d7706cafe50484b1a07798ddc9db693b6d5` |
| `scene-rig-motion-02.png` | 1440×1000 | `533c25259b77d89856e066b61292139ef8cfae704342826f1c2dbc8504edec9d` |
| `scene-rig-motion-03.png` | 1440×1000 | `f4b8e3b5c2c243556a01ae74b9f864d5fb0e1a34b9b4ca5f9179a58c157f6d1b` |
| `scene-rig-motion-04.png` | 1440×1000 | `4e79f7fa0be41e4f0c7e08031e5c1789a0aab79f9e764c5e3b3e5b8818c1ae0e` |
| `scene-rig-motion-05.png` | 1440×1000 | `e1a21f307e72a1f3256edf9fc0a1be22ffe96c06e93d3dfc0ff9804595efe081` |
| `scene-rig-motion-06.png` | 1440×1000 | `108ebe2914e4bdf7164fac285cfb256413bb2ec3bb227db315e14f6975ca2909` |
| `scene-rig-motion-07.png` | 1440×1000 | `4c076ac12f3ff918a946179bb73712296270768bafcccdc044d1adb3659d2d23` |
| `scene-rig-motion-08.png` | 1440×1000 | `d9d8c79623c93fc98acee954dea3f2173ea9ae87eb28b55fd3702cc70ff1d405` |
| `scene-rig-motion-09.png` | 1440×1000 | `9dd7e31c3b1e792b115a120aa143e11446d9ef94620be0c30986559a08c93556` |
| `scene-rig-motion-10.png` | 1440×1000 | `9dd7e31c3b1e792b115a120aa143e11446d9ef94620be0c30986559a08c93556` |
| `scene-rig-motion-11.png` | 1440×1000 | `2e115005d0fefdc3394ab822fde03d315c558eb3cb0c905cd320cb0368f0b28e` |
| `scene-rig-motion-12.png` | 1440×1000 | `6d7efee68dab1aef772fddf052ee36eb96c4e6b1c9a0ba4adc32986ff20c5aac` |
| `scene-rig-motion-13.png` | 1440×1000 | `6d7efee68dab1aef772fddf052ee36eb96c4e6b1c9a0ba4adc32986ff20c5aac` |
| `scene-rig-motion-14.png` | 1440×1000 | `6d7efee68dab1aef772fddf052ee36eb96c4e6b1c9a0ba4adc32986ff20c5aac` |
| `scene-rig-motion-15.png` | 1440×1000 | `7143052fb514de7042cab14af39e7e33fc9afbe8d54faf77d3795ac2ee29ac6c` |
| `scene-rig-motion-16.png` | 1440×1000 | `d501920a7bc127616b309549e53a3a17cb2e36918cb4ae09b8ddcdbbaf2c9a41` |
| `scene-rig-motion-17.png` | 1440×1000 | `8caa5c0d0edbc3f5de21a820052776b39be592ca85b247011cae929bd5a7c300` |
| `scene-rig-motion-18.png` | 1440×1000 | `5e2edb37d961ff9f316ea5ce705201673ca7dcbbf519d88fc1f579ff3114357a` |
| `scene-rig-motion-19.png` | 1440×1000 | `558845bb611afa4a0066348f9dc435d3fab191a3935116b1b9128dd6b13506d7` |
| `scene-rig-motion-20.png` | 1440×1000 | `38ace79fa4319ee8585cadbfd1208f1d5249044e28a63751b4d58fd94779ff58` |
| `scene-rig-motion-paused.png` | 1440×1000 | `0c48d4d7e55d46c33ca8bc371eec9c223173d804e068dae5aed51f08ea29b306` |
| `scene-rig-outdoor-clean-bowl-0.png` | 2560×1440 | `72538a1369f411d1020a8870a34156c8f767cb771532946241d2218878ab58f3` |
| `scene-rig-outdoor-clean-bowl-1.png` | 2560×1440 | `1bbf33b21274b7c4d749084004d21e84f4dcc60ddcb1a016afa876ec04bf7d71` |
| `scene-rig-outdoor-clean-bowl-2.png` | 2560×1440 | `5dc6c500220d63536ca7e3367ed2cde18b0aace4df48db6274c62b00076ffecb` |

### Focused visible release and resume closure

A second actual-input capture at the unchanged `e2365bf` target closes the earlier selection gap. The reviewer read the complete `rig-transition-confirm.js` instrument and result, then inspected the 33 original 1440×1000 PNGs listed below. The full capture retains all 127 raw frames; a fixed selection rule retained every sixth frame plus two before and six after the input/release observations, yielding 52 PNGs. This reviewer independently inspected the two release windows, the intervening freeze and first resumed movement, and later settling. The owner separately reports inspection of all 52; that is not substituted for this reviewer's narrower 33-frame inspection.

Frames 051–055 show the first bowl held; 056 shows its disappearance, followed by the lowering empty arm and turn in 057–059. The actors remain visually stationary through the inspected paused frames 060–070, apart from button styling. Frames 071–072 show the first resumed stride and continuous carry for the other workers. Frames 093–100 show the second return and the empty arm settling; 102, 108, 114, 120 and 126 establish subsequent ordinary movement without a stuck raised arm. The carried bowls remain level in the visible intervals. These frames expose the missing transitions and show no new deformation defect.

The receipt observes the first release at elapsed 299, pause at 299.25, a 700 ms frozen-state check, resumed motion, and the second release at 301.5, followed by 2.2 seconds of continued running. It records no JavaScript errors and checks ware conservation. Input event timestamps are recorded after awaited button actions. The immediately observed next carried unit already belongs to another worker; this is not evidence of the same actor picking up a second bowl. CDP frames have retained capture and delivery timestamps with irregular intervals. The visual result plus the exact-source numerical transition checks closes F1/F2 for the tested path, without claiming 60 Hz recording, hardware performance, or every possible collision-free pose. The earliest meal-pickup waist remains partly occluded in the original window; the report does not infer invisible clearance.

Receipt bindings under primary `tmp/scene-browser/`: `rig-transition-confirm-result.json` SHA-256 `e7720a57198c476a5bf0bdaa525560691c7316e0d1a91ba33e02f2cf0db3b5b8`; reviewed instrument `rig-transition-confirm.js` `de93a5b09ec8ac3b983cafadb59f9922e690e4a6f896f246d3118654349a2676`; retained all-frame source `rig-transition-confirm-raw.json` `77bd48e774cc9256b76dde0d7a7fdc29fea071d2abe70ddb352929ef426d714d`. Each listed original PNG was independently hashed and inspected at native 1440×1000.

| Inspected file under primary `output/playwright/` | SHA-256 |
|---|---|
| `scene-rig-confirm-051.png` | `d6e81a2b801e28b64107f85dc5bb6b72050a86a4ffa8411489b48e592f4fde7c` |
| `scene-rig-confirm-052.png` | `33f6a2a4ceb0a9002583ce2cffd6700f988fc86b188a6e5fb2c54e55c2ecf62d` |
| `scene-rig-confirm-053.png` | `e341759f11f723e0437bc220c4305cd57dbdfa34cfb8d29da5dd90a76d2ebb10` |
| `scene-rig-confirm-054.png` | `1666620120c0ebb27dc6549b389c8ba5321ac3d14c65e7b270d8af703136c26c` |
| `scene-rig-confirm-055.png` | `313594a12f57bb15b4f99c26135089be201b6521c9d2475d785fb8874c1686d5` |
| `scene-rig-confirm-056.png` | `d0121e101f19eb63aa4a40bb77e6d395d5270ac4e6d62a6b8f7f235a83f9a38d` |
| `scene-rig-confirm-057.png` | `3ebf31b6b22f4be0abbfbb36054bf75a336ead3eae19ab751d9d4ae4ca7c3c42` |
| `scene-rig-confirm-058.png` | `fd90f49b91500f01c15fa7251fd9cb1161e9de14102979f68b6b0bf0cb3e246d` |
| `scene-rig-confirm-059.png` | `fed0bc2b2adc36a3c00e1f97d82fa7a3c10c43b7ac2922bf687ea8c40b5d11e9` |
| `scene-rig-confirm-060.png` | `d437cfefea72cfd27ada601f18eca77b29e3442534239a99a6c071b3a6601a64` |
| `scene-rig-confirm-061.png` | `d437cfefea72cfd27ada601f18eca77b29e3442534239a99a6c071b3a6601a64` |
| `scene-rig-confirm-062.png` | `2ef82e30bf938b40bf82c7b4abf6077f90592357fc1ad5ef5fb6934da9ec6dcb` |
| `scene-rig-confirm-065.png` | `1ae93b25f678b60e75acbece9377f3d6c55680f8700263dcdffa8eec773823dd` |
| `scene-rig-confirm-066.png` | `1ae93b25f678b60e75acbece9377f3d6c55680f8700263dcdffa8eec773823dd` |
| `scene-rig-confirm-067.png` | `1ae93b25f678b60e75acbece9377f3d6c55680f8700263dcdffa8eec773823dd` |
| `scene-rig-confirm-068.png` | `1ae93b25f678b60e75acbece9377f3d6c55680f8700263dcdffa8eec773823dd` |
| `scene-rig-confirm-069.png` | `1ae93b25f678b60e75acbece9377f3d6c55680f8700263dcdffa8eec773823dd` |
| `scene-rig-confirm-070.png` | `1ae93b25f678b60e75acbece9377f3d6c55680f8700263dcdffa8eec773823dd` |
| `scene-rig-confirm-071.png` | `ae01d5748e10f0d212554b2636eb9a022141ececd174d25ad20ff831cdaa18e4` |
| `scene-rig-confirm-072.png` | `d6cd4e088fa315d4be0d4caa54b3422aa6c5edba4f2c4af1106af26867ff1c27` |
| `scene-rig-confirm-093.png` | `3d756b509e72854b76ac7ac0d6589e677881f0961db197707f3210286c58f37f` |
| `scene-rig-confirm-094.png` | `7ebe2b820a4be71e56283ef2e1b3456a9843d2e8a496bb6e00433959c4f85dd5` |
| `scene-rig-confirm-095.png` | `5e61059a083634e87671ae5041f8027cbe5fdba4b8ef5c275cfcd16820619a43` |
| `scene-rig-confirm-096.png` | `3647db5ba1108e390a388081bd5bdefe9e6ed0b7a88581af9b1437ca61d9354c` |
| `scene-rig-confirm-097.png` | `5662b1f9dbd9c6ab6eac4bed0dd925e084ba3daea82e8636a2659a1e3a4201f5` |
| `scene-rig-confirm-098.png` | `38dbfe252fb114bc23a3b6cda26f9149debf14e0b18b548df5c015fecd54faf9` |
| `scene-rig-confirm-099.png` | `ea3d87d6cee28ad66a2c6eb1d8c00333a8f4a30292fc1d98276b92f4115d4cf3` |
| `scene-rig-confirm-100.png` | `51212f165bcf465d6be2825eb277101f4acdaeffb76d21bda6c6310392e9cc19` |
| `scene-rig-confirm-102.png` | `e34b56ddab7fa62d4b99dffca2dfa05356a4155fd060d8b23d2968d1c70ca604` |
| `scene-rig-confirm-108.png` | `9b4cd2152b22ab49f9214f018de7c5d7b358805d6eb3b501f92b268d452efbe5` |
| `scene-rig-confirm-114.png` | `420f5d2c9b3d86abce0520183e62016fc8f522e0aab34fbf91ab6d5ba2a63a3c` |
| `scene-rig-confirm-120.png` | `b8cba10d336907304c7a8c25c5fcfcbc4ccc5e1b2d8a02ab1394b337a5f6d4e4` |
| `scene-rig-confirm-126.png` | `6f9db19568be2deb3178333d0636486db67da41fe9f8a57ea3915d1a81912bf9` |

## Round outcome

Initial target `0be4fcf` was not approved because F1 and F2 were material runtime findings. The repaired product target `e2365bf7c29516a5359649b1605f15c5c9362c0c` is approved within this report's bounded acceptance: source review, independent numerical reproduction, the owner's passing integrated gate, furnished/outdoor service, native static contacts, actual pickup, visible release/empty-arm return, frozen pause and first resumed motion. F0, F1 and F2 are closed for this correction. No additional mesh iteration, framework, engine change or unresolved material architecture finding is warranted by the reviewed evidence.

The remaining limits are explicit: irregular software-rendered compositor samples, occluded earliest pickup waist, API resource counts rather than driver memory, and no hardware-GPU performance claim or exhaustive actor-collision proof. The README source/export command addition was also read and matches the authoring/check scripts; it does not change the reviewed product source. This reviewer created no browser, server, GUI, daemon or temporary resource requiring release. All evidence remains intentionally retained by the integration owner; only this report is committed from the review worktree.
