import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ITEMS, INGREDIENTS, TABLEWARE, TASK_GROUPS, RECIPES } from '../src/catalog.js';
import { createGame, dispatch, tick, getStats, getSupplies, getRecipeStatus, serialize, deserialize } from '../src/engine.js';

// Bound: public engine inputs, literal v1 saves from 37d1dc9, and deterministic task/ownership transitions; browser controls have a separate integration owner.
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/v1-service.json', import.meta.url), 'utf8')).states;
const doAction = (game, action) => { const result = dispatch(game, action); assert.equal(result.ok, true, result.message); return result; };
function run(game, seconds) { for (let elapsed = 0; elapsed < seconds; elapsed += 0.25) tick(game, Math.min(0.25, seconds - elapsed)); return game; }
function until(game, predicate, limit = 400) { for (let elapsed = 0; elapsed < limit && !predicate(); elapsed += 0.25) tick(game, 0.25); assert.ok(predicate(), `Expected phase was not reached within ${limit} seconds`); }
function rejected(game, action) { const before = serialize(game); assert.equal(dispatch(game, action).ok, false); assert.equal(serialize(game), before, 'Rejected actions must preserve the complete state'); }
function place(game, itemType, x, z, rotation = 0) { doAction(game, { type: 'PLACE', itemType, x, z, rotation }); return game.objects.at(-1); }
function bare() {
  const game = createGame('empty');
  for (let x = 7; x <= 15; x++) doAction(game, { type: 'FLOOR_STROKE', cells: Array.from({ length: 8 }, (_, index) => ({ x, z: index + 6 })), style: 'peach' });
  return game;
}
function workshop() {
  const game = bare();
  place(game, 'counter', 8, 8); place(game, 'cuttingboard', 8, 8);
  place(game, 'counter', 10, 8); place(game, 'fryer', 10, 8);
  place(game, 'shelf', 12, 8); place(game, 'sink', 14, 8);
  place(game, 'table', 10, 11); place(game, 'chair', 9, 11);
  for (const recipeId of ['burger', 'salad', 'pasta']) doAction(game, { type: 'TOGGLE_RECIPE', recipeId });
  return game;
}
function hire(game, group, x = 11, z = 9) {
  doAction(game, { type: 'HIRE', candidateId: game.candidates[0].id, x, z });
  const employee = game.staff.at(-1);
  for (const taskGroup of TASK_GROUPS) doAction(game, { type: 'PRIORITY', id: employee.id, taskGroup, priority: taskGroup === group ? 'high' : 'off' });
  return employee;
}
function preparedFries() {
  const game = workshop();
  doAction(game, { type: 'INGREDIENT_BATCH', ingredientId: 'potato', quantity: 6 });
  doAction(game, { type: 'TABLEWARE_ORDER', tablewareId: 'plate', delta: 1 });
  doAction(game, { type: 'TABLEWARE_ORDER', tablewareId: 'plate', delta: 1 });
  run(game, 135);
  doAction(game, { type: 'TOGGLE_RECIPE', recipeId: 'fries' });
  const cook = hire(game, 'cooking'), server = hire(game, 'serving', 12, 9), washer = hire(game, 'dishwashing', 13, 9);
  washer.skills.clumsiness = 0;
  doAction(game, { type: 'TOGGLE_OPEN' });
  return { game, cook, server, washer };
}
function conserved(game) {
  for (const type of Object.keys(TABLEWARE)) {
    const ledger = game.supplies.wareLedger[type];
    assert.equal(ledger.granted + ledger.delivered, game.supplies.ware.filter((ware) => ware.type === type).length + ledger.broken);
  }
}

test('catalog exposes the observed support, storage, ingredient and six dish types', () => {
  assert.deepEqual(Object.keys(TABLEWARE), ['plate', 'stemglass', 'pan', 'bowl', 'cup', 'glass']);
  for (const ware of Object.values(TABLEWARE)) assert.equal(ware.unitPrice, 15);
  assert.deepEqual(['shelf', 'bigshelf', 'fridge', 'counter'].map((type) => [ITEMS[type].cost, ITEMS[type].capacity]), [[100, 12], [400, 24], [150, 12], [50, 10]]);
  assert.deepEqual(Object.fromEntries(['potato', 'flour', 'tomato', 'coffee', 'avocado', 'steak', 'chicken'].map((id) => [id, INGREDIENTS[id].unitPrice])), { potato: 1, flour: 1, tomato: 2, coffee: 2, avocado: 2, steak: 5, chicken: 5 });
  for (const recipe of RECIPES) assert.equal(recipe.cost, Object.entries(recipe.ingredients).reduce((sum, [id, quantity]) => sum + INGREDIENTS[id].unitPrice * quantity, 0));
});

