import test from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, RECIPES, SCENARIOS } from '../src/catalog.js';
import { createGame, dispatch, tick, getStats, serialize, deserialize } from '../src/engine.js';

// Bound: deterministic in-memory simulation, public actions and persistence; browser controls/rendering are integration checks.
function run(game, seconds, step = 1) {
  for (let elapsed = 0; elapsed < seconds; elapsed += step) tick(game, Math.min(step, seconds - elapsed));
  return game;
}

function until(game, predicate, limit = 300) {
  for (let elapsed = 0; elapsed < limit && !predicate(); elapsed += 0.25) tick(game, 0.25);
  assert.ok(predicate(), `Condition was not reached within ${limit} simulation seconds`);
}

function action(game, data) {
  const result = dispatch(game, data);
  assert.equal(result.ok, true, result.message);
  return result;
}

const row = (minX, maxX, z) => Array.from({ length: maxX - minX + 1 }, (_, index) => ({ x: minX + index, z }));
const column = (x, minZ, maxZ) => Array.from({ length: maxZ - minZ + 1 }, (_, index) => ({ x, z: minZ + index }));

function rectangle(game, itemType = 'wall') {
  const edges = [row(6, 12, 6), column(12, 6, 12), row(6, 12, 12).reverse(), column(6, 6, 12).reverse()];
  for (const cells of edges) action(game, { type: 'STROKE', itemType, cells });
  return edges;
}

test('starter restaurant has four usable tables, eight seats, kitchen, facilities and all roles', () => {
  const game = createGame();
  const stats = getStats(game);
  assert.equal(stats.tables, 4); assert.equal(stats.seats, 8); assert.equal(stats.staff, 3);
  assert.deepEqual(stats.availableRecipes, ['burger', 'salad', 'pasta']);
  assert.deepEqual(stats.warnings, []);
  assert.equal(new Set(game.objects.map((object) => `${object.x},${object.z}`)).size, game.objects.length);
  assert.deepEqual(deserialize(serialize(game)), game);
  assert.ok(game.floors.some((floor) => floor.style === 'peach'));
  assert.equal(game.floors.some((floor) => floor.style === 'wood'), false);
  assert.equal(stats.buildingReady, true);
});

test('basic construction prices are explicit and charged per newly purchased segment', () => {
  assert.deepEqual(Object.fromEntries(['wall', 'table', 'chair', 'fridge', 'counter'].map((type) => [type, ITEMS[type].cost])), { wall: 12, table: 50, chair: 25, fridge: 150, counter: 50 });
  const game = createGame('empty'), cash = game.cash;
  action(game, { type: 'STROKE', itemType: 'wall', cells: row(6, 8, 6) });
  assert.equal(game.cash, cash - 36); assert.equal(game.stats.expenses, 36);
  assert.equal(game.objects.length, 3);
  for (const object of game.objects) assert.equal(object.purchaseCost, 12);
});

test('four inclusive strokes share corners and automatically floor only the closed interior', () => {
  const game = createGame('empty'), startingCash = game.cash;
  const edges = [row(6, 12, 6), column(12, 6, 12), row(6, 12, 12).reverse(), column(6, 6, 12).reverse()];
  for (const cells of edges.slice(0, 3)) {
    action(game, { type: 'STROKE', itemType: 'wall', cells });
    assert.equal(getStats(game).hasRoom, false); assert.equal(game.floors.length, 0);
  }
  action(game, { type: 'STROKE', itemType: 'wall', cells: edges[3] });
  assert.equal(game.objects.length, 24); assert.equal(game.cash, startingCash - 24 * 12);
  assert.equal(new Set(game.objects.map((object) => `${object.x},${object.z}`)).size, 24);
  assert.equal(game.floors.length, 25);
  for (const floor of game.floors) assert.ok(floor.style === 'peach' && floor.x > 6 && floor.x < 12 && floor.z > 6 && floor.z < 12);
  assert.equal(getStats(game).hasRoom, true); assert.equal(getStats(game).hasEntrance, false); assert.equal(getStats(game).buildingReady, false);
  const beforeRepeat = serialize(game);
  action(game, { type: 'STROKE', itemType: 'wall', cells: edges[1] });
  assert.equal(serialize(game), beforeRepeat, 'Shared segments must not rotate, charge, allocate IDs or otherwise mutate');
  assert.deepEqual(deserialize(serialize(game)), game);
});

