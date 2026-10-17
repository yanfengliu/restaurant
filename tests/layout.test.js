import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ITEMS, TASK_GROUPS, TABLEWARE } from '../src/catalog.js';
import { createGame, dispatch, tick, getStats, getSupplies, serialize, deserialize } from '../src/engine.js';

// Bound: public layout actions and deterministic service/save graphs; actual pointer controls and rendered surfaces are integration checks.
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/v1-service.json', import.meta.url), 'utf8')).states;
const act = (game, action) => { const result = dispatch(game, action); assert.equal(result.ok, true, result.message); return result; };
const place = (game, itemType, x, z, rotation = 0) => { act(game, { type: 'PLACE', itemType, x, z, rotation }); return game.objects.at(-1); };
const relocate = (game, object, x, z, rotation) => act(game, { type: 'MOVE', id: object.id, x, z, ...(rotation === undefined ? {} : { rotation }) });
function rejected(game, action) {
  const before = serialize(game), result = dispatch(game, action);
  assert.equal(result.ok, false, `Expected rejection: ${JSON.stringify(action)}`);
  assert.ok(result.message.length > 15);
  assert.equal(serialize(game), before, `Rejected action changed state: ${JSON.stringify(action)}`);
}
function run(game, seconds) { for (let elapsed = 0; elapsed < seconds; elapsed += 0.25) tick(game, Math.min(0.25, seconds - elapsed)); }
function until(game, predicate, limit = 400) {
  for (let elapsed = 0; elapsed < limit && !predicate(); elapsed += 0.25) tick(game, 0.25);
  assert.ok(predicate(), `Expected phase was not reached within ${limit} seconds`);
}
function preserved(game) {
  return structuredClone({ supplies: game.supplies, cash: game.cash, stats: game.stats, daily: game.daily, events: game.events, nextId: game.nextId, seed: game.seed, candidateSeed: game.candidateSeed, elapsed: game.elapsed, calendarSeconds: game.calendarSeconds, doorGrantUsed: game.doorGrantUsed });
}
function conserved(game) {
  for (const type of Object.keys(TABLEWARE)) {
    const ledger = game.supplies.wareLedger[type];
    assert.equal(ledger.granted + ledger.delivered, game.supplies.ware.filter((ware) => ware.type === type).length + ledger.broken);
  }
}
function hire(game, group, x, z) {
  act(game, { type: 'HIRE', candidateId: game.candidates[0].id, x, z });
  const employee = game.staff.at(-1);
  for (const taskGroup of TASK_GROUPS) act(game, { type: 'PRIORITY', id: employee.id, taskGroup, priority: taskGroup === group ? 'high' : 'off' });
  return employee;
}
function workshop() {
  const game = createGame('empty');
  const boardCabinet = place(game, 'counter', 8, 8, 90), board = place(game, 'cuttingboard', 8, 8);
  const fryerCabinet = place(game, 'counter', 10, 8), fryer = place(game, 'fryer', 10, 8);
  const shelf = place(game, 'shelf', 12, 8), sink = place(game, 'sink', 14, 8);
  const table = place(game, 'table', 10, 11), chair = place(game, 'chair', 9, 11);
  for (const recipeId of ['burger', 'salad', 'pasta']) act(game, { type: 'TOGGLE_RECIPE', recipeId });
  return { game, boardCabinet, board, fryerCabinet, fryer, shelf, sink, table, chair };
}
function prepared() {
  const setup = workshop(), { game } = setup;
  act(game, { type: 'INGREDIENT_BATCH', ingredientId: 'potato', quantity: 6 });
  act(game, { type: 'TABLEWARE_ORDER', tablewareId: 'plate', delta: 1 });
  act(game, { type: 'TABLEWARE_ORDER', tablewareId: 'plate', delta: 1 });
  run(game, 135); act(game, { type: 'TOGGLE_RECIPE', recipeId: 'fries' });
  const cook = hire(game, 'cooking', 11, 9), server = hire(game, 'serving', 12, 9), washer = hire(game, 'dishwashing', 13, 9);
  act(game, { type: 'TOGGLE_OPEN' });
  return { ...setup, cook, server, washer };
}