test('countertop placement shares only its support cell and rejects unsupported or unsafe sales atomically', () => {
  const game = bare();
  rejected(game, { type: 'PLACE', itemType: 'cuttingboard', x: 8, z: 8 });
  const cabinet = place(game, 'counter', 8, 8, 90), cash = game.cash;
  const board = place(game, 'cuttingboard', 8, 8);
  assert.equal(board.parentId, cabinet.id); assert.equal(board.rotation, 90); assert.equal(game.cash, cash - 50);
  rejected(game, { type: 'PLACE', itemType: 'fryer', x: 8, z: 8 });
  rejected(game, { type: 'REMOVE', id: cabinet.id });
  assert.deepEqual(deserialize(serialize(game)), game);
  doAction(game, { type: 'REMOVE', id: board.id }); doAction(game, { type: 'REMOVE', id: cabinet.id });
  assert.equal(game.objects.length, 0);
});

test('recurring ingredients arrive 0→6→12, charge actual arrivals once, and retain scheduled cost at capacity', () => {
  const game = bare(); const shelf = place(game, 'shelf', 8, 8), cash = game.cash;
  doAction(game, { type: 'INGREDIENT_BATCH', ingredientId: 'potato', quantity: 6 });
  run(game, 134.75); assert.equal(game.cash, cash); assert.equal(game.supplies.stocks.length, 0);
  tick(game, 0.25); assert.equal(game.cash, cash - 6); assert.equal(game.supplies.stocks[0].quantity, 6);
  run(game, 150); assert.equal(game.cash, cash - 12); assert.equal(game.supplies.stocks[0].quantity, 12);
  const row = getSupplies(game).ingredients.find((row) => row.id === 'potato');
  assert.equal(row.batchQuantity, 6); assert.equal(row.scheduledCost, 6); assert.equal(row.nextCost, 0);
  assert.equal(getSupplies(game).deliveries.ingredient.scheduledCost, 6);
  run(game, 150); assert.equal(game.cash, cash - 12); assert.equal(game.supplies.stocks[0].quantity, 12);
  rejected(game, { type: 'REMOVE', id: shelf.id }); rejected(game, { type: 'INGREDIENT_BATCH', ingredientId: 'potato', quantity: 13 });
  assert.deepEqual(deserialize(serialize(game)), game);
});

test('capacity-limited batches charge partial quantities and insufficient funds skip the entire planned delivery', () => {
  const partial = bare(); place(partial, 'shelf', 8, 8); const start = partial.cash;
  doAction(partial, { type: 'INGREDIENT_BATCH', ingredientId: 'potato', quantity: 7 }); run(partial, 285);
  assert.equal(partial.supplies.stocks[0].quantity, 12); assert.equal(partial.cash, start - 12);
  const insufficient = bare(); place(insufficient, 'shelf', 8, 8);
  doAction(insufficient, { type: 'INGREDIENT_BATCH', ingredientId: 'potato', quantity: 10 });
  doAction(insufficient, { type: 'INGREDIENT_BATCH', ingredientId: 'tomato', quantity: 10 });
  insufficient.cash = 13;
  assert.equal(getSupplies(insufficient).deliveries.ingredient.nextCost, 14);
  run(insufficient, 135); assert.equal(insufficient.cash, 13); assert.equal(insufficient.supplies.stocks.length, 0); assert.equal(insufficient.supplies.ingredientNextDay, 20);
  assert.match(getSupplies(insufficient).deliveries.ingredient.blockedReason, /insufficient/i);
});

