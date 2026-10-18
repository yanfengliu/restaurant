# Restaurant simulation contract

The browser imports `ITEMS`, `RECIPES`, `SCENARIOS`, keyed `INGREDIENTS`/`TABLEWARE` objects and the `TASK_GROUPS` string array from `src/catalog.js`; `src/engine.js` exports `createGame`, `dispatch`, `tick`, `getStats`, `getSupplies`, `getRecipeStatus`, `serialize` and `deserialize`.

`createGame(mode = 'sandbox')` returns a furnished restaurant with declared starter stock, twelve granted dishes, three employees and three candidates; `createGame('empty')` returns owned land and a building budget without furniture, floor or supplies.

The engine uses seeded randomness and no browser APIs. `dispatch(game, action)` mutates accepted actions and returns `{ ok, message }`; rejected actions preserve the complete serialized state.

## Construction

Coordinates are integer cell indices in a 24 × 24 world; rendered centers are `(x + 0.5, z + 0.5)`, initial owned land is x/z 4–19 inclusive and visitor entry is `(11, 3)`. Rotations normalize to 0, 90, 180 or 270 degrees.

Actions are `PLACE { itemType, x, z, rotation }`, `MOVE { id, x, z, rotation? }`, `STROKE { itemType: 'wall' | 'window', cells, rotation }`, `REMOVE { id }`, `FLOOR { x, z, style }`, `FLOOR_STROKE { cells, style }` and `EXPAND`.

Strokes accept 1–24 unique contiguous cells in one row or column, in either order; validate every cell and the full charge before changing anything. Wall/window runs align their rotation with the stroke axis; identical structural segments are no-ops retaining IDs and alignment, while other occupied cells reject the stroke.

Walls and windows can be built on bare land. A closed wall/window/door boundary fills missing interior floors with peach at no charge; existing floors survive later building changes. Explicit `peach`, `wood`, `tile`, `kitchen`, `stone` and `checker` floors cost $12 per changed tile.

A door can replace a wall/window, preserving its ID, alignment and floor. The first successful door is free; subsequent doors cost the catalog price. `doorGrantUsed` persists after sale, and `purchaseCost` records the actual price for 60% rounded resale, so a granted door cannot generate money.

All furniture can be placed on owned bare ground or flooring. One ground object occupies a cell; a counter may additionally support exactly one cutting board or fryer at the same ground coordinates. The child records `parentId`, inherits parent rotation and adds no second path blocker. Freestanding preparation stations remain valid. An adjacent table and chair provide a dining seat with either surface.

MOVE preserves type, ID, purchase cost, supplies, prepaid deliveries, return reservations, cash and expenses. The destination must be an empty owned integer cell with no current actor; a supported appliance instead requires a cabinet without another child. A cabinet carries its child; independently moved children adopt the new cabinet's ID and rotation. Omitted rotation preserves alignment, supplied finite degrees normalize to quarter turns, and a child always inherits support alignment. Identical moves are unchanged successes even when the item is busy; invalid actions reject the complete state unchanged. A real move retains ordinary renovation consequences, including departing unreachable arriving guests and their lost statistic, happiness and departure event/ID allocation.

Reserved dining furniture, a guest's toilet destination, committed meal sources, current employee task targets, reserved sinks and dirty-dish locations cannot move. Every member of a parent/child group is checked. Stored stock, clean dishes and incoming tableware do not prevent movement; a wash-return cabinet may move until it becomes the employee's current return target. Later return paths resolve its current coordinates. Walls, windows and doors also move without replacing other segments, retain purchase/grant history and create missing interior floors only if the resulting boundary closes. All real moves replan existing actor paths through the renovation mechanism.

Storage is shelf 12 units/$100, large shelf 24/$400, fridge 12/$150 and cabinet 10 tableware units/$50. Boards cost $50 and countertop fryers $100. Other item prices remain catalog-defined; fridge capacity is a playable inference.

Occupied dining furniture, occupied toilets, committed meal sources, active task targets, dirty dish locations and reserved storage cannot be sold. A supported parent must first lose its child. Stock, clean dishes, incoming units or reserved wash returns prevent storage sale; an empty ingredient store also cannot be sold if a configured batch would exceed remaining compatible capacity.

## Clock, employees and money

`tick(game, dtSeconds)` caps each call at 60 real seconds, multiplies once by `game.speed` (0/1/2/3) and advances quarter-second fixed steps. Callers must not apply speed again. Actors, cooking, eating and washing use simulation seconds.