test('every furniture class and employees can be placed on owned bare ground, retaining support and collision constraints', () => {
  const game = createGame('empty');
  let index = 0;
  for (const itemType of Object.keys(ITEMS).filter((type) => !ITEMS[type].support)) {
    place(game, itemType, 5 + index % 7 * 2, 5 + Math.floor(index / 7) * 3); index++;
  }
  const cabinet = game.objects.find((object) => object.type === 'counter');
  place(game, 'cuttingboard', cabinet.x, cabinet.z);
  const second = place(game, 'counter', 12, 14); place(game, 'fryer', second.x, second.z);
  hire(game, 'serving', 11, 17);
  assert.equal(game.floors.length, 0);
  assert.deepEqual(deserialize(serialize(game)), game);
  rejected(game, { type: 'PLACE', itemType: 'stove', x: cabinet.x, z: cabinet.z });
  rejected(game, { type: 'PLACE', itemType: 'fryer', x: 14, z: 14 });
  rejected(game, { type: 'HIRE', candidateId: game.candidates[0].id, x: cabinet.x, z: cabinet.z });
  rejected(game, { type: 'HIRE', candidateId: game.candidates[0].id, x: 3, z: 14 });
});

test('ground moves retain identity, purchase price, money, stock and clocks, including identical no-ops', () => {
  const { game, shelf } = workshop();
  act(game, { type: 'INGREDIENT_BATCH', ingredientId: 'potato', quantity: 6 }); run(game, 135);
  const before = preserved(game), identity = shelf.id, purchase = shelf.purchaseCost;
  relocate(game, shelf, 16, 6, -90);
  assert.equal(shelf.id, identity); assert.equal(shelf.purchaseCost, purchase); assert.equal(shelf.rotation, 270);
  assert.deepEqual(preserved(game), before);
  assert.deepEqual(game.supplies.stocks, [{ storageId: shelf.id, ingredientId: 'potato', quantity: 6 }]);
  const same = serialize(game); relocate(game, shelf, 16, 6, 630); assert.equal(serialize(game), same);
  relocate(game, shelf, 12, 8); assert.equal(shelf.rotation, 270);
  relocate(game, shelf, 12, 8, Number.MAX_VALUE);
  assert.ok([0, 90, 180, 270].includes(shelf.rotation));
  assert.deepEqual(preserved(game), before); assert.deepEqual(deserialize(serialize(game)), game);
  rejected(game, { type: 'REMOVE', id: shelf.id });
});

test('a cabinet carries its supported child and an independent appliance rehosts with its new support alignment', () => {
  const { game, boardCabinet, board, fryerCabinet, fryer } = workshop();
  const before = preserved(game), ids = game.objects.map((object) => object.id);
  relocate(game, boardCabinet, 7, 6, 185);
  assert.deepEqual([boardCabinet.x, boardCabinet.z, boardCabinet.rotation], [7, 6, 180]);
  assert.deepEqual([board.x, board.z, board.rotation, board.parentId], [7, 6, 180, boardCabinet.id]);
  assert.deepEqual(preserved(game), before); assert.deepEqual(game.objects.map((object) => object.id), ids);
  const host = place(game, 'counter', 16, 10, 270), hostedBefore = preserved(game);
  relocate(game, board, 16, 10, 90);
  assert.deepEqual([board.x, board.z, board.rotation, board.parentId], [16, 10, 270, host.id]);
  assert.deepEqual([boardCabinet.x, boardCabinet.z, boardCabinet.rotation], [7, 6, 180]);
  assert.deepEqual(preserved(game), hostedBefore);
  const noOp = serialize(game); relocate(game, board, 16, 10, 0); assert.equal(serialize(game), noOp);
  rejected(game, { type: 'MOVE', id: board.id, x: fryerCabinet.x, z: fryerCabinet.z });
  rejected(game, { type: 'MOVE', id: fryer.id, x: host.x, z: host.z });
  rejected(game, { type: 'MOVE', id: board.id, x: 18, z: 18 });
  assert.deepEqual(deserialize(serialize(game)), game);
});