test('construction strokes reject invalid shapes, collisions, guests and insufficient funds atomically', () => {
  const game = createGame('empty');
  const invalid = [
    { itemType: 'wall', cells: [] },
    { itemType: 'wall', cells: [{ x: 6, z: 6 }, { x: 6, z: 6 }] },
    { itemType: 'wall', cells: [{ x: 6, z: 6 }, { x: 7, z: 7 }] },
    { itemType: 'wall', cells: [{ x: 6, z: 6 }, { x: 8, z: 6 }] },
    { itemType: 'wall', cells: [{ x: 6, z: 6 }, { x: 7.5, z: 6 }] },
    { itemType: 'wall', cells: row(0, 24, 6) },
    { itemType: 'wall', cells: row(3, 6, 6) },
    { itemType: 'wall', cells: column(6, 6, 9), rotation: 0 },
    { itemType: 'door', cells: row(6, 9, 6) },
    { itemType: 'wall', cells: [null] },
  ];
  for (const data of invalid) {
    const before = serialize(game), result = dispatch(game, { type: 'STROKE', ...data });
    assert.equal(result.ok, false); assert.equal(serialize(game), before);
  }
  action(game, { type: 'PLACE', itemType: 'plant', x: 10, z: 8 });
  const beforeCollision = serialize(game);
  assert.equal(dispatch(game, { type: 'STROKE', itemType: 'wall', cells: row(6, 10, 8) }).ok, false);
  assert.equal(serialize(game), beforeCollision);
  game.cash = 35;
  const beforeFunds = serialize(game);
  assert.equal(dispatch(game, { type: 'STROKE', itemType: 'wall', cells: row(6, 9, 6) }).ok, false);
  assert.equal(serialize(game), beforeFunds);
  const active = createGame();
  until(active, () => active.guests.some((guest) => guest.z > 4 && guest.z < 4.5));
  const beforeGuest = serialize(active);
  assert.equal(dispatch(active, { type: 'STROKE', itemType: 'wall', cells: row(10, 12, 4) }).ok, false);
  assert.equal(serialize(active), beforeGuest);
});

test('single placement can close a room, preserve custom floors and retain floors after reopening walls', () => {
  const game = createGame('empty');
  action(game, { type: 'FLOOR', x: 8, z: 8, style: 'checker' });
  for (const cells of [row(6, 12, 6), row(6, 12, 12), column(6, 6, 12), column(12, 6, 8), column(12, 10, 12)]) action(game, { type: 'STROKE', itemType: 'wall', cells });
  assert.equal(game.floors.length, 1); assert.equal(getStats(game).hasRoom, false);
  action(game, { type: 'PLACE', itemType: 'wall', x: 12, z: 9, rotation: 90 });
  assert.equal(game.floors.length, 25); assert.equal(game.floors.find((floor) => floor.x === 8 && floor.z === 8).style, 'checker');
  const floors = JSON.stringify(game.floors), wall = game.objects.find((object) => object.x === 12 && object.z === 9);
  action(game, { type: 'REMOVE', id: wall.id });
  assert.equal(getStats(game).hasRoom, false); assert.equal(JSON.stringify(game.floors), floors);
  assert.deepEqual(deserialize(serialize(game)), game);
});

test('window rooms and free door replacements retain alignment, floors and grant history across saves', () => {
  const game = createGame('empty'); rectangle(game, 'window');
  const host = game.objects.find((object) => object.x === 6 && object.z === 9), hostId = host.id;
  assert.equal(host.rotation, 90); assert.equal(getStats(game).hasRoom, true);
  const cash = game.cash, floors = JSON.stringify(game.floors);
  action(game, { type: 'PLACE', itemType: 'door', x: 6, z: 9, rotation: 0 });
  assert.equal(host.id, hostId); assert.equal(host.type, 'door'); assert.equal(host.rotation, 90); assert.equal(host.purchaseCost, 0);
  assert.equal(game.cash, cash); assert.equal(game.doorGrantUsed, true); assert.equal(JSON.stringify(game.floors), floors);
  assert.equal(getStats(game).buildingReady, true);
  action(game, { type: 'REMOVE', id: host.id }); assert.equal(game.cash, cash, 'Selling the free door cannot create a refund');
  const restored = deserialize(serialize(game));
  assert.equal(restored.doorGrantUsed, true);
  action(restored, { type: 'PLACE', itemType: 'door', x: 6, z: 9, rotation: 90 });
  assert.equal(restored.cash, cash - ITEMS.door.cost); assert.equal(JSON.stringify(restored.floors), floors);
  assert.equal(restored.objects.find((object) => object.x === 6 && object.z === 9).purchaseCost, ITEMS.door.cost);
});

