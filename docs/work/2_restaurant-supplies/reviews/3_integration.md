# Review 3: integration

## Target

Repository `restaurant`, exact integrated target `d8b57dae7e0263e9c76fbc52299268de7b3c76ac`, with product repair integrated at `ed9198cfe6c6f55e4fdcb98ab651b7710111fbc2`. The approved contract remains `f9f0fc7b6906ba8f0d03d1f53801a24389a78499`. This is the focused follow-up to round 2's F6 portrait finding on `b1d2c123a82537df11845a376a331bcadd0e09af`.

The product diff from the round-2 target is exactly two insertions and one deletion in `src/scene.js`. This round reviews that repair, its integration impact and corrected portrait pixels. It does not repeat the earlier deep engine review or claim a new execution of the unchanged service flows.

## Reviewers and coverage

The independent Codex reviewer inspected the exact source diff, portrait construction and callers, thumbnail caching, renderer-state restoration and disposal. The reviewer independently viewed the original 2560 × 1440 hiring panel and all six original 160 × 160 employee/candidate PNGs, and verified the hiring/candidate file hashes against the coordinator's evidence.

Claude abstains: the coordinator's same-day pinned-lane smoke returned weekly-quota API 429 without a review. It was not retried, and its absence is not agreement. No additional agent, CLI reviewer, browser, native application or server was launched. Product files remained read-only.

## Reports

### Codex focused integration reviewer

**F6 is closed.** At `src/scene.js:698-699`, portrait bounds now use the generated person's `userData.body`; nonportrait bounds still use the complete asset. The only portrait caller at lines 688-689 constructs `personModel(candidate, true)`, whose body reference is assigned at line 436. This excludes the invisible status indicator at lines 434-435 that previously raised the bounding box above the visible head. The body contains the visible person geometry. Its unused carried group is empty when this standalone thumbnail is generated. After translating the asset, the code updates world matrices and recomputes the same body's bounds before applying the established portrait crop.

The prior inspected candidate panel placed heads along the lower edge beneath substantial blank space. In the corrected hiring panel, Drew, Charlie and Morgan each have a complete head, shoulders and visible upper body, with a small ordinary top margin. The three individual candidate images confirm that this is present in the actual PNG content. Alex, Sam and Jordan also frame correctly in their three employee PNGs. Similar appearances in some names are consistent with the existing deterministic model choices; this repair does not change appearance generation.

The cache key, 160-pixel target, PNG creation, cache insertion and failure handling are unchanged. Renderer-state capture and the `finally` restoration/disposal path are unchanged. The preview still uses a newly constructed standalone person, with no attachment to the live people map or game graph. The ordinary catalog branch retains the same bounds input. There is no engine, catalog, interface-action, persistence, dependency or test-source change between the reviewed product revisions, so this repair introduces no new reason to repeat the complete purchasing/service/washing/save scenario. The earlier exact-revision evidence remains explicitly bound to `b1d2c1`; source identity establishes its relevance to the unchanged engine and controls here.

The reviewer found no new material defect in this focused scope. Broader final viewport acceptance and the final integration gate belong to the coordinator and were still being completed when this report was authored. This review closes the portrait finding; it does not imply that every final matrix image was independently inspected by this reviewer.

## Findings and disposition

The table carries the stable IDs forward. Findings and owner acceptance are retained in their original rounds; no new ID is introduced.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Queued legacy ware can be stranded before preparation | Closed: owner accepted the deferred-grant contract; round 2 verified its implementation and legacy phase coverage. | Design `8bc50bd`; implementation at round-2 target `b1d2c1`, unchanged here. |
| F1 | Migration misses carried meals and absent historical fields | Closed: carrier-aware migration and explicit quality/recipe defaults were accepted and inspected in the implementation. | Design `8bc50bd` / `f9f0fc7`; round 2's seven-phase migration probe and code review. |
| F2 | Live catalog extension can reject valid version-1 graphs | Closed: frozen old validation precedes conversion and disabled Fries insertion. | Design `8bc50bd`; implementation and legacy round-trips reviewed in round 2. |
| F3 | Carried-meal disposal lacks a no-capacity path | Closed: the implemented forced disposal transfers ownership to the carrier and protected source without requiring a clean-return slot. | Accepted design `8bc50bd`; interruption/ownership code and suite coverage inspected in round 2. |
| F4 | Ready station meal renderer read the wrong field | Closed: actual `order.state` is used and stationary ready-food pixels passed independent inspection. | `8d24168`; round-2 ready close-up evidence. |
| F5 | Shared-table guest dishes overlapped | Closed: seat-derived local offsets and the actual two-diner shared-table capture passed independent inspection. | `8d24168`; round-2 evidence follow-up, including explicit unrotated-capture/static-rotation bounds. |
| F6 | Invisible status indicator misframes portraits | Closed: the owner accepted the finding and supplied the body-bounds repair; corrected hiring and all six portrait PNGs pass independent inspection. | Repair `7ad385d`, integrated `ed9198c`; exact target `d8b57da` reviewed here. |