Authoritative `calendarSeconds` starts at January 1 midnight. A day is 15 simulation seconds, a month is 30 days/450 seconds and a year has twelve months; `day` is absolute and `time` is the derived 0–24 phase. These are declared timing defaults, with no claimed native calibration.

`HIRE { candidateId, x, z }` chooses one of three persisted candidates and places a generic employee on an owned clear tile, outdoors or on flooring, without an upfront fee. It replaces the chosen candidate using separate persisted `candidateSeed`, preserving the guest/service random stream. Specialist `{ role }` hiring is retired.

Employees carry `skills: { cooking, speed, clumsiness }` in 0–1, `monthlyWage`, `wageAccrued` and four priorities. New candidate pay is `round(30 + 45*cooking + 45*speed + 30*(1-clumsiness))`. Cooking determines meal quality `0.6 + 0.4*cooking`, rather than cook duration; speed multiplies walking by `0.75 + 0.5*speed`.

`PRIORITY { id, taskGroup, priority? }` sets `normal/high/off/low`, or cycles normal → high → off → low → normal. Groups are serving, cooking, dishwashing and cleaning. Priority changes affect the next job; high precedes normal and low, off excludes new work, equal ranks choose the oldest reachable job and then the declared group order. Unavailable high-priority work does not starve reachable lower-priority work. Cleaning age resets after completion.

Each employee accrues `monthlyWage / 450` per simulation second; day boundaries pay and clear exactly the accrued sum, including a month boundary once. The new day's expenses include that settlement. `FIRE { id }` pays only that employee's accrual and safely releases unheld assignments, but refuses while carrying or washing a dish. Hiring partway through a day accrues only subsequent time; full precision is stored and displays round amounts. These proration and clock rules are authored defaults. Historical expenses remain intact.

Other actions are `PRICE { recipeId, price }` ($1–$150), `TOGGLE_RECIPE { recipeId }`, `TOGGLE_OPEN`, `SPEED { speed }`, `RENAME { name }` (1–40 characters) and `SCENARIO { id }`.

## Supplies and deliveries

Persist `supplies = { stocks, ingredientBatches, ingredientNextDay, tablewareQueue, tablewareNextAt, ware, wareLedger }`, with an optional last ingredient failure reason. Stocks are sparse positive integer `{ storageId, ingredientId, quantity }` records, unique per storage/ingredient pair and compatible with shelf or fridge class.

`INGREDIENT_BATCH { ingredientId, quantity }` sets a fixed recurring batch from zero through compatible storage capacity, without charging or changing stock. It is not a target inventory level. Ingredients arrive at the start of days 10, 20, 30, 40 and so on: the first deadline is 135 seconds, subsequent intervals 150 seconds.

Each deadline plans reachable stores in ingredient catalog order then storage ID order, limits quantities to free capacity and charges only actual arrivals atomically. Insufficient funds skip the entire planned shipment without a debit; full/inaccessible storage receives no goods or charge. The next deadline advances regardless. Six potatoes therefore become 0 → 6 → 12 with two $6 charges when space and funds permit.

`TABLEWARE_ORDER { tablewareId, delta: 1 | -1 }` plus prepays $15 and reserves one reachable cabinet slot. The first pending unit starts a 75-simulation-second deadline; later units share it. Minus cancels one still-pending unit and refunds $15 cash/net expenses, including across dates where daily net expenses can be negative. Cancelling an empty queue rejects unchanged.

Tableware arrivals create already-paid units without a second charge. An inaccessible due cabinet keeps its queue and expired deadline, remains refundable and delivers when access returns. Cancelling the last pending unit clears the deadline.

All nine ingredient and six tableware IDs/prices are catalog-defined. Every recipe declares ingredient quantities, reusable tableware, primary cooking source and required equipment; legacy preparation equipment and cutting boards both satisfy `prep`. Fries needs a fryer, cutting board, potato and plate, costs $15 and takes eight seconds. Ingredient freshness is deferred.

## Service and reusable dishes

Orders snapshot menu price and progress queued → cooking → ready. They store `createdAt`, `ingredientsCommitted`, funding and, after commitment, `sourceId`/`wareId`. Actual regular preparation proves the chosen employee can reach every required stock source, dish cabinet and station before atomically consuming ingredients and reserving one clean dish. It never charges the former abstract recipe cost as well.

A shortage leaves an order queued with no partial consumption. Enabled dishes remain orderable when stock or clean ware later runs out; kitchen equipment must still be reachable. Adding a dish to the menu requires unlock, equipment, ingredient and clean-dish readiness without requiring hired staff. Removal is always allowed.