test('batch JSON key order cannot change catalog-order allocation, and inaccessible stores receive no charge', () => {
  const game = bare(); place(game, 'shelf', 8, 8);
  doAction(game, { type: 'INGREDIENT_BATCH', ingredientId: 'potato', quantity: 10 });
  doAction(game, { type: 'INGREDIENT_BATCH', ingredientId: 'tomato', quantity: 10 });
  game.supplies.ingredientBatches = Object.fromEntries(Object.entries(game.supplies.ingredientBatches).reverse());
  const restored = deserialize(serialize(game)), cash = restored.cash;
  run(restored, 135);
  assert.deepEqual(restored.supplies.stocks.map(({ ingredientId, quantity }) => [ingredientId, quantity]), [['potato', 10], ['tomato', 2]]);
  assert.equal(restored.cash, cash - 14);
  const blocked = bare(); place(blocked, 'shelf', 8, 8);
  doAction(blocked, { type: 'INGREDIENT_BATCH', ingredientId: 'potato', quantity: 6 });
  for (const [x, z] of [[7, 8], [9, 8], [8, 7], [8, 9]]) place(blocked, 'wall', x, z);
  const blockedCash = blocked.cash; run(blocked, 135);
  assert.equal(blocked.cash, blockedCash); assert.equal(blocked.supplies.stocks.length, 0); assert.equal(blocked.supplies.ingredientNextDay, 20);
  assert.equal(getSupplies(blocked).deliveries.ingredient.status, 'blocked');
});

test('dish purchases prepay, reserve capacity, cancel with net-expense refunds across dates and arrive without a second charge', () => {
  const game = bare(); const cabinet = place(game, 'counter', 8, 8), cash = game.cash, expenses = game.stats.expenses;
  doAction(game, { type: 'TABLEWARE_ORDER', tablewareId: 'plate', delta: 1 });
  assert.equal(game.cash, cash - 15); assert.equal(game.stats.expenses, expenses + 15);
  assert.equal(getSupplies(game).tableware[0].clean, 0); assert.equal(getSupplies(game).storage[0].reserved, 1);
  rejected(game, { type: 'REMOVE', id: cabinet.id });
  run(game, 15); doAction(game, { type: 'TABLEWARE_ORDER', tablewareId: 'plate', delta: -1 });
  assert.equal(game.cash, cash); assert.equal(game.stats.expenses, expenses); assert.equal(game.daily.expenses, -15);
  assert.deepEqual(deserialize(serialize(game)), game);
  rejected(game, { type: 'TABLEWARE_ORDER', tablewareId: 'plate', delta: -1 });
  doAction(game, { type: 'TABLEWARE_ORDER', tablewareId: 'plate', delta: 1 });
  const prepaid = game.cash; run(game, 75);
  assert.equal(game.cash, prepaid); assert.equal(game.supplies.tablewareQueue.length, 0); assert.equal(game.supplies.ware[0].state, 'clean'); assert.equal(game.supplies.wareLedger.plate.delivered, 1);
  assert.deepEqual(getSupplies(game).storage.find((row) => row.id === cabinet.id).contents, [{ id: 'plate', quantity: 1 }]);
  for (let index = 0; index < 9; index++) doAction(game, { type: 'TABLEWARE_ORDER', tablewareId: 'bowl', delta: 1 });
  rejected(game, { type: 'TABLEWARE_ORDER', tablewareId: 'cup', delta: 1 });
  conserved(game);
});

test('an inaccessible prepaid cabinet keeps its due queue refundable and resumes arrival once access returns', () => {
  const game = bare(); place(game, 'counter', 8, 8);
  doAction(game, { type: 'TABLEWARE_ORDER', tablewareId: 'plate', delta: 1 });
  for (const [x, z] of [[7, 8], [9, 8], [8, 7], [8, 9]]) place(game, 'wall', x, z);
  run(game, 80); assert.equal(game.supplies.ware.length, 0); assert.equal(game.supplies.tablewareQueue[0].quantity, 1); assert.equal(getSupplies(game).deliveries.tableware.status, 'blocked');
  assert.deepEqual(deserialize(serialize(game)), game);
  const paid = game.cash;
  doAction(game, { type: 'REMOVE', id: game.objects.find((object) => object.x === 8 && object.z === 7).id });
  const cashAfterRemoval = game.cash; tick(game, 0.25);
  assert.equal(game.cash, cashAfterRemoval); assert.ok(game.cash >= paid); assert.equal(game.supplies.ware.length, 1); assert.equal(game.supplies.tablewareQueue.length, 0);
});