test('construction readiness requires a real exterior entrance with clear access on both sides', () => {
  const isolated = createGame('empty');
  action(isolated, { type: 'PLACE', itemType: 'door', x: 4, z: 4 });
  assert.equal(getStats(isolated).hasRoom, false); assert.equal(getStats(isolated).hasEntrance, false);
  const game = createGame('empty'); rectangle(game);
  action(game, { type: 'PLACE', itemType: 'door', x: 6, z: 6 });
  assert.equal(getStats(game).hasEntrance, false, 'A corner door without an adjacent interior cell is not an entrance');
  action(game, { type: 'PLACE', itemType: 'door', x: 9, z: 6 });
  assert.equal(getStats(game).hasEntrance, true);
  action(game, { type: 'PLACE', itemType: 'plant', x: 9, z: 5 });
  assert.equal(getStats(game).hasEntrance, false, 'A blocked exterior threshold is unusable');
  action(game, { type: 'REMOVE', id: game.objects.find((object) => object.type === 'plant').id });
  action(game, { type: 'PLACE', itemType: 'stove', x: 9, z: 7 });
  assert.equal(getStats(game).hasEntrance, false, 'A blocked interior threshold is unusable');
  action(game, { type: 'REMOVE', id: game.objects.find((object) => object.type === 'stove').id });
  assert.equal(getStats(game).buildingReady, true);
});

test('floor strokes charge only changed cells and reject the entire stroke before altering floors', () => {
  const game = createGame('empty'), cash = game.cash;
  action(game, { type: 'FLOOR_STROKE', cells: row(6, 9, 8), style: 'wood' });
  assert.equal(game.cash, cash - 48);
  const noOp = serialize(game);
  action(game, { type: 'FLOOR_STROKE', cells: row(6, 9, 8).reverse(), style: 'wood' });
  assert.equal(serialize(game), noOp);
  action(game, { type: 'FLOOR_STROKE', cells: row(7, 10, 8), style: 'peach' });
  assert.equal(game.cash, cash - 96); assert.equal(game.floors.length, 5);
  assert.equal(game.floors.find((floor) => floor.x === 6).style, 'wood');
  for (const data of [
    { cells: [{ x: 7, z: 8 }, { x: 9, z: 8 }], style: 'stone' },
    { cells: row(3, 6, 8), style: 'stone' },
    { cells: row(7, 10, 8), style: 'invalid' },
  ]) {
    const before = serialize(game);
    assert.equal(dispatch(game, { type: 'FLOOR_STROKE', ...data }).ok, false); assert.equal(serialize(game), before);
  }
  game.cash = 35;
  const beforeFunds = serialize(game);
  assert.equal(dispatch(game, { type: 'FLOOR_STROKE', cells: row(7, 10, 8), style: 'stone' }).ok, false);
  assert.equal(serialize(game), beforeFunds);
  assert.deepEqual(deserialize(serialize(game)), game);
});

test('v1 saves migrate first-door history conservatively and reject unsupported prices or grant values', () => {
  const oldStarter = createGame(); delete oldStarter.doorGrantUsed;
  for (const object of oldStarter.objects) delete object.purchaseCost;
  assert.equal(deserialize(serialize(oldStarter)).doorGrantUsed, true);
  const oldEmpty = createGame('empty'); delete oldEmpty.doorGrantUsed;
  assert.equal(deserialize(serialize(oldEmpty)).doorGrantUsed, false);
  const valid = createGame('empty'); action(valid, { type: 'PLACE', itemType: 'wall', x: 6, z: 6 });
  for (const purchaseCost of [-1, 13, 1000000, null, '12', 6]) {
    const corrupted = structuredClone(valid); corrupted.objects[0].purchaseCost = purchaseCost;
    assert.throws(() => deserialize(serialize(corrupted)), /purchase cost/);
  }
  for (const doorGrantUsed of [null, 'true', 0, false]) {
    const corrupted = createGame(); corrupted.doorGrantUsed = doorGrantUsed;
    assert.throws(() => deserialize(serialize(corrupted)), /first-door grant/);
  }
  const corruptedFloor = createGame('empty'); corruptedFloor.floors.push({ x: 6, z: 6, style: 'invalid' });
  assert.throws(() => deserialize(serialize(corruptedFloor)), /floor placement or style/);
});