The same dish moves order → carried meal → eating guest → dirty table → collection → sink → cabinet. Ready quality transfers to `guest.mealQuality` and changes meal happiness. Eating completion releases guest dish ownership and creates dirty ware at its table, reducing hygiene and blocking new table reservations until collected. Payment remains at departure after eating/toilet use.

Ware states and exact owner/location fields are `clean { storageId }`, `order { orderId }`, `carriedMeal { staffId, orderId }`, `guest { guestId }`, `dirty { locationId, dirtySince, assigneeId? }`, `carriedDirty { staffId }`, `washing { staffId, sinkId }` and `carriedClean { staffId }`.

Wash jobs choose the oldest reachable dirty dish only after proving the complete source → sink → cabinet route and reserving `returnStorageId`. Clean units, prepaid incoming units and reserved returns share cabinet capacity; in-use dishes elsewhere do not occupy slots. Washing takes four seconds.

The dedicated `dishwasher` costs $150, occupies one ground cell and has `washCapacity: 5`, separate from storage capacity. New loading jobs prefer a reachable free dishwasher slot and otherwise retain the legacy sink process. Sinks remain purchasable and retain existing recipe dependencies. Furnished starts add the dedicated appliance without rewriting old saves.

Machine jobs use `machine-collect` → `machine-load`, then release their employee when depositing `rackDirty { dishwasherId, returnStorageId, rackSince }`. Inbound employees hold `dishwasherId`; dirty units retain the existing collector/return fields and carried units use the existing `carriedDirty` state. Exactly five physically loaded dirty units atomically become `rackWashing` and start shared `object.washProgress: 0`. Four simulation seconds later all five become `rackClean` together and progress is removed. Washing is unattended and underfilled racks wait indefinitely. The four-second duration is an authored default.

An employee with dishwashing enabled reserves a clean unit through `machine-unload` and its reciprocal `assigneeId`, then picks up `carriedClean` and becomes `machine-return` to the reserved cabinet. Complete return access is checked before assignment and again before pickup; blockage before pickup releases only the unload assignment and retains rack ownership/reservation. Pickup frees the machine slot and drops its machine link. Clean output remains unavailable to cooking until stored. This staff retrieval behavior is an explicit authored fallback.

Machine slots count inbound reservations plus dirty, washing and clean rack units, at most five. Cabinet return slots stay reserved until storage or breakage. Dirty-carry breakage uses the same single persisted check as legacy sink work. Unheld collection dismissal releases both reservations; unheld unload dismissal retains rack/cabinet ownership and clears only the assignee. Active blocked loads/returns retain their owners and reservations. Loaded or reserved machines cannot sell or move, while no-op MOVE remains unchanged. Mixed clean/dirty rack contents cannot start another cycle until five dirty units are present. A shortage warning identifies fewer than five live plus prepaid dishes; additional deliveries can resolve that stock shortage. Legacy sinks serve only still-uncommitted dirty dishes and cannot extract loaded units.

On the first carried movement of a dirty dish, breakage probability is `0.04*clumsiness`; persisted `breakageChecked` prevents reload rerolls. A break removes one live unit and releases its return reservation exactly once. Per type, `granted + delivered = live units + broken`; prepaid queued units enter the ledger only on arrival.

Cancelled unprepared regular orders own no dish. A committed stationary meal becomes dirty at its source. A carried cancelled meal atomically transfers to forced `meal-dispose` with the same carrier and protected source, without needing a cabinet/sink/return reservation; after disposal, normal washing may wait for capacity. Construction blocking a carrying route retains its owner/targets/reservation and an explicit blocked reason until replanning succeeds. Firing or selling cannot destroy these links.

## Read APIs

`getSupplies` returns `ingredients`, `tableware`, `storage`, `dishwashers` and `deliveries`. Ingredient rows expose ID/name/class/price, `onHand`, reachable `usable`, batch quantity/limit, storage capacity/free/access, scheduled batch cost, capacity-limited next quantity/cost and blocked reason. Tableware rows expose ID/name/price, clean/usable/in-use/dirty/returning/queued/broken counts, capacity/free and `canAdd`/`canCancel`. Rack dirty/washing units belong to `dirty`; clean rack output belongs to `returning`. Breakdown fields `rackDirty`, `rackWashing` and `cleanReady` are subsets, so `clean + inUse + dirty + returning` still equals live units. Storage rows contain `{ id, capacity, used, reserved, contents: [{ id, quantity }] }` for stored ingredients or clean dishes.

