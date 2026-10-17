# Restaurant simulation contract

The browser client imports `ITEMS`, `RECIPES` and `SCENARIOS` from `src/catalog.js`, and `createGame`, `dispatch`, `tick`, `getStats`, `serialize` and `deserialize` from `src/engine.js`.

`createGame(mode = 'sandbox')` returns a furnished restaurant; `createGame('empty')` returns owned land and a building budget with no furniture or floor.

`dispatch(game, action)` mutates the game only for an accepted action and returns `{ ok, message }`.

The action types are `PLACE { itemType, x, z, rotation }`, `STROKE { itemType: 'wall' | 'window', cells: [{ x, z }], rotation }`, `REMOVE { id }`, `FLOOR { x, z, style }`, `FLOOR_STROKE { cells: [{ x, z }], style }`, `HIRE { role }`, `FIRE { id }`, `PRIORITY { id, role }`, `PRICE { recipeId, price }`, `TOGGLE_RECIPE { recipeId }`, `SPEED { speed }`, `TOGGLE_OPEN`, `EXPAND`, `RENAME { name }` and `SCENARIO { id }`.

Coordinates are integer tile cell indices in a 24 × 24 world; the renderer places their centers at (x + 0.5, z + 0.5), initially owned land is x/z 4–19 inclusive, and the visitor entry is (11, 3).

Every catalog object occupies one tile; `rotation` is normalized to degrees 0, 90, 180 or 270.

Strokes accept 1–24 unique, contiguous integer cells in a single row or column; order may be reversed, and every tile, collision and total charge is checked before any mutation.

Long wall/window strokes align their rotation to the row (0° or 180°) or column (90° or 270°); omitted rotation follows the stroke axis, and a mismatched rotation is rejected.

Existing segments of the same structural material are no-ops, retaining their orientation and IDs, so four inclusive rectangle strokes share corners without extra charges; wall/window strokes cannot overwrite other materials or furniture.

Wall and window construction works on bare owned land; closing a structural boundary of walls, windows and doors automatically fills its missing interior floor tiles with `peach` at no extra charge, and existing floors survive subsequent construction or wall removal.

Floor styles are `peach`, `wood`, `tile`, `kitchen`, `stone` and `checker`; explicit floor changes cost $12 per changed tile, and unchanged floor stroke cells are free no-ops.

Doors may replace walls or windows, preserving the host segment's ID, alignment and any floor; the first successful door placement is free, subsequent doors cost the catalog price, and replacing a paid segment grants no refund for the removed wall/window.

Current basic costs are wall $12, table $50, chair $25, refrigerator $150 and counter $50; other prices remain catalog-defined.

The item keys are `table`, `chair`, `stove`, `prep`, `fridge`, `sink`, `toilet`, `plant`, `wall`, `door`, `counter`, `bin`, `painting`, `clock`, `flowerbox`, `lamp` and `window`; all have `name`, `category`, `cost` and `color`.

`tick(game, dtSeconds)` consumes real seconds, multiplies them by `game.speed` (0, 1, 2 or 3), and advances a fixed-step simulation; callers must not multiply by speed again.

One game hour takes 20 simulation seconds, and customers, staff, cooking and eating run on simulation seconds.

The serializable game includes the agreed `version`, `mode`, `cash`, `day`, `time`, `speed`, `open`, `land`, `floors`, `objects`, `staff`, `guests`, `menu`, `stats`, `events` and `scenario` fields.

Additional persisted fields are `name`, `orders`, `seed`, `nextId`, `elapsed`, `accumulator`, `arrivalIn`, `bankrupt`, `unlocks`, `completedScenarios`, `doorGrantUsed` and `daily`; individual moving actors include paths, timers and task targets.

Newly purchased objects record optional `purchaseCost`; refunds use that paid amount, so a free door refunds $0, and used first-door grants remain used after sales and save/load.

Version 1 saves without `doorGrantUsed` infer it from currently present doors; an older save with a previously sold door cannot reveal that history and receives an unused grant. Older objects without `purchaseCost` retain the catalog-based refund rule.

Guest states are `arriving`, `waiting`, `ordered`, `eating`, `toilet` and `leaving`; guest `x`/`z` positions interpolate between tiles, and optional `tableId`, `seatId` and `orderId` link occupants to restaurant objects and orders.

Orders move through `queued`, `cooking`, `ready` and `served`; staff have role-specific assignments in `task` and optional `taskTarget`/`orderId` fields.

`getStats(game)` returns the stored stats plus `cash`, `day`, `time`, `guests`, `seats`, `tables`, `staff`, `orders`, `profit`, `occupancy`, `availableRecipes`, `warnings`, `scenarioProgress`, `bankrupt`, `hourlyWages`, `hasRoom`, `hasEntrance` and `buildingReady`.

`hasRoom` means a structural boundary encloses at least one interior cell; `hasEntrance` requires an exterior door with walkable neighbors inside and outside and a route from visitor entry. `buildingReady` combines those construction conditions; staffing, menu and dining warnings remain separate, and existing outdoor service remains available.

Save strings are versioned JSON; `deserialize` rejects invalid types, nonfinite numbers, invalid object types, duplicate IDs, impossible actor links and invalid coordinates, and throws an explanatory `Error` rather than partially loading corrupt state.

Saved paths must follow adjacent grid tiles without crossing solid furniture; guests may occupy their own chair or end an arrival path there, and a guest returning through their current chair tile during path replanning is valid.

Active tasks require reciprocal role, actor, order and station links; cooking and ready meals require a station compatible with their recipe, while an interrupted cooking order may remain unassigned until another chef takes it.

Occupied tables, chairs, toilets and stations holding unfinished meals cannot be sold; removing a facility that an actor is approaching replans or cancels the assignment immediately, so paused saves remain valid after public construction actions.

The engine uses seeded random numbers and no browser APIs; tests run with Node's test runner.