test('the starter perimeter forms a continuous boundary with a clear entrance', () => {
  const game = createGame();
  const horizontalWalls = game.objects.filter((object) => object.type === 'wall' && [6, 16].includes(object.z));
  const verticalWalls = game.objects.filter((object) => object.type === 'wall' && [6, 17].includes(object.x) && object.z > 6 && object.z < 16);
  assert.equal(horizontalWalls.length, 23); assert.equal(verticalWalls.length, 18);
  for (const wall of horizontalWalls) assert.equal(wall.rotation, 0, 'North/south wall panels must span the x axis');
  for (const wall of verticalWalls) assert.equal(wall.rotation, 90, 'East/west wall panels must span the z axis');
  assert.ok(game.objects.some((object) => object.type === 'door' && object.x === 11 && object.z === 6));
  assert.equal(getStats(game).warnings.some((warning) => warning.includes('unreachable')), false);
});

test('placing, rotating, flooring and selling account for actual purchases and refunds', () => {
  const game = createGame('empty'), initial = game.cash;
  action(game, { type: 'FLOOR', x: 5, z: 5, style: 'tile' });
  action(game, { type: 'PLACE', itemType: 'table', x: 5, z: 5, rotation: -90 });
  assert.equal(game.objects[0].rotation, 270);
  assert.equal(game.cash, initial - 12 - ITEMS.table.cost);
  assert.equal(game.stats.expenses, 12 + ITEMS.table.cost);
  action(game, { type: 'REMOVE', id: game.objects[0].id });
  assert.equal(game.cash, initial - 12 - ITEMS.table.cost + Math.round(ITEMS.table.cost * 0.6));
});

test('invalid or unaffordable construction is atomic and gives usable errors', () => {
  const game = createGame('empty');
  for (const data of [
    { type: 'PLACE', itemType: 'table', x: 5, z: 5 },
    { type: 'PLACE', itemType: 'plant', x: 0, z: 0 },
    { type: 'PLACE', itemType: 'plant', x: 4.1, z: 4 },
    { type: 'PLACE', itemType: 'toString', x: 4, z: 4 },
    { type: 'FLOOR', x: 5, z: 5, style: '<broken>' },
    { type: 'PRICE', recipeId: 'burger', price: NaN },
    { type: 'SPEED', speed: 99 },
  ]) {
    const before = serialize(game), result = dispatch(game, data);
    assert.equal(result.ok, false); assert.ok(result.message.length > 15); assert.equal(serialize(game), before);
  }
  game.cash = 0;
  assert.equal(dispatch(game, { type: 'PLACE', itemType: 'plant', x: 5, z: 5 }).ok, false);
  assert.equal(game.objects.length, 0);
});

test('empty mode can build a working restaurant entirely through public actions', () => {
  const game = createGame('empty');
  for (let x = 7; x <= 13; x++) for (let z = 6; z <= 12; z++) action(game, { type: 'FLOOR', x, z, style: 'wood' });
  for (const [itemType, x, z] of [['prep', 8, 7], ['fridge', 9, 7], ['stove', 10, 7], ['table', 10, 10], ['chair', 9, 10], ['toilet', 12, 11]]) action(game, { type: 'PLACE', itemType, x, z });
  action(game, { type: 'HIRE', role: 'chef' }); action(game, { type: 'HIRE', role: 'waiter' });
  action(game, { type: 'TOGGLE_OPEN' });
  until(game, () => game.stats.served >= 1, 180);
  assert.ok(game.stats.revenue >= 14);
});

test('guests order, chefs cook, waiters serve and payment arrives only after departure', () => {
  const game = createGame();
  until(game, () => game.guests.some((guest) => guest.state === 'ordered'));
  assert.equal(game.stats.served, 0); assert.equal(game.stats.revenue, 0);
  until(game, () => game.orders.some((order) => order.state === 'cooking'));
  assert.ok(game.stats.expenses > 0);
  until(game, () => game.guests.some((guest) => guest.state === 'eating'));
  assert.equal(game.stats.served, 0);
  until(game, () => game.stats.served > 0);
  assert.ok(game.stats.revenue > 0);
  assert.equal(game.stats.lost, 0);
});

