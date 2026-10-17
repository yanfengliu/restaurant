# Review 2: integration

## Target

Reviewed on 2026-10-17: restaurant foundation candidate `f48688dc70a0d6b8213c55c8878562c82b6f05ef`. Focused delta from the preceding review target `79f3d2a3a722e704da44dc28bebf11b7f8ebcd5a`: occupied-facility removal guard and regression tests, startup save preservation, camera instructions, factual help copy, and interface readability changes. The reviewed product files exactly match `f48688d`; the review checkout also carries the retained round 1 documentation as a separate documentation-only commit.

## Reviewers and coverage

Codex reviewer `gpt-6-astra`, reasoning effort `xhigh`, independently inspected the changed engine, UI, tests, CSS, README, and contract, plus surrounding save lifecycle and unchanged camera handlers. This is a focused acceptance review of F2/F3 repairs, retaining the prior round's F0/F1 conclusions. No product code was edited, no subagent was used, and no browser, server, native application, or dependency installation was launched.

The integration owner retained exclusive browser acceptance ownership and supplied the results attributed below. This reviewer did not independently inspect rendered pixels, rerun browser input flows, or repeat the full build and dependency audit. Native reference-game exploration and further reference-informed features belong to subsequent work; this report does not claim full feature parity or completion of the user's broader goal.

## Reports

### Codex: gpt-6-astra, xhigh

**F2 — repaired.** The new guard at `src/engine.js:411` refuses to remove a toilet while an already-reached toilet guest is adjacent to it. The guard executes before object removal, refunds, and path rebuilding. `tests/engine.test.js:207-235` reproduces the actual public-action sequence, pauses before removal, compares the whole serialized state after the rejected action, and verifies immediate deserialization. The same test covers removing a toilet before the guest reaches it and removing a cleaner's target, confirming coherent cancellation and valid paused saves. The focused test passed independently at this target.

The overwrite consequence is also repaired. `src/main.js:47` distinguishes an absent storage entry from an empty stored string, so malformed and empty values reach validation. Failure sets `automaticSaveBlocked` at `src/main.js:52`. Both the frame-loop check at `src/main.js:472` and the silent-save guard at `src/main.js:313` prevent an automatic write, including `pagehide` at `src/main.js:489`. Explicit successful Save clears the guard after writing; explicit New Restaurant clears it before creating the replacement save; successful loading of a valid value also resumes normal saving. The settings text and startup toast explain preservation and the explicit replacement actions. No silent overwrite path was found for the reported failed-startup cases.

**F3 — repaired.** The scene description, visible hover instructions, help dialog, and `README.md:24` now identify Shift-drag or middle-drag panning and right-drag orbiting. These match the unchanged input branches at `src/scene.js:381-401`; the earlier plain-drag claim is removed. The integration owner reports real input-driven panning and orbiting with changed coordinate projections. This reviewer confirmed code-to-copy consistency, while actual gesture verification remains attributed to that owner.

**F0 and F1 remain closed.** The focused malformed-save test and perimeter test both pass. The current changes do not remove the source, collision, reciprocal-assignment, or wall-orientation repairs reviewed in round 1.

The inaccurate claims that reviews increase arrival frequency and that guests judge menu variety have been removed from the UI. The new help wording reflects the implemented happiness/rating relationship. The readability changes increase text sizes and contrast, give the overview a background, and reorganize narrow navigation into two rows. Their rendered layout and visual quality remain bounded by the owner's browser inspection rather than source inspection alone.

No new material finding was established in this focused review. The fixes are localized and do not require a larger architectural change.

## Findings and disposition

The integration owner accepted F2/F3 for repair in round 1 and supplied this stable repair candidate. The following closure assessment is the independent reviewer's conclusion; final merge and milestone acceptance remain with the integration owner.

| ID | Finding | Disposition and reason | Repair or follow-up |
|---|---|---|---|
| F0 | Invalid active saves were accepted | Closed; source, collision, and reciprocal assignment checks remain intact, and the focused malformed-save regression passes. | Preserve the existing persistence checks. |
| F1 | Starter side walls had the wrong orientation | Closed; the rotation repair remains intact and the focused perimeter regression passes. | Owner's rendered acceptance applies to this foundation candidate. |
| F2 | Occupied-toilet removal invalidated saves and could trigger overwrite | Closed; removal is denied atomically, immediate paused round trips pass, and failed startup saves are protected from automatic writes until an explicit replacement action. | Repair is present in `f48688d`; focused test and code review passed. |
| F3 | Advertised camera dragging did not match input handling | Closed; discoverable instructions match Shift/middle panning and right-button orbiting. | Repair is present in `f48688d`; owner reports successful real gesture checks. |

## Verification

- Independently ran `node --test --test-name-pattern='removing facilities|save validation rejects|starter perimeter' tests/engine.test.js`: three selected tests passed, zero failed. The other simulation tests were outside this focused invocation.
- Independently ran `node --check src/main.js` and `node --check src/engine.js`: both passed.
- Inspected the complete repair delta, the occupied-toilet mutation boundary, startup and manual save/load/new-game paths, automatic/pagehide saving, and camera documentation against the unchanged handlers. The checkout's only additional committed change over the target before this report was retained round 1 documentation.
- Integration owner reported the full 23-test check and production build passing. The owner also reported actual browser build/removal/refund, floor painting, prices, recipe toggles, hiring/reassignment/dismissal, six challenge selections, manual save/load, and exact reload checks passing.
- Integration owner reported malformed `'{broken'` storage preserved over 31 seconds and pagehide/reload, an empty raw stored value preserved, and explicit New Restaurant creating a valid version 1 empty-plot save.
- Integration owner reported five fixed camera views and three seeded pointer drags, inspected rendered pixels, changed projections after Shift-pan and right-orbit inputs, 1024-pixel and 390-pixel layouts without overflow, real Build/Menu opening, and zero browser console errors or warnings. These are attributed acceptance reports, not independent browser executions by this reviewer.
- No task-owned process or temporary output was created by this review. The only authored artifacts are the retained review documents.

## Round outcome

F0 through F3 are closed for the reviewed foundation candidate, with no unresolved material finding in this bounded review. The independent review supports foundation integration at `f48688dc70a0d6b8213c55c8878562c82b6f05ef`, subject to the integration owner's retained full acceptance evidence and normal merge gates. This verdict covers the original foundation and these repairs; it does not claim complete reference-game parity or acceptance of future features.