test('a tableware delivery keeps one integer calendar date while fractional days advance', () => {
  const game = bare(); place(game, 'counter', 8, 8); run(game, 5.25);
  doAction(game, { type: 'TABLEWARE_ORDER', tablewareId: 'plate', delta: 1 });
  const expectedDay = 6;
  assert.equal(getSupplies(game).deliveries.tableware.nextDay, expectedDay);
  for (const seconds of [1.25, 9.5, 17.75, 32.25]) {
    run(game, seconds);
    assert.equal(getSupplies(game).deliveries.tableware.nextDay, expectedDay, 'The date must stay at the queued absolute deadline until arrival');
  }
  assert.equal(game.supplies.tablewareQueue.length, 1);
  run(game, 14.25); assert.equal(game.supplies.tablewareQueue.length, 0);
  assert.equal(getSupplies(game).deliveries.tableware.nextDay, null);
});

test('Fries can be added without staff only after all prerequisites, while later shortages keep the enabled menu visible', () => {
  const game = workshop();
  game.menu.find((entry) => entry.recipeId === 'steak').enabled = true;
  doAction(game, { type: 'TOGGLE_RECIPE', recipeId: 'steak' });
  rejected(game, { type: 'TOGGLE_RECIPE', recipeId: 'steak' });
  rejected(game, { type: 'TOGGLE_RECIPE', recipeId: 'fries' });
  doAction(game, { type: 'INGREDIENT_BATCH', ingredientId: 'potato', quantity: 6 });
  doAction(game, { type: 'TABLEWARE_ORDER', tablewareId: 'plate', delta: 1 }); run(game, 135);
  assert.equal(game.staff.length, 0); assert.equal(getRecipeStatus(game).find((row) => row.recipeId === 'fries').canEnable, true);
  doAction(game, { type: 'TOGGLE_RECIPE', recipeId: 'fries' });
  hire(game, 'cooking'); hire(game, 'serving', 12, 9); doAction(game, { type: 'TOGGLE_OPEN' });
  until(game, () => game.orders.some((order) => order.state === 'cooking'));
  const status = getRecipeStatus(game).find((row) => row.recipeId === 'fries');
  assert.equal(status.enabled, true); assert.equal(status.canOrder, true); assert.equal(status.canPrepare, false); assert.equal(status.status, 'missing-tableware');
  assert.ok(getStats(game).availableRecipes.includes('fries')); assert.equal(getStats(game).cookableRecipes.includes('fries'), false);
  doAction(game, { type: 'TOGGLE_RECIPE', recipeId: 'fries' });
});

test('one conserved plate completes cooking, service, dirty-table blocking, washing and return without a preparation debit', () => {
  const { game, washer } = preparedFries();
  doAction(game, { type: 'PRIORITY', id: washer.id, taskGroup: 'dishwashing', priority: 'off' });
  const before = game.cash;
  until(game, () => game.orders.some((order) => order.state === 'cooking'));
  const order = game.orders.find((order) => order.state === 'cooking'), wareId = order.wareId;
  assert.equal(game.cash, before); assert.equal(game.supplies.stocks.find((stock) => stock.ingredientId === 'potato').quantity, 5);
  until(game, () => game.guests.some((guest) => guest.wareId === wareId));
  assert.equal(game.supplies.ware.find((ware) => ware.id === wareId).state, 'guest');
  until(game, () => game.supplies.ware.find((ware) => ware.id === wareId)?.state === 'dirty');
  assert.ok(game.supplies.ware.some((ware) => ware.id === wareId && ware.locationId === order.tableId) || game.supplies.ware.find((ware) => ware.id === wareId).locationId === game.objects.find((object) => object.type === 'table').id);
  until(game, () => game.guests.length === 0);
  run(game, 30); assert.equal(game.guests.length, 0, 'A dirty table cannot accept another reservation even with a clean second plate');
  doAction(game, { type: 'PRIORITY', id: washer.id, taskGroup: 'dishwashing', priority: 'high' });
  until(game, () => game.supplies.ware.find((ware) => ware.id === wareId)?.state === 'clean');
  assert.ok(game.stats.served >= 1); conserved(game); assert.deepEqual(deserialize(serialize(game)), game);
});