test('normal starter service earns operational profit, charges wages/rent and never double reserves seats', () => {
  const game = createGame();
  for (let elapsed = 0; elapsed < 960; elapsed++) {
    tick(game, 1);
    const reservations = game.guests.filter((guest) => guest.state !== 'leaving').map((guest) => guest.seatId);
    assert.equal(new Set(reservations).size, reservations.length);
    assert.ok(reservations.length <= getStats(game).seats);
  }
  assert.ok(game.stats.served >= 60);
  assert.ok(game.stats.revenue > game.stats.expenses, JSON.stringify(getStats(game)));
  assert.ok(game.stats.expenses > 12 * 48, 'Food and daily rent are charged in addition to wages');
  assert.equal(game.day, 3); assert.equal(game.stats.lost, 0);
});

test('an enclosed dining room cannot be reached and guests never walk through a wall', () => {
  const game = createGame();
  const door = game.objects.find((object) => object.type === 'door');
  action(game, { type: 'REMOVE', id: door.id });
  action(game, { type: 'PLACE', itemType: 'wall', x: 11, z: 6 });
  assert.ok(getStats(game).warnings.some((warning) => warning.includes('unreachable')));
  run(game, 100);
  assert.equal(game.guests.length, 0); assert.equal(game.stats.served, 0); assert.ok(game.stats.lost > 0);
  const wall = game.objects.find((object) => object.x === 11 && object.z === 6);
  action(game, { type: 'REMOVE', id: wall.id }); action(game, { type: 'PLACE', itemType: 'door', x: 11, z: 6 });
  until(game, () => game.stats.served > 0, 180);
});

test('furniture cannot be sold under seated guests and traversed paths avoid solid furniture', () => {
  const game = createGame();
  until(game, () => game.guests.some((guest) => guest.state === 'waiting'));
  const guest = game.guests.find((entry) => entry.state === 'waiting');
  assert.equal(dispatch(game, { type: 'REMOVE', id: guest.tableId }).ok, false);
  assert.equal(dispatch(game, { type: 'REMOVE', id: guest.seatId }).ok, false);
  for (let elapsed = 0; elapsed < 120; elapsed += 0.25) {
    tick(game, 0.25);
    for (const actor of [...game.staff, ...game.guests]) {
      for (let index = 0; index < actor.path.length; index++) {
        const point = actor.path[index];
        const blocked = game.objects.find((object) => object.x === point.x && object.z === point.z && ITEMS[object.type].solid);
        if (blocked) assert.ok(actor.state === 'arriving' && index === actor.path.length - 1 && blocked.id === actor.seatId, 'Only a reserved chair may be a blocked endpoint');
      }
    }
  }
});

test('closing stops arrivals while current diners can still pay', () => {
  const game = createGame();
  until(game, () => game.guests.some((guest) => guest.state === 'eating'));
  action(game, { type: 'TOGGLE_OPEN' });
  const maximumGuests = game.guests.length;
  run(game, 160);
  assert.equal(game.guests.length, 0); assert.ok(game.stats.served > 0); assert.ok(game.stats.served <= maximumGuests);
});

test('missing staff, inaccessible kitchen and excessive prices cause dissatisfied departures', () => {
  const noWaiter = createGame();
  action(noWaiter, { type: 'FIRE', id: noWaiter.staff.find((member) => member.role === 'waiter').id });
  run(noWaiter, 220); assert.equal(noWaiter.stats.served, 0); assert.ok(noWaiter.stats.lost > 0);
  const noChef = createGame();
  action(noChef, { type: 'FIRE', id: noChef.staff.find((member) => member.role === 'chef').id });
  run(noChef, 220); assert.equal(noChef.stats.served, 0); assert.ok(noChef.stats.lost > 0);
  const blockedKitchen = createGame();
  action(blockedKitchen, { type: 'TOGGLE_RECIPE', recipeId: 'salad' });
  action(blockedKitchen, { type: 'PLACE', itemType: 'wall', x: 7, z: 8 });
  run(blockedKitchen, 220); assert.equal(blockedKitchen.stats.served, 0); assert.ok(blockedKitchen.stats.lost > 0);
  const expensive = createGame();
  for (const recipe of RECIPES) action(expensive, { type: 'PRICE', recipeId: recipe.id, price: 150 });
  run(expensive, 220); assert.ok(expensive.stats.lost > 0);
});