Dishwasher rows are `{ id, capacity, occupied, inbound, dirty, washing, cleanReady, progress, remainingSeconds, batchNeeded }`. `occupied` is physical dirty + washing + clean-ready rack units, with `occupied + inbound <= 5`. Shared progress is raw seconds / 4 and remaining time is 4 minus raw seconds only during a cycle; otherwise both are zero. `batchNeeded` is 5 minus waiting dirty units when any dirty units wait, otherwise zero; it includes units already inbound that still must be loaded. These values are derived from unit/task ownership.

Ingredient/tableware delivery records contain `{ status, nextDay, remainingSeconds, progress, nextCost, blockedReason }`, where status is idle/waiting/due/blocked. Ingredient delivery additionally exposes `scheduledCost`, independent of capacity-limited `nextCost`, so a full store does not hide the configured batch price.

`getRecipeStatus` returns `{ recipeId, enabled, unlocked, canEnable, canOrder, canPrepare, status, requirements, missing }`; status is locked/missing-equipment/missing-stock/missing-tableware/ready. Requirements contain `{ kind, id, label, required, available, owned, met, reason }` for equipment/ingredient/tableware, distinguishing reachable usable amounts from owned inaccessible stock.

`getStats` retains financial/service/building/scenario fields, plus `availableRecipes` for enabled unlocked equipment-ready dishes and `cookableRecipes` for the currently supplied subset. Salary fields are `monthlyWages`, `dailyWages` equal to monthly salaries / 30, `wagesAccrued`, `wagePeriodDays: 30` and `wageSettlementDays: 1`. It also returns candidates, supply warnings and `{ dayOfMonth, month, year, label }` calendar data. Deprecated `hourlyWages` is only the equivalent old-rate display.

`hasRoom` means a closed structural boundary encloses an interior cell. `hasEntrance` requires an exterior door with walkable interior/exterior neighbors and an entry route; `buildingReady` combines them. `hasUsableSeating` means at least one adjacent table/chair has an entry route, outdoors or indoors. It suppresses enclosure advice without changing building telemetry; unreachable seating still gets its own warning and staffing/menu warnings remain separate.

## Persistence and compatibility

`serialize` returns version 2 JSON. `deserialize` accepts strings below 2 MB, validates version 1 against frozen six-recipe/item/role/graph rules before migration, then validates the new graph. Invalid values, capacities, parents, ownership, clocks, paths, funding or conservation throw an explanatory error without returning partial state.

Historical version 2 monthly accrual remains unpaid liability, preserved with cash/expenses on load. The next day boundary pays it plus newly accrued time once; dismissal can settle it sooner. The accepted ceiling is one monthly salary plus the current day's phase accrual, preserving the old validator's full monthly range while remaining valid until the next settlement. Loading adds no appliance/progress defaults and never settles money. Literal pre-change version 2 service/arrears snapshots from `1508bb3` retain their original provenance and bytes.

Rack ownership validates existing machine/cabinet IDs, load times, exact permitted links and reciprocal unload assignments. Combined inbound/physical capacity cannot exceed five. A cycle requires exactly five washing units and finite progress in [0,4); inactive machines cannot retain progress or five unstarted dirty units. Machine tasks require reciprocal compatible owners/targets. Frozen version 1 validation remains unchanged.

Version 1 migration preserves IDs/sequence, historical money/statistics, paths, task progress, construction grant and menu choices, then appends disabled Fries and allocates only new records. Its frozen validator still requires floors under reserved dining seats; version 2 permits outdoor seats. Old day/time become `calendarSeconds`; the future calendar follows the new rate. Old wages map to monthly ×22.5 with zero new accrual, since prior wages were already paid. Staff become generic with matching preferred groups, neutral speed 0.5 and mapped cooking quality; old cleaners receive equal normal cleaning/dishwashing priorities.

Queued legacy orders use `legacy-pending` with frozen one-time debits (burger 4.5, salad 3, pasta 4, steak 9, risotto 6, special 11), granting a dish only with successful preparation. Cooking/ready orders are `legacy-paid` and gain one dish without new ingredients/debit; physically carried ready meals keep reciprocal carrier/order links. Already-ready/served meals use quality 1; served legacy recipe identity is unknowable and uses an explicit fallback plate. Eating guests own their plate; positive-bill completed meals with an existing table become dirty there. No stock or storage is invented.

Actor paths remain cardinal and collision-free, with the reserved-chair origin/arrival exceptions. Active tasks require reciprocal owners, compatible sources and destinations; an empty blocked path is accepted only when its target is actually unreachable. Literal version 1 fixtures from revision `37d1dc9` cover queued/cooking/station-ready/carried-ready/eating/toilet/leaving phases; deterministic tests include 8,000 consecutive quarter-second service round trips and another 8,000 across blocked washing/cancelled disposal, comparing future state.