test('malformed, stale, colliding, unowned and actor-occupied moves reject their full serialized state', () => {
  const { game, shelf, board, cook: employee } = prepared();
  for (const data of [
    { id: 'object-missing', x: 14, z: 14 }, { id: null, x: 14, z: 14 },
    { id: shelf.id, x: 3, z: 14 }, { id: shelf.id, x: 24, z: 14 },
    { id: shelf.id, x: 14.5, z: 14 }, { id: shelf.id, x: '14', z: 14 },
    { id: shelf.id, x: 14, z: 14, rotation: Infinity }, { id: shelf.id, x: 14, z: 14, rotation: NaN },
    { id: shelf.id, x: shelf.x, z: shelf.z, rotation: null },
    { id: shelf.id, x: 10, z: 11 }, { id: shelf.id, x: employee.x, z: employee.z },
    { id: board.id, x: 18, z: 18 },
  ]) rejected(game, { type: 'MOVE', ...data });
  const spare = place(game, 'plant', 18, 18), stale = { type: 'MOVE', id: spare.id, x: 18, z: 17 };
  act(game, { type: 'REMOVE', id: spare.id }); rejected(game, stale);
  until(game, () => game.guests.some((guest) => guest.z >= 4 && guest.z < 5));
  const guest = game.guests.find((guest) => guest.z >= 4 && guest.z < 5);
  rejected(game, { type: 'MOVE', id: shelf.id, x: Math.round(guest.x), z: Math.round(guest.z) });
});

test('moving a prepaid cabinet preserves its queue deadline and delivers to the same ID at its new location', () => {
  const { game, boardCabinet, board } = workshop();
  act(game, { type: 'TABLEWARE_ORDER', tablewareId: 'plate', delta: 1 }); run(game, 20);
  const before = preserved(game), deadline = game.supplies.tablewareNextAt;
  assert.equal(game.supplies.tablewareQueue[0].storageId, boardCabinet.id);
  relocate(game, boardCabinet, 16, 6, 270);
  assert.deepEqual(preserved(game), before); assert.equal(board.parentId, boardCabinet.id);
  let restored = deserialize(serialize(game));
  run(game, 54.75); run(restored, 54.75); assert.equal(game.supplies.ware.length, 0);
  tick(game, 0.25); tick(restored, 0.25); assert.equal(serialize(restored), serialize(game));
  assert.equal(game.elapsed, deadline); assert.equal(game.supplies.ware[0].storageId, boardCabinet.id);
  const deliveredBefore = preserved(game); relocate(game, boardCabinet, 8, 8);
  assert.deepEqual(preserved(game), deliveredBefore); assert.deepEqual(deserialize(serialize(game)), game);
  rejected(game, { type: 'REMOVE', id: boardCabinet.id }); conserved(game);
});

test('structural movement closes rooms for free, retains old floors and preserves door purchase and grant history', () => {
  const game = createGame('empty');
  for (let x = 6; x <= 12; x++) for (const z of [6, 12]) place(game, 'wall', x, z);
  for (let z = 7; z <= 11; z++) for (const x of [6, 12]) if (x !== 6 || z !== 9) place(game, 'wall', x, z, 90);
  assert.equal(getStats(game).hasRoom, false); assert.equal(game.floors.length, 0);
  const wall = place(game, 'window', 4, 9, 90), before = preserved(game);
  assert.equal(game.floors.length, 0);
  relocate(game, wall, 6, 9);
  assert.equal(getStats(game).hasRoom, true); assert.equal(game.floors.length, 25); assert.deepEqual(preserved(game), before);
  act(game, { type: 'FLOOR', x: 8, z: 8, style: 'checker' });
  act(game, { type: 'PLACE', itemType: 'door', x: 6, z: 9 });
  const door = game.objects.find((object) => object.id === wall.id), floorSnapshot = structuredClone(game.floors);
  assert.equal(door.purchaseCost, 0); assert.equal(door.rotation, 90);
  const doorBefore = preserved(game); relocate(game, door, 4, 9, 270);
  assert.equal(getStats(game).hasRoom, false); assert.deepEqual(game.floors, floorSnapshot); assert.deepEqual(preserved(game), doorBefore);
  rejected(game, { type: 'MOVE', id: door.id, x: 6, z: 8 });
  relocate(game, door, 6, 9, 90);
  assert.equal(getStats(game).hasRoom, true); assert.deepEqual(game.floors, floorSnapshot); assert.deepEqual(preserved(game), doorBefore);
  const paidDoor = place(game, 'door', 5, 7); assert.equal(paidDoor.purchaseCost, ITEMS.door.cost);
  const paidBefore = preserved(game); relocate(game, paidDoor, 5, 8); assert.deepEqual(preserved(game), paidBefore);
  assert.equal(paidDoor.purchaseCost, ITEMS.door.cost); assert.deepEqual(deserialize(serialize(game)), game);
});