test('reassigning a chef during cooking preserves paid ingredients and can resume the meal', () => {
  const game = createGame();
  until(game, () => game.orders.some((order) => order.state === 'cooking'));
  const order = game.orders.find((entry) => entry.state === 'cooking'), orderId = order.id;
  action(game, { type: 'PRIORITY', id: order.staffId, role: 'cleaner' });
  action(game, { type: 'HIRE', role: 'chef' });
  const newChef = game.staff.find((member) => member.role === 'chef');
  until(game, () => game.orders.some((entry) => entry.id === orderId && entry.staffId === newChef.id));
  assert.equal(game.orders.find((entry) => entry.id === orderId).state, 'cooking');
  until(game, () => game.stats.served > 0);
  assert.doesNotThrow(() => deserialize(serialize(game)));
});

test('menu requirements, unlocking and enabled recipes affect actual choices', () => {
  const game = createGame();
  assert.equal(dispatch(game, { type: 'TOGGLE_RECIPE', recipeId: 'steak' }).ok, false);
  for (const entry of game.menu.filter((entry) => entry.enabled)) action(game, { type: 'TOGGLE_RECIPE', recipeId: entry.recipeId });
  assert.deepEqual(getStats(game).availableRecipes, []);
  run(game, 30); assert.equal(game.guests.length, 0);
  action(game, { type: 'TOGGLE_RECIPE', recipeId: 'salad' });
  until(game, () => game.stats.served >= 10, 400);
  assert.ok(game.unlocks.includes('steak')); action(game, { type: 'TOGGLE_RECIPE', recipeId: 'steak' });
  assert.ok(getStats(game).availableRecipes.includes('steak'));
  action(game, { type: 'TOGGLE_OPEN' }); run(game, 160);
  const fridge = game.objects.find((object) => object.type === 'fridge'); action(game, { type: 'REMOVE', id: fridge.id });
  assert.equal(getStats(game).availableRecipes.length, 0);
});

test('cleaners restore hygiene while neglect reduces it and toilets influence guests', () => {
  const clean = createGame(), dirty = createGame();
  clean.stats.cleanliness = 40; dirty.stats.cleanliness = 40;
  action(dirty, { type: 'FIRE', id: dirty.staff.find((member) => member.role === 'cleaner').id });
  run(clean, 120); run(dirty, 120);
  assert.ok(clean.stats.cleanliness > 90); assert.ok(dirty.stats.cleanliness < 40);
  assert.ok(clean.stats.rating > dirty.stats.rating);
  const noToilet = createGame();
  action(noToilet, { type: 'REMOVE', id: noToilet.objects.find((object) => object.type === 'toilet').id });
  assert.ok(getStats(noToilet).warnings.some((warning) => warning.includes('toilet')));
});

test('removing facilities preserves valid paused saves and refuses occupied toilets atomically', () => {
  const occupied = createGame();
  until(occupied, () => occupied.guests.some((guest) => guest.state === 'toilet' && guest.toiletReached));
  action(occupied, { type: 'SPEED', speed: 0 });
  const before = serialize(occupied), toilet = occupied.objects.find((object) => object.type === 'toilet');
  const denied = dispatch(occupied, { type: 'REMOVE', id: toilet.id });
  assert.equal(denied.ok, false); assert.match(denied.message, /finished using this toilet/);
  assert.equal(serialize(occupied), before, 'Rejected removal must preserve cash, events, actors and fixtures');
  assert.deepEqual(deserialize(serialize(occupied)), occupied);

  const approaching = createGame();
  until(approaching, () => approaching.guests.some((guest) => guest.state === 'toilet' && !guest.toiletReached));
  action(approaching, { type: 'SPEED', speed: 0 });
  const approachingGuest = approaching.guests.find((guest) => guest.state === 'toilet');
  const approachingCash = approaching.cash;
  action(approaching, { type: 'REMOVE', id: approaching.objects.find((object) => object.type === 'toilet').id });
  assert.equal(approachingGuest.state, 'leaving');
  assert.equal(approaching.cash, approachingCash + Math.round(ITEMS.toilet.cost * 0.6));
  assert.deepEqual(deserialize(serialize(approaching)), approaching);

  const cleaning = createGame();
  cleaning.stats.cleanliness = 50;
  until(cleaning, () => cleaning.staff.some((member) => member.task === 'cleaning'));
  action(cleaning, { type: 'SPEED', speed: 0 });
  const cleaner = cleaning.staff.find((member) => member.task === 'cleaning');
  action(cleaning, { type: 'REMOVE', id: cleaner.taskTarget });
  assert.equal(cleaner.task, 'idle');
  assert.deepEqual(deserialize(serialize(cleaning)), cleaning);
});