test('preparation waits without consuming anything until all stock routes are reachable', () => {
  const { game, cook } = preparedFries();
  doAction(game, { type: 'PRIORITY', id: cook.id, taskGroup: 'cooking', priority: 'off' });
  until(game, () => game.orders.some((order) => order.state === 'queued'));
  for (const [x, z] of [[11, 8], [13, 8], [12, 7], [12, 9]]) place(game, 'wall', x, z);
  const stocks = structuredClone(game.supplies.stocks), clean = getSupplies(game).tableware[0].clean, wealth = game.cash - getStats(game).wagesAccrued;
  doAction(game, { type: 'PRIORITY', id: cook.id, taskGroup: 'cooking', priority: 'high' }); run(game, 5);
  assert.equal(cook.task, 'idle'); assert.deepEqual(game.supplies.stocks, stocks); assert.ok(Math.abs(game.cash - getStats(game).wagesAccrued - (wealth - getStats(game).monthlyWages * 5 / 450)) < 1e-7, 'Only continuous wage liability changes while preparation is blocked'); assert.equal(getSupplies(game).tableware[0].clean, clean);
  const status = getRecipeStatus(game).find((row) => row.recipeId === 'fries');
  assert.ok(status.missing.some((row) => row.kind === 'ingredient' && row.owned > 0 && row.available === 0));
  doAction(game, { type: 'REMOVE', id: game.objects.find((object) => object.x === 12 && object.z === 7).id });
  until(game, () => game.orders.some((order) => order.state === 'cooking'));
  assert.equal(game.supplies.stocks.find((stock) => stock.ingredientId === 'potato').quantity, 5); conserved(game);
});

test('priorities follow all four symbols and an off group never receives a new job; active cooking finishes', () => {
  const game = createGame(), employee = game.staff[0];
  doAction(game, { type: 'PRIORITY', id: employee.id, taskGroup: 'serving', priority: 'normal' });
  for (const expected of ['high', 'off', 'low', 'normal']) { doAction(game, { type: 'PRIORITY', id: employee.id, taskGroup: 'serving' }); assert.equal(employee.priorities.serving, expected); }
  doAction(game, { type: 'PRIORITY', id: employee.id, taskGroup: 'serving', priority: 'off' });
  until(game, () => employee.task === 'cooking'); const orderId = employee.orderId;
  doAction(game, { type: 'PRIORITY', id: employee.id, taskGroup: 'cooking', priority: 'off' });
  assert.equal(employee.task, 'cooking'); until(game, () => employee.task === 'idle');
  assert.ok(game.orders.some((order) => order.id === orderId && order.state === 'ready') || game.guests.some((guest) => guest.state === 'eating'));
  run(game, 20); assert.equal(employee.task, 'idle');
  rejected(game, { type: 'PRIORITY', id: employee.id, taskGroup: 'magic', priority: 'high' });
});

test('candidate hiring has no upfront fee, calendar advances independently, and prorated wages settle once', () => {
  const game = bare(), selected = structuredClone(game.candidates[0]), cash = game.cash;
  rejected(game, { type: 'HIRE', candidateId: selected.id, x: 0, z: 0 });
  const employee = hire(game, 'cooking'); assert.equal(game.cash, cash); assert.equal(employee.monthlyWage, selected.monthlyWage); assert.deepEqual(employee.skills, selected.skills);
  assert.equal(game.candidates.length, 3); assert.equal(game.candidates.some((candidate) => candidate.id === selected.id), false);
  run(game, 15); assert.equal(getStats(game).calendar.label, '2 Jan'); assert.ok(Math.abs(game.cash - (cash - selected.monthlyWage / 30)) < 1e-8); assert.equal(employee.wageAccrued, 0);
  run(game, 435); assert.equal(getStats(game).calendar.label, '1 Feb'); assert.ok(Math.abs(game.cash - (cash - selected.monthlyWage)) < 1e-7); assert.equal(employee.wageAccrued, 0);
  run(game, 30); const due = employee.wageAccrued, paidBefore = game.cash;
  doAction(game, { type: 'FIRE', id: employee.id }); assert.ok(Math.abs(game.cash - (paidBefore - due)) < 1e-8);
  rejected(game, { type: 'FIRE', id: employee.id });
});

test('literal version 1 phases migrate without changing historical money, object/actor links or active paths', () => {
  for (const [phase, old] of Object.entries(fixtures)) {
    const migrated = deserialize(JSON.stringify(old));
    assert.equal(migrated.version, 2, phase); assert.equal(migrated.cash, old.cash); assert.deepEqual(migrated.stats, old.stats); assert.equal(migrated.elapsed, old.elapsed); assert.equal(migrated.seed, old.seed);
    assert.deepEqual(migrated.objects, old.objects); assert.deepEqual(migrated.menu.slice(0, 6), old.menu); assert.deepEqual(migrated.menu.at(-1), { recipeId: 'fries', price: 15, enabled: false });
    for (const actor of [...old.staff, ...old.guests]) {
      const converted = [...migrated.staff, ...migrated.guests].find((entry) => entry.id === actor.id);
      for (const field of ['x', 'z', 'path', 'timer', 'task', 'state', 'orderId', 'taskTarget']) assert.deepEqual(converted[field], actor[field], `${phase}: ${actor.id}.${field}`);
    }
    for (const member of old.staff) assert.equal(migrated.staff.find((entry) => entry.id === member.id).monthlyWage, member.wage * 22.5);
    conserved(migrated); assert.deepEqual(deserialize(serialize(migrated)), migrated);
  }
});