test('reserved dining, active sources and supported parents cannot move, while an exact busy no-op is unchanged', () => {
  const { game, table, chair, fryer, fryerCabinet } = prepared();
  until(game, () => game.guests.some((guest) => guest.state === 'arriving'));
  rejected(game, { type: 'MOVE', id: table.id, x: 16, z: 12 });
  rejected(game, { type: 'MOVE', id: chair.id, x: 16, z: 13 });
  const occupiedNoOp = serialize(game); relocate(game, table, table.x, table.z); assert.equal(serialize(game), occupiedNoOp);
  until(game, () => game.orders.some((order) => order.state === 'cooking'));
  const first = game.orders.find((order) => order.state === 'cooking');
  assert.equal(first.sourceId, fryer.id);
  for (const object of [fryer, fryerCabinet]) rejected(game, { type: 'MOVE', id: object.id, x: 16, z: 12 });
  until(game, () => game.orders.some((order) => order.id === first.id && order.state === 'ready'));
  rejected(game, { type: 'MOVE', id: fryerCabinet.id, x: 16, z: 12 });
  until(game, () => game.staff.some((member) => member.task === 'serving'));
  rejected(game, { type: 'MOVE', id: fryerCabinet.id, x: 16, z: 12 });
  assert.deepEqual(deserialize(serialize(game)), game);
});

test('dirty locations and active sinks stay fixed; reserved return cabinets may move before the return task', () => {
  const { game, table, sink, washer } = prepared();
  until(game, () => washer.task === 'dish-collect');
  const ware = game.supplies.ware.find((unit) => unit.id === washer.wareId), cabinet = game.objects.find((object) => object.id === ware.returnStorageId);
  rejected(game, { type: 'MOVE', id: table.id, x: 16, z: 12 });
  rejected(game, { type: 'MOVE', id: sink.id, x: 18, z: 7 });
  let before = preserved(game); relocate(game, cabinet, 16, 6, 180); assert.deepEqual(preserved(game), before);
  assert.equal(ware.returnStorageId, cabinet.id);
  tick(game, 0.25); assert.deepEqual(deserialize(serialize(game)), game);
  until(game, () => washer.task === 'dish-wash');
  before = preserved(game); relocate(game, cabinet, 18, 10, 270); assert.deepEqual(preserved(game), before);
  assert.equal(ware.returnStorageId, cabinet.id);
  rejected(game, { type: 'MOVE', id: sink.id, x: 18, z: 7 });
  let restored = deserialize(serialize(game));
  until(game, () => washer.task === 'dish-return');
  until(restored, () => restored.staff.find((member) => member.id === washer.id).task === 'dish-return');
  assert.equal(serialize(restored), serialize(game));
  const end = washer.path.at(-1) ?? washer;
  assert.equal(Math.abs(end.x - cabinet.x) + Math.abs(end.z - cabinet.z), 1);
  rejected(game, { type: 'MOVE', id: cabinet.id, x: 16, z: 6 });
  until(game, () => ware.state === 'clean');
  until(restored, () => restored.supplies.ware.find((unit) => unit.id === ware.id).state === 'clean');
  assert.equal(serialize(restored), serialize(game)); assert.equal(ware.storageId, cabinet.id);
  assert.ok(game.stats.served > 0); conserved(game); assert.equal(game.floors.length, 0);
});

test('toilet destinations remain fixed before and after arrival, including an occupied rotation', () => {
  const game = createGame();
  until(game, () => game.guests.some((guest) => guest.state === 'toilet'));
  const guest = game.guests.find((entry) => entry.state === 'toilet'), target = guest.path.at(-1) ?? guest;
  const toilet = game.objects.find((object) => object.type === 'toilet' && Math.abs(target.x - object.x) + Math.abs(target.z - object.z) <= 1);
  assert.ok(toilet);
  rejected(game, { type: 'MOVE', id: toilet.id, x: 18, z: 18 });
  until(game, () => guest.toiletReached);
  rejected(game, { type: 'MOVE', id: toilet.id, x: toilet.x, z: toilet.z, rotation: toilet.rotation + 90 });
  const before = serialize(game); relocate(game, toilet, toilet.x, toilet.z); assert.equal(serialize(game), before);
  assert.deepEqual(deserialize(serialize(game)), game);
});