## Verification

- Independently inspected the exact product diff and relevant scene/caller code. Only `src/scene.js` changed within `src`, `tests`, `package.json` and `package-lock.json` relative to `b1d2c1`.
- Original hiring panel: `output/playwright/supplies-hiring-2560.png`, 2560 × 1440, SHA-256 `10442d9791e63a66fce6869e8e960e426256a1051418cb00aec73233846004e5`.
- Original candidate PNGs under `output/playwright/supplies-thumbnails/`: `35-drew.png`, SHA-256 `fca1c22aca9dc77812e6f39e9745bd6e1d52cec958094a1ced94282426a21e06`; `36-charlie.png` and `37-morgan.png`, each SHA-256 `2eb20a49ebf1764de658b09b064e31ea34071299e6b4fa321d73287a315b320d`. All three are 160 × 160. The reviewer also inspected `32-alex.png`, `33-sam.png` and `34-jordan.png` at their original 160 × 160 size.
- Read `output/playwright/supplies-visual-result.json`. Its run record lists 28 captures across desktop widths 2560, 1440 and 1024, fixed/overhead/exploratory views, 37 loaded 160-pixel thumbnails and no browser errors. The coordinator reported inspecting all 37 thumbnails individually. This review's independent pixel inspection is limited to the hiring panel and six portraits stated above; other matrix acceptance remains the coordinator's responsibility.
- The coordinator reported the worker's 53-test full `npm run check` passed after the portrait repair. This reviewer did not rerun the broad gate or browser service scenario. Round 2 retains independent migration/renovation probes and the inspected actual-controls record for purchasing, priorities, active save/reload, service, complete ware return and shortage recovery on the unchanged engine.
- No new reference measurement was performed. Native full service/washing observation, exact reference timing and broad gameplay/visual parity remain outside the proven bounds. Inferred defaults retain that status.
- Work-document structure and staged whitespace checks passed before this report's commit. Only this review document was changed. All commands were foreground; no reviewer-owned browser, GUI, server or background process, temporary probe file or disposable output was created.

## Round outcome

F0-F6 have no remaining material finding in the reviewed implementation, with closure evidence and limits recorded above and in the prior authored reports. The exact target `d8b57dae7e0263e9c76fbc52299268de7b3c76ac` passes this focused repair review. The coordinator may complete the final integration gate and remaining rendered-view acceptance without another broad service run for this isolated portrait change. This is not a claim of full reference parity or unavailable Claude coverage.

### Evidence follow-up: completed final acceptance

After the initial report commit `cb8d68b`, the coordinator reported completion of the final full gate: 53 tests passed and the production build passed. The existing 691.24 KB bundle-size advisory remains; no other gate failure was reported. The coordinator also completed original-pixel inspection of all 37 thumbnails, the fixed/overhead/exploratory and full/cutaway views, and the narrow desktop menu, stock and priority panels, including the scrolled recipe detail. Those broad pixel claims are coordinator evidence, not additional independent inspection by this reviewer.

The reviewer read the executed code and result in `tmp/browser/narrow-panels.raw.log`. At widths 1440 and 1024, priority-table client/scroll widths were respectively 704/704 and 698/698. Actual wheel input moved the narrow recipe detail to scrollTop 24, with client height 487 and total height 511. This supports the recorded overflow/scroll checks within the exercised viewports.

The reviewer additionally inspected the original 500 × 350 `output/playwright/supplies-washing-close.png`, SHA-256 `8190a007d0875559d9b270d4137d9c2eeebdc87717aa6d89339cd8aefd2bc6ef`. The dish and pale washing bubbles are visible in the sink beside its employee. The executed code and result in `tmp/browser/washing-detail.raw.log` bind the frame to elapsed 45, plate ware-77 in `washing`, employee staff-76/Jordan in `dish-wash`, sink object-47 and return storage object-49, with timer 0.75. Actual priority, speed, pause and save controls reached the state; a browser reload reproduced the entire paused washing state exactly. Inspection APIs were read-only. This strengthens washing-render and active washing persistence coverage without replacing the earlier complete flow record.

With that final gate and rendered-view evidence, this reviewer approves the bounded milestone-2 implementation at the exact reviewed product target: all F0-F6 are closed and no material finding remains. This acceptance covers the documented milestone contract and inspected/tested behavior. The native reference's complete washing loop, calibrated timing/economy, remaining later-milestone scope and full reference parity remain unclaimed. Claude coverage remains unavailable. The follow-up changed only this authored report; document structure and staged whitespace checks passed again, and no reviewer-owned process or temporary resource was created.