test('legacy queued cancellation grants nothing, while successful preparation debits only its frozen historical price', () => {
  const old = structuredClone(fixtures.queued), oldOrder = old.orders.find((order) => order.state === 'queued');
  const game = deserialize(JSON.stringify(old)); assert.equal(game.supplies.ware.length, 0); assert.equal(game.orders[0].funding, 'legacy-pending');
  doAction(game, { type: 'TOGGLE_OPEN' }); const beforeCash = game.cash, beforeExpenses = game.stats.expenses;
  until(game, () => game.orders.some((order) => order.id === oldOrder.id && order.state === 'cooking'));
  const frozen = { burger: 4.5, salad: 3, pasta: 4, steak: 9, risotto: 6, 'chef-special': 11 }[oldOrder.recipeId];
  assert.equal(game.cash, beforeCash - frozen); assert.equal(game.stats.expenses, beforeExpenses + frozen); assert.equal(game.supplies.stocks.length, 0); assert.equal(game.supplies.ware.length, 1);
  const cancelledOld = structuredClone(fixtures.queued); cancelledOld.guests.find((guest) => guest.id === oldOrder.guestId).patience = 0.01;
  const cancelled = deserialize(JSON.stringify(cancelledOld)); doAction(cancelled, { type: 'TOGGLE_OPEN' }); const cancelledCash = cancelled.cash;
  tick(cancelled, 0.25); assert.equal(cancelled.orders.length, 0); assert.equal(cancelled.supplies.ware.length, 0); assert.equal(cancelled.cash, cancelledCash); conserved(cancelled);
});

test('legacy carried meals keep their waiter and can cancel into safe disposal without any cabinet', () => {
  const old = structuredClone(fixtures.carriedReady); old.objects = old.objects.filter((object) => object.type !== 'counter');
  const order = old.orders.find((order) => old.staff.some((member) => member.orderId === order.id && member.task === 'serving'));
  const game = deserialize(JSON.stringify(old)), employee = game.staff.find((member) => member.id === order.waiterId), wareId = employee.wareId;
  assert.equal(game.supplies.ware.find((ware) => ware.id === wareId).state, 'carriedMeal'); assert.equal(game.orders.find((entry) => entry.id === order.id).quality, 1);
  const source = game.objects.find((object) => object.id === order.sourceId);
  until(game, () => employee.task === 'serving' && Math.abs(employee.x - source.x) + Math.abs(employee.z - source.z) > 1.8, 2);
  game.guests.find((guest) => guest.id === order.guestId).patience = 0.01;
  rejected(game, { type: 'FIRE', id: employee.id }); doAction(game, { type: 'TOGGLE_OPEN' }); tick(game, 0.25);
  assert.equal(employee.task, 'meal-dispose'); assert.equal(employee.taskTarget, order.sourceId); assert.equal(game.orders.some((entry) => entry.id === order.id), false);
  assert.equal(game.supplies.ware.find((ware) => ware.id === wareId).returnStorageId, undefined); assert.deepEqual(deserialize(serialize(game)), game);
  until(game, () => game.supplies.ware.find((ware) => ware.id === wareId).state === 'dirty'); conserved(game);
});

test('served legacy guests use declared fallback plates and neutral historical quality', () => {
  for (const phase of ['eating', 'toilet', 'leaving']) {
    const old = fixtures[phase], game = deserialize(JSON.stringify(old));
    for (const guest of game.guests.filter((guest) => guest.bill > 0)) { assert.equal(guest.legacyMeal, true); assert.equal(guest.mealQuality, 1); assert.equal(guest.mealRecipeId, undefined); }
    for (const guest of game.guests.filter((guest) => guest.state === 'eating')) assert.equal(game.supplies.ware.find((ware) => ware.id === guest.wareId).type, 'plate');
    const restored = deserialize(serialize(game)); run(game, 120); run(restored, 120); assert.equal(serialize(game), serialize(restored));
  }
});