test('pause freezes the whole game and speed applies once with deterministic fixed steps', () => {
  const paused = createGame(); action(paused, { type: 'SPEED', speed: 0 });
  const before = serialize(paused); tick(paused, 60); assert.equal(serialize(paused), before);
  const normal = createGame(), fast = createGame(); action(fast, { type: 'SPEED', speed: 3 });
  run(normal, 180, 0.25); run(fast, 60, 0.1); fast.speed = 1;
  assert.equal(serialize(fast), serialize(normal));
});

test('save round trips active movement and kitchen tasks without changing future behavior', () => {
  const game = run(createGame(), 47.1, 0.1), restored = deserialize(serialize(game));
  assert.deepEqual(restored, game);
  run(game, 100, 0.25); run(restored, 100, 0.25);
  assert.equal(serialize(restored), serialize(game));
});

test('8000 consecutive quarter-second saves preserve service states and future behavior', () => {
  const original = createGame();
  let restored = createGame();
  const observedTasks = new Set(), observedStates = new Set();
  for (let step = 0; step < 8000; step++) {
    tick(original, 0.25); tick(restored, 0.25);
    restored = deserialize(serialize(restored));
    for (const member of restored.staff) observedTasks.add(member.task);
    for (const guest of restored.guests) observedStates.add(guest.state);
  }
  assert.equal(serialize(restored), serialize(original));
  for (const task of ['idle', 'taking-order', 'cooking', 'pickup', 'serving', 'cleaning']) assert.ok(observedTasks.has(task), `The persistence check must cover ${task}`);
  for (const state of ['arriving', 'waiting', 'ordered', 'eating', 'toilet', 'leaving']) assert.ok(observedStates.has(state), `The persistence check must cover ${state}`);
  assert.ok(restored.stats.served > 100);
});

test('save validation rejects solid crossings, incompatible cooking sources and missing reciprocal task links', () => {
  const starter = createGame();
  const crossedStove = structuredClone(starter), chef = crossedStove.staff.find((member) => member.role === 'chef');
  chef.path = [{ x: 7, z: 7 }]; chef.task = 'cleaning';
  assert.throws(() => deserialize(serialize(crossedStove)), /path crosses solid furniture/);
  const insideStove = structuredClone(starter);
  Object.assign(insideStove.staff[0], { x: 7, z: 7 });
  assert.throws(() => deserialize(serialize(insideStove)), /position overlaps solid furniture/);
  const cooking = createGame();
  until(cooking, () => cooking.orders.some((order) => order.state === 'cooking'));
  const malformedCooking = [
    (game, order) => { delete order.sourceId; },
    (game, order) => { order.sourceId = game.objects.find((object) => object.type === 'table').id; },
    (game, order) => { delete game.staff.find((member) => member.id === order.staffId).taskTarget; },
    (game, order) => { delete game.staff.find((member) => member.id === order.staffId).orderId; },
    (game, order) => { delete order.staffId; },
    (game, order) => { game.staff.find((member) => member.id === order.staffId).role = 'cleaner'; },
    (game, order) => { delete game.guests.find((guest) => guest.id === order.guestId).orderId; },
  ];
  for (const mutate of malformedCooking) {
    const corrupted = structuredClone(cooking), order = corrupted.orders.find((entry) => entry.state === 'cooking');
    mutate(corrupted, order);
    assert.throws(() => deserialize(serialize(corrupted)), /Cannot load restaurant/);
  }
  const ready = createGame();
  until(ready, () => ready.orders.some((order) => order.state === 'ready' && order.waiterId));
  for (const mutate of [
    (game, order) => { delete order.sourceId; },
    (game, order) => { delete game.staff.find((member) => member.id === order.waiterId).guestId; },
    (game, order) => { delete order.waiterId; },
  ]) {
    const corrupted = structuredClone(ready), order = corrupted.orders.find((entry) => entry.state === 'ready' && entry.waiterId);
    mutate(corrupted, order);
    assert.throws(() => deserialize(serialize(corrupted)), /Cannot load restaurant/);
  }
  const unassignedWaiter = structuredClone(starter);
  unassignedWaiter.staff.find((member) => member.role === 'waiter').task = 'taking-order';
  assert.throws(() => deserialize(serialize(unassignedWaiter)), /waiting guest/);
  const unassignedCleaner = structuredClone(starter);
  unassignedCleaner.staff.find((member) => member.role === 'cleaner').task = 'cleaning';
  assert.throws(() => deserialize(serialize(unassignedCleaner)), /cleaner requires/);
});