test('a real structural move keeps ordinary renovation departure events when an arriving chair becomes unreachable', () => {
  const game = createGame();
  act(game, { type: 'REMOVE', id: game.objects.find((object) => object.type === 'door').id });
  const wall = place(game, 'wall', 18, 18);
  until(game, () => game.guests.some((guest) => guest.state === 'arriving' && guest.z > 5 && guest.z < 5.5));
  const guest = game.guests.find((entry) => entry.state === 'arriving' && entry.z > 5 && entry.z < 5.5);
  const { cash, nextId, stats: { lost }, seed } = game, supplies = structuredClone(game.supplies);
  relocate(game, wall, 11, 6);
  assert.equal(guest.state, 'leaving'); assert.equal(guest.failed, true);
  assert.equal(game.stats.lost, lost + 1); assert.equal(game.nextId, nextId + 1);
  assert.match(game.events[0].text, /seat became inaccessible/);
  assert.equal(game.cash, cash); assert.equal(game.seed, seed); assert.deepEqual(game.supplies, supplies);
  assert.deepEqual(deserialize(serialize(game)), game);
});

test('outdoor renovation repeatedly reloads with valid active paths and deterministic paid service', () => {
  const { game, shelf } = prepared();
  const decoration = place(game, 'plant', 18, 18);
  let restored = deserialize(serialize(game)), moves = 0;
  const observed = new Set();
  for (let index = 0; index < 1200; index++) {
    if (index % 40 === 0) {
      for (const current of [game, restored]) {
        const object = current.objects.find((entry) => entry.id === decoration.id);
        relocate(current, object, index % 80 === 0 ? 17 : 18, 18, index % 360);
        const store = current.objects.find((entry) => entry.id === shelf.id);
        relocate(current, store, index % 80 === 0 ? 16 : 12, 8);
      }
      moves += 2;
    }
    tick(game, 0.25); tick(restored, 0.25); restored = deserialize(serialize(restored));
    assert.equal(serialize(restored), serialize(game), `Future diverged at step ${index}`);
    for (const guest of game.guests) observed.add(guest.state);
    for (const unit of game.supplies.ware) observed.add(unit.state);
  }
  assert.equal(moves, 60); assert.ok(game.stats.served >= 5); assert.ok(game.stats.revenue >= 75);
  assert.equal(game.floors.length, 0); assert.equal(getStats(game).seats, 1);
  for (const phase of ['arriving', 'ordered', 'eating', 'leaving', 'carriedMeal', 'washing', 'clean']) assert.ok(observed.has(phase), `Missing outdoor phase ${phase}`);
  conserved(game);
});

test('outdoor version 2 dining acceptance does not relax the frozen version 1 reserved-floor validation', () => {
  const old = structuredClone(fixtures.eating), guest = old.guests.find((entry) => entry.state === 'eating');
  const chair = old.objects.find((object) => object.id === guest.seatId);
  old.floors = old.floors.filter((floor) => floor.x !== chair.x || floor.z !== chair.z);
  assert.throws(() => deserialize(JSON.stringify(old)), /reserved seat/);
  const outdoor = prepared().game;
  until(outdoor, () => outdoor.guests.some((entry) => entry.state === 'eating'));
  assert.equal(outdoor.floors.length, 0); assert.deepEqual(deserialize(serialize(outdoor)), outdoor);
  const malformed = structuredClone(outdoor), seat = malformed.objects.find((object) => object.id === malformed.guests.find((entry) => entry.state === 'eating').seatId);
  seat.z += 2;
  assert.throws(() => deserialize(serialize(malformed)), /reserved seat|overlaps solid furniture/);
});

test('outdoor seating readiness suppresses enclosure advice only while a chair has a clear entry route', () => {
  const { game, chair } = workshop();
  let stats = getStats(game);
  assert.equal(stats.hasUsableSeating, true); assert.equal(stats.hasRoom, false); assert.equal(stats.buildingReady, false);
  assert.equal(stats.warnings.some((warning) => /wall boundary|enclosed room|unreachable/.test(warning)), false);
  for (const [x, z] of [[chair.x - 1, chair.z], [chair.x, chair.z - 1], [chair.x, chair.z + 1]]) place(game, 'wall', x, z);
  stats = getStats(game);
  assert.equal(stats.hasUsableSeating, false); assert.equal(stats.seats, 1);
  assert.ok(stats.warnings.some((warning) => /dining seats are unreachable/.test(warning)));
});