test('cooking skill changes meal quality without changing preparation duration, and speed changes walking', () => {
  const slowQuality = createGame(), highQuality = createGame();
  slowQuality.staff[0].skills.cooking = 0; highQuality.staff[0].skills.cooking = 1;
  until(slowQuality, () => slowQuality.orders.some((order) => order.state === 'ready'));
  until(highQuality, () => highQuality.orders.some((order) => order.state === 'ready'));
  assert.equal(slowQuality.elapsed, highQuality.elapsed);
  assert.equal(slowQuality.orders.find((order) => order.state === 'ready').quality, 0.6);
  assert.equal(highQuality.orders.find((order) => order.state === 'ready').quality, 1);
  until(slowQuality, () => slowQuality.stats.served > 0); until(highQuality, () => highQuality.stats.served > 0);
  assert.ok(highQuality.stats.rating > slowQuality.stats.rating);
  const slowWalk = createGame(), fastWalk = createGame(); slowWalk.staff[1].skills.speed = 0; fastWalk.staff[1].skills.speed = 1;
  until(slowWalk, () => slowWalk.guests.some((guest) => guest.state === 'ordered'));
  until(fastWalk, () => fastWalk.guests.some((guest) => guest.state === 'ordered'));
  assert.ok(fastWalk.elapsed < slowWalk.elapsed);
});

test('clumsiness rolls once on a carried step, preserves the checked flag on reload and conserves broken dishes', () => {
  const { game, washer } = preparedFries();
  until(game, () => washer.task === 'dish-to-sink' && washer.path.length > 0);
  const wareId = washer.wareId, safe = deserialize(serialize(game));
  const safeWasher = safe.staff.find((member) => member.id === washer.id);
  washer.skills.clumsiness = 1; game.seed = 1972;
  safeWasher.skills.clumsiness = 0; safe.seed = 1972;
  const before = game.supplies.ware.length; tick(game, 0.25); tick(safe, 0.25);
  assert.equal(game.supplies.ware.length, before - 1); assert.equal(game.supplies.wareLedger.plate.broken, 1); assert.equal(washer.task, 'idle');
  assert.equal(safe.supplies.ware.find((ware) => ware.id === wareId).breakageChecked, true);
  const restored = deserialize(serialize(safe)); restored.seed = 1972; safe.seed = 1972;
  tick(restored, 0.25); tick(safe, 0.25);
  assert.equal(serialize(restored), serialize(safe)); assert.ok(restored.supplies.ware.some((ware) => ware.id === wareId)); conserved(game); conserved(safe);
});

test('an unavailable high-priority cooking group cannot starve a reachable lower-priority cleaning task', () => {
  const game = createGame(), employee = game.staff[0];
  game.stats.cleanliness = 40;
  doAction(game, { type: 'PRIORITY', id: employee.id, taskGroup: 'cleaning', priority: 'low' });
  tick(game, 0.25); assert.equal(employee.task, 'cleaning');
  rejected(game, { type: 'REMOVE', id: employee.taskTarget });
});