test('renovation replans moving actors through adjacent tiles and keeps active saves valid', () => {
  const game = createGame();
  until(game, () => game.guests.some((guest) => guest.state === 'arriving' && guest.z > 5 && guest.z < 5.5));
  action(game, { type: 'REMOVE', id: game.objects.find((object) => object.type === 'door').id });
  action(game, { type: 'PLACE', itemType: 'wall', x: 11, z: 6 });
  assert.doesNotThrow(() => deserialize(serialize(game)), 'The arriving guest must reverse through their current tile when the door is blocked');
  action(game, { type: 'REMOVE', id: game.objects.find((object) => object.x === 11 && object.z === 6).id });
  action(game, { type: 'PLACE', itemType: 'door', x: 11, z: 6 });
  for (let elapsed = 0; elapsed < 80; elapsed += 0.25) {
    tick(game, 0.25);
    assert.doesNotThrow(() => deserialize(serialize(game)), `Save invalid after ${elapsed} seconds of renovation`);
  }
  assert.ok(game.stats.served > 0);
});

test('malformed and inconsistent saves are rejected rather than partially loaded', () => {
  assert.throws(() => deserialize('{bad'), /Cannot load restaurant/);
  assert.throws(() => deserialize('null'), /Cannot load restaurant/);
  assert.throws(() => deserialize({}), /save string/);
  const mutations = [
    (game) => { game.version = 22; }, (game) => { game.cash = 'rich'; },
    (game) => { game.stats.rating = 99; }, (game) => { game.objects[0].type = 'toString'; },
    (game) => { game.objects[0].x = -1; }, (game) => { game.objects[0].rotation = 1; },
    (game) => { game.objects[1].id = game.objects[0].id; }, (game) => { game.nextId = 1; },
    (game) => { game.menu[0].price = -1; }, (game) => { game.staff[0].role = 'astronaut'; },
    (game) => { game.staff[0].path = [{ x: 22, z: 22 }]; }, (game) => { game.floors.push(null); },
    (game) => { game.staff[0].orderId = 'order-missing'; }, (game) => { game.scenario.goals = [{ stat: 'cash', target: 1 }]; },
  ];
  for (const mutate of mutations) {
    const game = createGame(); mutate(game);
    assert.throws(() => deserialize(serialize(game)), /Cannot load restaurant/);
  }
  const occupied = run(createGame(), 30);
  occupied.guests[0].seatId = 'object-missing';
  assert.throws(() => deserialize(serialize(occupied)), /seat/);
});

test('six distinct challenges are selectable with numeric progress and completion rewards only once', () => {
  assert.equal(SCENARIOS.filter((scenario) => scenario.goals.length).length, 6);
  const game = createGame();
  for (const scenario of SCENARIOS) {
    action(game, { type: 'SCENARIO', id: scenario.id });
    const progress = getStats(game).scenarioProgress;
    assert.equal(progress.length, scenario.goals.length);
    for (const goal of progress) assert.ok(Number.isFinite(goal.value) && goal.target > 0 && goal.label);
  }
  action(game, { type: 'SCENARIO', id: 'first-service' });
  until(game, () => game.scenario.complete, 300);
  assert.ok(game.completedScenarios.includes('first-service'));
  const cash = game.cash;
  action(game, { type: 'SCENARIO', id: 'first-service' });
  assert.equal(game.cash, cash); assert.equal(game.scenario.complete, true);
});

test('expansion is bounded, hiring and wages are explicit, and bankruptcy safely closes', () => {
  const game = createGame('empty');
  action(game, { type: 'EXPAND' }); action(game, { type: 'EXPAND' });
  assert.deepEqual(game.land, { minX: 0, maxX: 23, minZ: 0, maxZ: 23 });
  assert.equal(dispatch(game, { type: 'EXPAND' }).ok, false);
  action(game, { type: 'HIRE', role: 'chef' });
  const startingCash = game.cash; run(game, 20);
  assert.ok(Math.abs(game.cash - (startingCash - 6)) < 1e-8);
  game.cash = -499.99; action(game, { type: 'TOGGLE_OPEN' }); tick(game, 1);
  assert.equal(game.bankrupt, true); assert.equal(game.open, false);
  assert.equal(dispatch(game, { type: 'TOGGLE_OPEN' }).ok, false);
  assert.ok(Number.isFinite(game.cash));
});