test('new supply and ownership graphs reject malformed parents, ledger values, deadlines, skills and reciprocal links', () => {
  const game = preparedFries().game;
  const mutations = [
    (g) => { g.objects.find((object) => object.type === 'fryer').parentId = 'object-missing'; },
    (g) => { g.objects.find((object) => object.type === 'fryer').x++; },
    (g) => { g.objects.find((object) => object.type === 'fryer').parentId = g.objects.find((object) => object.type === 'cuttingboard').parentId; },
    (g) => { g.supplies.stocks[0].quantity = 1000; },
    (g) => { g.supplies.stocks[0].ingredientId = 'steak'; },
    (g) => { g.supplies.stocks.push({ ...g.supplies.stocks[0] }); },
    (g) => { g.supplies.ingredientBatches.potato = -1; },
    (g) => { g.supplies.ingredientNextDay = 21; },
    (g) => { g.supplies.tablewareQueue.push({ tablewareId: 'plate', storageId: 'object-missing', quantity: 1 }); g.supplies.tablewareNextAt = g.elapsed + 75; },
    (g) => { g.supplies.tablewareNextAt = 12; },
    (g) => { g.supplies.wareLedger.plate.delivered++; },
    (g) => { g.supplies.wareLedger.plate.broken = -1; },
    (g) => { g.supplies.ware[0].state = 'guest'; },
    (g) => { g.supplies.ware[0].storageId = g.objects.find((object) => object.type === 'shelf').id; },
    (g) => { g.staff[0].skills.speed = 2; },
    (g) => { g.staff[0].priorities.cooking = 'highest'; },
    (g) => { g.staff[0].wageAccrued = 9999; },
    (g) => { g.candidates[0].monthlyWage = 0; },
    (g) => { g.calendarSeconds++; },
  ];
  for (const mutate of mutations) {
    const corrupted = structuredClone(game); mutate(corrupted);
    assert.throws(() => deserialize(serialize(corrupted)), /Cannot load restaurant/);
  }
  until(game, () => game.orders.some((order) => order.state === 'cooking'));
  for (const mutate of [
    (g, order) => { order.ingredientsCommitted = false; },
    (g, order) => { delete order.wareId; },
    (g, order) => { g.supplies.ware.find((ware) => ware.id === order.wareId).orderId = 'order-missing'; },
    (g, order) => { order.quality = 1; },
  ]) {
    const corrupted = structuredClone(game), order = corrupted.orders.find((order) => order.state === 'cooking'); mutate(corrupted, order);
    assert.throws(() => deserialize(serialize(corrupted)), /Cannot load restaurant/);
  }
  const fakeV1 = structuredClone(fixtures.queued); fakeV1.menu.push({ recipeId: 'fries', price: 15, enabled: false });
  assert.throws(() => deserialize(JSON.stringify(fakeV1)), /menu/);
});

test('8000 quarter-second round trips preserve active, blocked and cancelled washing/disposal graphs and future state', () => {
  const active = preparedFries();
  until(active.game, () => active.washer.task === 'dish-to-sink' && Math.abs(active.washer.x - 14) + Math.abs(active.washer.z - 8) > 2);
  for (const [x, z] of [[13, 8], [15, 8], [14, 7], [14, 9]]) place(active.game, 'wall', x, z);
  assert.equal(active.washer.blocked, true);
  const old = structuredClone(fixtures.carriedReady); old.objects = old.objects.filter((object) => object.type !== 'counter');
  const cancelled = deserialize(JSON.stringify(old)); doAction(cancelled, { type: 'TOGGLE_OPEN' });
  const carrier = cancelled.staff.find((member) => member.task === 'serving'), order = cancelled.orders.find((order) => order.id === carrier.orderId), source = cancelled.objects.find((object) => object.id === order.sourceId);
  until(cancelled, () => Math.abs(carrier.x - source.x) + Math.abs(carrier.z - source.z) > 1.8, 2);
  cancelled.guests.find((guest) => guest.id === carrier.guestId).patience = 0.01;
  place(cancelled, 'wall', 7, 8); tick(cancelled, 0.25);
  assert.equal(carrier.task, 'meal-dispose'); assert.equal(carrier.blocked, true);
  const scenarios = [
    { game: active.game, unblock: active.game.objects.find((object) => object.x === 14 && object.z === 9).id },
    { game: cancelled, unblock: cancelled.objects.find((object) => object.x === 7 && object.z === 8).id },
  ];
  const observed = new Set();
  for (const [scenarioIndex, scenario] of scenarios.entries()) {
    const original = scenario.game; let restored = deserialize(serialize(original));
    for (let step = 0; step < 4000; step++) {
      if (step === 80) for (const game of [original, restored]) doAction(game, { type: 'REMOVE', id: scenario.unblock });
      if (scenarioIndex === 0 && [200, 400].includes(step)) for (const game of [original, restored]) doAction(game, { type: 'TABLEWARE_ORDER', tablewareId: step === 200 ? 'cup' : 'pan', delta: 1 });
      if (scenarioIndex === 0 && step === 405) for (const game of [original, restored]) doAction(game, { type: 'TABLEWARE_ORDER', tablewareId: 'pan', delta: -1 });
      tick(original, 0.25); tick(restored, 0.25); restored = deserialize(serialize(restored));
      for (const member of original.staff) observed.add(member.blocked ? `blocked:${member.task}` : member.task);
      for (const ware of original.supplies.ware) observed.add(ware.state);
    }
    assert.equal(serialize(restored), serialize(original)); conserved(original);
  }
  for (const state of ['blocked:dish-to-sink', 'blocked:meal-dispose', 'washing', 'carriedClean', 'clean', 'dirty', 'carriedMeal']) assert.ok(observed.has(state), `The round trip bound must include ${state}`);
});
