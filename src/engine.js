import { ITEMS, RECIPES, SCENARIOS, INGREDIENTS, TABLEWARE, TASK_GROUPS } from './catalog.js';

const STEP = 0.25;
const DAY_SECONDS = 15;
const MONTH_SECONDS = 450;
const PRIORITIES = ['normal', 'high', 'off', 'low'];
const accessCache = new WeakMap();
const V1_RECIPES = [
  ['burger', 4.5, 8, ['stove', 'prep', 'fridge']], ['salad', 3, 5, ['prep', 'fridge']],
  ['pasta', 4, 10, ['stove', 'prep']], ['steak', 9, 13, ['stove', 'prep', 'fridge']],
  ['risotto', 6, 12, ['stove', 'prep', 'fridge']], ['chef-special', 11, 16, ['stove', 'prep', 'fridge', 'sink']],
].map(([id, cost, cookTime, equipment]) => ({ id, cost, cookTime, equipment }));
const V1_ITEMS = Object.fromEntries(Object.entries({ table: 50, chair: 25, counter: 50, stove: 750, prep: 320, fridge: 150, sink: 220, bin: 70, toilet: 280, plant: 85, painting: 110, clock: 65, flowerbox: 95, lamp: 120, wall: 12, door: 90, window: 65 }).map(([type, cost]) => [type, { cost, solid: type !== 'door' }]));
const ENTRY = { x: 11, z: 3 };
const ROLES = ['chef', 'waiter', 'cleaner'];
const WAGES = { chef: 6, waiter: 4, cleaner: 2 };
const NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Riley', 'Morgan', 'Jamie', 'Casey', 'Robin', 'Charlie', 'Avery', 'Drew'];
const GUEST_STATES = ['arriving', 'waiting', 'ordered', 'eating', 'toilet', 'leaving'];
const STRUCTURAL_TYPES = new Set(['wall', 'window', 'door']);
const FLOOR_STYLES = new Set(['wood', 'tile', 'kitchen', 'stone', 'checker', 'peach']);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const tile = (value) => Math.round(value);
const key = (x, z) => `${x},${z}`;
const sameTile = (a, b) => tile(a.x) === tile(b.x) && tile(a.z) === tile(b.z);
const inside = (x, z) => Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < 24 && z < 24;
const owned = (game, x, z) => x >= game.land.minX && x <= game.land.maxX && z >= game.land.minZ && z <= game.land.maxZ;
const recipeById = (id) => RECIPES.find((recipe) => recipe.id === id);
const objectById = (game, id) => game.objects.find((object) => object.id === id);
const id = (game, prefix) => `${prefix}-${game.nextId++}`;

function random(game) {
  game.seed = (Math.imul(game.seed, 1664525) + 1013904223) >>> 0;
  return game.seed / 4294967296;
}

function event(game, text) {
  game.events.unshift({ id: id(game, 'event'), text, time: game.time, day: game.day });
  game.events.length = Math.min(game.events.length, 24);
}

function spend(game, amount) {
  game.cash -= amount;
  game.stats.expenses += amount;
  game.daily.expenses += amount;
}

function outcome(ok, message) { return { ok, message }; }

function addObject(game, type, x, z, rotation = 0, purchaseCost) {
  const object = { id: id(game, 'object'), type, x, z, rotation };
  if (purchaseCost !== undefined) object.purchaseCost = purchaseCost;
  game.objects.push(object);
  return object;
}

function profile(role) {
  const priorities = Object.fromEntries(TASK_GROUPS.map((group) => [group, 'off']));
  if (role === 'chef') priorities.cooking = 'high';
  else if (role === 'waiter') priorities.serving = 'high';
  else { priorities.cleaning = 'normal'; priorities.dishwashing = 'normal'; }
  return priorities;
}

function candidate(game) {
  const rng = { seed: game.candidateSeed ?? ((game.seed ^ 0x54a97) >>> 0) };
  const skills = Object.fromEntries(['cooking', 'speed', 'clumsiness'].map((skill) => [skill, Math.round(random(rng) * 100) / 100]));
  const name = NAMES[Math.floor(random(rng) * NAMES.length)]; game.candidateSeed = rng.seed;
  return { id: id(game, 'candidate'), name, skills, monthlyWage: Math.round(30 + 45 * skills.cooking + 45 * skills.speed + 30 * (1 - skills.clumsiness)) };
}

function addStaff(game, role) {
  const member = { id: id(game, 'staff'), name: NAMES[game.staff.length % NAMES.length], role: 'employee', monthlyWage: WAGES[role] * 22.5, wageAccrued: 0, skills: { cooking: 0.5, speed: 0.5, clumsiness: 0.1 }, priorities: profile(role), energy: 100, x: 8 + game.staff.length, z: 7, task: 'idle', path: [], timer: 0 };
  const spot = nearestWalkable(game, member);
  if (spot) Object.assign(member, spot);
  game.staff.push(member);
  return member;
}

export function createGame(mode = 'sandbox') {
  const selected = SCENARIOS.find((scenario) => scenario.id === mode) ?? SCENARIOS[0];
  const game = {
    version: 2, mode, name: 'Corner Table', cash: mode === 'empty' ? 15000 : 6250,
    day: 1, time: 0, calendarSeconds: 0, speed: 1, open: mode !== 'empty',
    land: { minX: 4, maxX: 19, minZ: 4, maxZ: 19 }, floors: [], objects: [], staff: [], guests: [], orders: [],
    menu: RECIPES.map((recipe) => ({ recipeId: recipe.id, price: recipe.price, enabled: ['burger', 'salad', 'pasta'].includes(recipe.id) })),
    stats: { served: 0, lost: 0, revenue: 0, expenses: 0, rating: 3.8, cleanliness: 100 },
    events: [], scenario: { ...structuredClone(selected), complete: false },
    seed: 741852, nextId: 1, elapsed: 0, accumulator: 0, arrivalIn: 3, bankrupt: false, unlocks: [], completedScenarios: [], doorGrantUsed: mode !== 'empty',
    daily: { served: 0, revenue: 0, expenses: 0 }, candidates: [], cleaningDueSince: null, supplies: freshSupplies(1),
  };
  if (mode !== 'empty') {
    for (let x = 6; x <= 17; x++) for (let z = 6; z <= 16; z++) game.floors.push({ x, z, style: z <= 8 ? 'kitchen' : 'peach' });
    for (let x = 6; x <= 17; x++) { addObject(game, 'wall', x, 6); addObject(game, 'wall', x, 16); }
    for (let z = 7; z <= 15; z++) { addObject(game, 'wall', 6, z, 90); addObject(game, 'wall', 17, z, 90); }
    game.objects = game.objects.filter((object) => !(object.x === 11 && object.z === 6));
    addObject(game, 'door', 11, 6, 0, 0);
    addObject(game, 'stove', 7, 7); addObject(game, 'prep', 8, 7); addObject(game, 'fridge', 9, 7);
    addObject(game, 'sink', 13, 7); addObject(game, 'bin', 14, 7); addObject(game, 'counter', 12, 8);
    addObject(game, 'counter', 13, 8); addObject(game, 'bigshelf', 10, 7);
    for (const [x, z] of [[9, 10], [13, 10], [9, 13], [13, 13]]) {
      addObject(game, 'table', x, z); addObject(game, 'chair', x - 1, z, 90); addObject(game, 'chair', x + 1, z, 270);
    }
    addObject(game, 'toilet', 16, 14); addObject(game, 'sink', 16, 13);
    for (const [x, z] of [[7, 9], [16, 9], [7, 15], [15, 15]]) addObject(game, 'plant', x, z);
    addObject(game, 'painting', 10, 15); addObject(game, 'clock', 14, 15); addObject(game, 'lamp', 7, 12); addObject(game, 'flowerbox', 10, 5);
    addStaff(game, 'chef'); addStaff(game, 'waiter'); addStaff(game, 'cleaner');
    const shelf = game.objects.find((object) => object.type === 'bigshelf'), fridge = game.objects.find((object) => object.type === 'fridge');
    for (const [ingredientId, quantity] of Object.entries({ flour: 8, tomato: 12, avocado: 4 })) {
      game.supplies.stocks.push({ storageId: shelf.id, ingredientId, quantity }); game.supplies.ingredientBatches[ingredientId] = quantity;
    }
    game.supplies.stocks.push({ storageId: fridge.id, ingredientId: 'steak', quantity: 6 }); game.supplies.ingredientBatches.steak = 6;
    const cabinets = game.objects.filter((object) => object.type === 'counter');
    for (let index = 0; index < 12; index++) grantWare(game, index < 8 ? 'plate' : 'bowl', 'clean', { storageId: cabinets[index < 10 ? 0 : 1].id });
    event(game, 'Welcome! Your restaurant is open. Build, hire and create your menu.');
  } else event(game, 'A fresh start. Lay floors, build a kitchen and dining room, then open your doors.');
  game.candidates = Array.from({ length: 3 }, () => candidate(game));
  return game;
}

function freshSupplies(day) {
  return { stocks: [], ingredientBatches: Object.fromEntries(Object.keys(INGREDIENTS).map((id) => [id, 0])), ingredientNextDay: (Math.floor(day / 10) + 1) * 10, tablewareQueue: [], tablewareNextAt: null, ware: [], wareLedger: Object.fromEntries(Object.keys(TABLEWARE).map((id) => [id, { granted: 0, delivered: 0, broken: 0 }])) };
}

function grantWare(game, type, state, links, delivered = false) {
  const ware = { id: id(game, 'ware'), type, state, ...links };
  game.supplies.ware.push(ware); game.supplies.wareLedger[type][delivered ? 'delivered' : 'granted']++;
  return ware;
}

const wareById = (game, id) => game.supplies.ware.find((ware) => ware.id === id);
const capability = (object, type) => object.type === type || type === 'prep' && object.type === 'cuttingboard';
const capacity = (game, kind) => game.objects.reduce((sum, object) => sum + (ITEMS[object.type].storageKind === kind ? ITEMS[object.type].capacity : 0), 0);
function usedStorage(game, storageId) {
  return game.supplies.stocks.filter((stock) => stock.storageId === storageId).reduce((sum, stock) => sum + stock.quantity, 0) + game.supplies.ware.filter((ware) => ware.state === 'clean' && ware.storageId === storageId).length;
}
function reservedStorage(game, storageId) {
  return game.supplies.tablewareQueue.filter((queue) => queue.storageId === storageId).reduce((sum, queue) => sum + queue.quantity, 0) + game.supplies.ware.filter((ware) => ware.returnStorageId === storageId).length;
}
const freeStorage = (game, object) => ITEMS[object.type].capacity - usedStorage(game, object.id) - reservedStorage(game, object.id);

function reachable(game, actor, object) {
  if (!object) return false;
  let components = accessCache.get(game);
  if (!components) {
    components = new Map(); const blocked = blockers(game); let component = 0;
    for (let x = 0; x < 24; x++) for (let z = 0; z < 24; z++) {
      if (blocked.has(key(x, z)) || components.has(key(x, z))) continue;
      const queue = [{ x, z }]; components.set(key(x, z), ++component);
      for (let index = 0; index < queue.length; index++) {
        const cell = queue[index];
        for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
          const nx = cell.x + dx, nz = cell.z + dz;
          if (inside(nx, nz) && !blocked.has(key(nx, nz)) && !components.has(key(nx, nz))) { components.set(key(nx, nz), component); queue.push({ x: nx, z: nz }); }
        }
      }
    }
    accessCache.set(game, components);
  }
  const start = components.get(key(tile(actor.x), tile(actor.z)));
  const starts = start ? [start] : [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dz]) => components.get(key(tile(actor.x) + dx, tile(actor.z) + dz))).filter(Boolean);
  return [[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dz]) => starts.includes(components.get(key(object.x + dx, object.z + dz))));
}

function materialPlan(game, recipe, actor = ENTRY) {
  if (!recipe.equipment.every((type) => game.objects.some((object) => capability(object, type) && reachable(game, actor, object)))) return null;
  const allocations = [];
  for (const [ingredientId, needed] of Object.entries(recipe.ingredients)) {
    let remaining = needed;
    for (const stock of game.supplies.stocks) {
      if (stock.ingredientId !== ingredientId || !reachable(game, actor, objectById(game, stock.storageId))) continue;
      const quantity = Math.min(remaining, stock.quantity); if (quantity) allocations.push({ stock, quantity }); remaining -= quantity;
      if (!remaining) break;
    }
    if (remaining) return null;
  }
  const ware = game.supplies.ware.find((ware) => ware.type === recipe.tableware && ware.state === 'clean' && reachable(game, actor, objectById(game, ware.storageId)));
  return ware ? { allocations, ware } : null;
}

function ingredientDeliveryPlan(game) {
  const stores = game.objects.filter((object) => ['shelf', 'fridge'].includes(ITEMS[object.type].storageKind) && reachable(game, ENTRY, object)).sort((a, b) => a.id.localeCompare(b.id));
  const space = new Map(stores.map((object) => [object.id, freeStorage(game, object)])), allocations = [];
  for (const ingredientId of Object.keys(INGREDIENTS)) {
    const quantity = game.supplies.ingredientBatches[ingredientId];
    let remaining = quantity;
    for (const store of stores) {
      if (ITEMS[store.type].storageKind !== INGREDIENTS[ingredientId].storageKind) continue;
      const amount = Math.min(remaining, space.get(store.id));
      if (amount) allocations.push({ storageId: store.id, ingredientId, quantity: amount });
      remaining -= amount; space.set(store.id, space.get(store.id) - amount);
      if (!remaining) break;
    }
  }
  return { allocations, cost: allocations.reduce((sum, stock) => sum + stock.quantity * INGREDIENTS[stock.ingredientId].unitPrice, 0) };
}

export function getSupplies(game) {
  const plan = ingredientDeliveryPlan(game);
  const ingredients = Object.entries(INGREDIENTS).map(([id, item]) => {
    const onHand = game.supplies.stocks.filter((stock) => stock.ingredientId === id).reduce((sum, stock) => sum + stock.quantity, 0);
    const usable = game.supplies.stocks.filter((stock) => stock.ingredientId === id && reachable(game, ENTRY, objectById(game, stock.storageId))).reduce((sum, stock) => sum + stock.quantity, 0);
    const stores = game.objects.filter((object) => ITEMS[object.type].storageKind === item.storageKind);
    const nextQuantity = plan.allocations.filter((stock) => stock.ingredientId === id).reduce((sum, stock) => sum + stock.quantity, 0);
    const storageCapacity = capacity(game, item.storageKind), storageFree = stores.reduce((sum, store) => sum + freeStorage(game, store), 0);
    const storageAvailable = stores.some((store) => reachable(game, ENTRY, store));
    const batchQuantity = game.supplies.ingredientBatches[id];
    return { id, ...item, onHand, usable, batchQuantity, batchLimit: storageCapacity, storageCapacity, storageFree, storageAvailable, nextQuantity, nextCost: nextQuantity * item.unitPrice, scheduledCost: batchQuantity * item.unitPrice, blockedReason: !storageAvailable ? 'Add accessible matching storage.' : !storageFree && batchQuantity ? 'Storage is full.' : '' };
  });
  const tableware = Object.entries(TABLEWARE).map(([id, item]) => {
    const units = game.supplies.ware.filter((ware) => ware.type === id);
    const clean = units.filter((ware) => ware.state === 'clean').length;
    const usable = units.filter((ware) => ware.state === 'clean' && reachable(game, ENTRY, objectById(game, ware.storageId))).length;
    const queued = game.supplies.tablewareQueue.filter((queue) => queue.tablewareId === id).reduce((sum, queue) => sum + queue.quantity, 0);
    const free = game.objects.filter((object) => object.type === 'counter').reduce((sum, object) => sum + freeStorage(game, object), 0);
    return { id, ...item, clean, usable, inUse: units.filter((ware) => ['order', 'carriedMeal', 'guest'].includes(ware.state)).length, dirty: units.filter((ware) => ['dirty', 'carriedDirty', 'washing'].includes(ware.state)).length, returning: units.filter((ware) => ware.state === 'carriedClean').length, queued, broken: game.supplies.wareLedger[id].broken, capacity: capacity(game, 'tableware'), free, canAdd: game.cash >= 15 && game.objects.some((object) => object.type === 'counter' && freeStorage(game, object) > 0 && reachable(game, ENTRY, object)), canCancel: queued > 0 };
  });
  const nextDay = game.supplies.ingredientNextDay, remainingSeconds = Math.max(0, (nextDay - 1) * DAY_SECONDS - game.calendarSeconds);
  const ingredientActive = ingredients.some((row) => row.batchQuantity);
  const ingredientAccessReason = ingredients.find((row) => row.batchQuantity && !row.storageAvailable)?.blockedReason;
  const queued = game.supplies.tablewareQueue.length > 0, wareRemaining = queued ? Math.max(0, game.supplies.tablewareNextAt - game.elapsed) : 0;
  const wareBlocked = queued && wareRemaining === 0 && game.supplies.tablewareQueue.some((queue) => !reachable(game, ENTRY, objectById(game, queue.storageId)));
  return { ingredients, tableware, storage: game.objects.filter((object) => ITEMS[object.type].capacity).map((object) => {
    const contents = game.supplies.stocks.filter((stock) => stock.storageId === object.id).map((stock) => ({ id: stock.ingredientId, quantity: stock.quantity }));
    for (const type of Object.keys(TABLEWARE)) {
      const quantity = game.supplies.ware.filter((ware) => ware.state === 'clean' && ware.storageId === object.id && ware.type === type).length;
      if (quantity) contents.push({ id: type, quantity });
    }
    return { id: object.id, capacity: ITEMS[object.type].capacity, used: usedStorage(game, object.id), reserved: reservedStorage(game, object.id), contents };
  }), deliveries: {
    ingredient: { status: ingredientActive ? (plan.cost > game.cash || ingredientAccessReason ? 'blocked' : 'waiting') : 'idle', nextDay, remainingSeconds, progress: clamp(1 - remainingSeconds / (nextDay === 10 ? 135 : 150), 0, 1), nextCost: plan.cost, scheduledCost: ingredients.reduce((sum, row) => sum + row.scheduledCost, 0), blockedReason: plan.cost > game.cash ? 'Insufficient cash for the next delivery.' : ingredientAccessReason ?? game.supplies.ingredientBlockedReason ?? '' },
    tableware: { status: !queued ? 'idle' : wareBlocked ? 'blocked' : wareRemaining ? 'waiting' : 'due', nextDay: queued ? game.day + (wareRemaining / DAY_SECONDS) : null, remainingSeconds: wareRemaining, progress: queued ? clamp(1 - wareRemaining / 75, 0, 1) : 0, nextCost: 0, blockedReason: wareBlocked ? 'The delivery cabinet is inaccessible.' : '' },
  } };
}

export function getRecipeStatus(game) {
  return RECIPES.map((recipe) => {
    const requirements = recipe.equipment.map((type) => {
      const objects = game.objects.filter((object) => capability(object, type)), available = objects.filter((object) => reachable(game, ENTRY, object)).length;
      return { kind: 'equipment', id: type, label: ITEMS[type].name, required: 1, available, owned: objects.length, met: available > 0, reason: available ? '' : objects.length ? 'Equipment is inaccessible.' : `Add ${ITEMS[type].name.toLowerCase()}.` };
    });
    for (const [id, required] of Object.entries(recipe.ingredients)) {
      const stocks = game.supplies.stocks.filter((stock) => stock.ingredientId === id), owned = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
      const available = stocks.filter((stock) => reachable(game, ENTRY, objectById(game, stock.storageId))).reduce((sum, stock) => sum + stock.quantity, 0);
      requirements.push({ kind: 'ingredient', id, label: INGREDIENTS[id].name, required, available, owned, met: available >= required, reason: available >= required ? '' : owned >= required ? 'Ingredient storage is inaccessible.' : 'Order this ingredient for delivery.' });
    }
    const clean = game.supplies.ware.filter((ware) => ware.type === recipe.tableware && ware.state === 'clean'), usable = clean.filter((ware) => reachable(game, ENTRY, objectById(game, ware.storageId))).length;
    requirements.push({ kind: 'tableware', id: recipe.tableware, label: TABLEWARE[recipe.tableware].name, required: 1, available: usable, owned: game.supplies.ware.filter((ware) => ware.type === recipe.tableware).length, met: usable > 0, reason: usable ? '' : 'Buy or wash a clean dish.' });
    const missing = requirements.filter((row) => !row.met), unlocked = game.stats.served >= recipe.unlock, enabled = game.menu.find((entry) => entry.recipeId === recipe.id).enabled;
    return { recipeId: recipe.id, enabled, unlocked, canEnable: unlocked && !missing.length, canOrder: enabled && unlocked && !missing.some((row) => row.kind === 'equipment'), canPrepare: unlocked && !missing.length, status: !unlocked ? 'locked' : missing.some((row) => row.kind === 'equipment') ? 'missing-equipment' : missing.some((row) => row.kind === 'ingredient') ? 'missing-stock' : missing.length ? 'missing-tableware' : 'ready', requirements, missing };
  });
}

function updateDeliveries(game) {
  if (game.calendarSeconds >= (game.supplies.ingredientNextDay - 1) * DAY_SECONDS) {
    const plan = ingredientDeliveryPlan(game);
    game.supplies.ingredientBlockedReason = plan.cost > game.cash ? 'The last delivery was skipped because cash was insufficient.' : '';
    if (plan.cost <= game.cash && plan.cost > 0) {
      spend(game, plan.cost);
      for (const stock of plan.allocations) {
        const existing = game.supplies.stocks.find((entry) => entry.storageId === stock.storageId && entry.ingredientId === stock.ingredientId);
        if (existing) existing.quantity += stock.quantity; else game.supplies.stocks.push(stock);
      }
      event(game, `Ingredient delivery arrived: $${plan.cost}.`);
    }
    game.supplies.ingredientNextDay += 10;
  }
  if (game.supplies.tablewareQueue.length && game.elapsed >= game.supplies.tablewareNextAt) {
    const remaining = [];
    for (const queue of game.supplies.tablewareQueue) {
      if (!reachable(game, ENTRY, objectById(game, queue.storageId))) { remaining.push(queue); continue; }
      for (let index = 0; index < queue.quantity; index++) grantWare(game, queue.tablewareId, 'clean', { storageId: queue.storageId }, true);
    }
    game.supplies.tablewareQueue = remaining;
    if (!remaining.length) game.supplies.tablewareNextAt = null;
  }
}

function roomLayout(game) {
  const boundary = new Set(game.objects.filter((object) => STRUCTURAL_TYPES.has(object.type)).map((object) => key(object.x, object.z)));
  const outside = new Set(), queue = [];
  const enqueue = (x, z) => {
    const cellKey = key(x, z);
    if (!inside(x, z) || boundary.has(cellKey) || outside.has(cellKey)) return;
    outside.add(cellKey); queue.push({ x, z });
  };
  for (let edge = 0; edge < 24; edge++) { enqueue(edge, 0); enqueue(edge, 23); enqueue(0, edge); enqueue(23, edge); }
  for (let index = 0; index < queue.length; index++) {
    const { x, z } = queue[index];
    for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) enqueue(x + dx, z + dz);
  }
  const interior = [];
  for (let x = game.land.minX; x <= game.land.maxX; x++) for (let z = game.land.minZ; z <= game.land.maxZ; z++) {
    if (!boundary.has(key(x, z)) && !outside.has(key(x, z))) interior.push({ x, z });
  }
  return { interior, outside };
}

function floorEnclosedRooms(game) {
  const floors = new Set(game.floors.map((floor) => key(floor.x, floor.z)));
  for (const cell of roomLayout(game).interior) if (!floors.has(key(cell.x, cell.z))) game.floors.push({ ...cell, style: 'peach' });
}

function buildingReadiness(game) {
  const { interior, outside } = roomLayout(game), roomTiles = new Set(interior.map((cell) => key(cell.x, cell.z)));
  const blocked = blockers(game);
  const hasRoom = interior.length > 0;
  const hasEntrance = hasRoom && game.objects.some((object) => {
    if (object.type !== 'door') return false;
    const neighbors = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dz]) => key(object.x + dx, object.z + dz)).filter((cellKey) => !blocked.has(cellKey));
    return neighbors.some((cellKey) => roomTiles.has(cellKey)) && neighbors.some((cellKey) => outside.has(cellKey)) && pathTo(game, ENTRY, object) !== null;
  });
  return { hasRoom, hasEntrance, buildingReady: hasRoom && hasEntrance };
}

function strokeCells(cells) {
  if (!Array.isArray(cells) || !cells.length || cells.length > 24 || cells.some((cell) => !cell || !inside(cell.x, cell.z))) return null;
  if (new Set(cells.map((cell) => key(cell.x, cell.z))).size !== cells.length) return null;
  const alongX = cells.every((cell) => cell.z === cells[0].z), alongZ = cells.every((cell) => cell.x === cells[0].x);
  if (!alongX && !alongZ) return null;
  const sorted = cells.map(({ x, z }) => ({ x, z })).sort((a, b) => alongX ? a.x - b.x : a.z - b.z);
  if (sorted.some((cell, index) => index > 0 && Math.abs(cell.x - sorted[index - 1].x) + Math.abs(cell.z - sorted[index - 1].z) !== 1)) return null;
  return sorted;
}

function placeObjects(game, itemType, cells, rotation) {
  const item = Object.hasOwn(ITEMS, itemType) ? ITEMS[itemType] : null;
  if (!item) return outcome(false, `Unknown furniture type: ${String(itemType)}.`);
  const changes = [];
  let totalCost = 0;
  for (const { x, z } of cells) {
    if (!inside(x, z) || !owned(game, x, z)) return outcome(false, 'Place furniture on a tile inside your owned land.');
    const existing = game.objects.find((object) => !object.parentId && object.x === x && object.z === z);
    const parent = item.support && existing?.type === item.support ? existing : null;
    if (item.support && (!parent || game.objects.some((object) => object.parentId === parent.id))) return outcome(false, 'Place this appliance on an empty cabinet using its ground tile.');
    if (existing && STRUCTURAL_TYPES.has(itemType) && existing.type === itemType) continue;
    const replacingWall = itemType === 'door' && existing && ['wall', 'window'].includes(existing.type);
    if (existing && !replacingWall && !parent) return outcome(false, 'That tile already contains furniture.');
    if (game.guests.some((guest) => sameTile(guest, { x, z }))) return outcome(false, 'Wait for the guest to leave this tile before building.');
    if (!['Building', 'Decoration'].includes(item.category) && !game.floors.some((floor) => floor.x === x && floor.z === z)) return outcome(false, 'Lay a floor on this tile before placing furniture.');
    const cost = itemType === 'door' && !game.doorGrantUsed ? 0 : item.cost;
    totalCost += cost; changes.push({ x, z, existing: replacingWall ? existing : null, parent, cost });
  }
  if (!changes.length) return outcome(true, `${item.name} is already in place.`);
  if (totalCost > 0 && game.cash < totalCost) return outcome(false, `You need $${totalCost} to buy ${changes.length === 1 ? item.name.toLowerCase() : `${changes.length} ${item.name.toLowerCase()} segments`}.`);
  if (totalCost > 0) spend(game, totalCost);
  const normalizedRotation = Number.isFinite(rotation) ? ((Math.round(rotation / 90) * 90 % 360) + 360) % 360 : 0;
  for (const change of changes) {
    if (change.existing) {
      change.existing.type = itemType; change.existing.purchaseCost = change.cost;
    } else {
      const object = addObject(game, itemType, change.x, change.z, change.parent?.rotation ?? normalizedRotation, change.cost);
      if (change.parent) object.parentId = change.parent.id;
    }
  }
  if (itemType === 'door') game.doorGrantUsed = true;
  if (STRUCTURAL_TYPES.has(itemType)) floorEnclosedRooms(game);
  rebuildPaths(game);
  return outcome(true, changes.length === 1 ? `${item.name} placed.` : `${changes.length} ${item.name.toLowerCase()} segments placed.`);
}

function layFloors(game, cells, style, noOpAllowed = false) {
  if (!FLOOR_STYLES.has(style)) return outcome(false, 'Choose peach, wood, tile, kitchen, stone or checker flooring.');
  if (cells.some(({ x, z }) => !inside(x, z) || !owned(game, x, z))) return outcome(false, 'Lay floors on a tile inside your owned land.');
  const changes = cells.map(({ x, z }) => ({ x, z, existing: game.floors.find((floor) => floor.x === x && floor.z === z) })).filter((cell) => cell.existing?.style !== style);
  if (!changes.length) return outcome(noOpAllowed, 'These tiles already have that flooring.');
  const cost = changes.length * 12;
  if (game.cash < cost) return outcome(false, `You need $${cost} to lay ${changes.length === 1 ? 'this floor tile' : `${changes.length} floor tiles`}.`);
  spend(game, cost);
  for (const cell of changes) if (cell.existing) cell.existing.style = style; else game.floors.push({ x: cell.x, z: cell.z, style });
  return outcome(true, changes.length === 1 ? 'Floor laid.' : `${changes.length} floor tiles laid.`);
}

function blockers(game) {
  return new Set(game.objects.filter((object) => ITEMS[object.type].solid).map((object) => key(object.x, object.z)));
}

function nearestWalkable(game, position) {
  const blocked = blockers(game);
  for (let radius = 0; radius < 24; radius++) {
    for (let dx = -radius; dx <= radius; dx++) for (let dz = -radius; dz <= radius; dz++) {
      const x = tile(position.x) + dx, z = tile(position.z) + dz;
      if (inside(x, z) && !blocked.has(key(x, z))) return { x, z };
    }
  }
  return null;
}

function pathTo(game, start, target, allowTarget = false) {
  const origin = { x: tile(start.x), z: tile(start.z) };
  if (!inside(origin.x, origin.z) || !inside(target.x, target.z)) return null;
  const atOrigin = Math.abs(start.x - origin.x) + Math.abs(start.z - origin.z) < 0.000001;
  if (sameTile(origin, target)) return atOrigin ? [] : [origin];
  const blocked = blockers(game), goalKey = key(target.x, target.z), startKey = key(origin.x, origin.z);
  if (blocked.has(goalKey) && !allowTarget) return null;
  const queue = [origin], seen = new Set([startKey]), parent = new Map();
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const next = { x: current.x + dx, z: current.z + dz }, nextKey = key(next.x, next.z);
      if (!inside(next.x, next.z) || seen.has(nextKey) || (blocked.has(nextKey) && !(allowTarget && nextKey === goalKey))) continue;
      seen.add(nextKey); parent.set(nextKey, current);
      if (nextKey === goalKey) {
        const path = [next];
        let previous = current;
        while (key(previous.x, previous.z) !== startKey) { path.unshift(previous); previous = parent.get(key(previous.x, previous.z)); }
        if (!atOrigin) path.unshift(origin);
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

function adjacentPath(game, actor, target) {
  let best = null;
  for (const [dx, dz] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
    const path = pathTo(game, actor, { x: target.x + dx, z: target.z + dz });
    if (path && (!best || path.length < best.length)) best = path;
  }
  return best;
}

function move(actor, seconds, tilesPerSecond = 1.8) {
  let budget = seconds * tilesPerSecond;
  while (actor.path?.length && budget > 0) {
    const target = actor.path[0], distance = Math.hypot(target.x - actor.x, target.z - actor.z);
    if (distance <= budget + 0.000001) { actor.x = target.x; actor.z = target.z; actor.path.shift(); budget -= distance; }
    else { actor.x += (target.x - actor.x) / distance * budget; actor.z += (target.z - actor.z) / distance * budget; budget = 0; }
  }
  return !actor.path?.length;
}

function seats(game) {
  return game.objects.filter((object) => object.type === 'chair').flatMap((chair) => {
    const table = game.objects.find((object) => object.type === 'table' && Math.abs(object.x - chair.x) + Math.abs(object.z - chair.z) === 1);
    const hasFloor = game.floors.some((floor) => floor.x === chair.x && floor.z === chair.z) && game.floors.some((floor) => floor.x === table?.x && floor.z === table?.z);
    return table && hasFloor ? [{ chair, table }] : [];
  });
}

function availableMenu(game) {
  return game.menu.filter((entry) => {
    const recipe = recipeById(entry.recipeId);
    return entry.enabled && recipe.unlock <= game.stats.served && recipe.equipment.every((type) => game.objects.some((object) => capability(object, type)));
  });
}

function resetStaff(member) {
  member.task = 'idle'; member.path = []; member.timer = 0;
  for (const field of ['taskTarget', 'orderId', 'guestId', 'wareId', 'sinkId', 'blocked', 'blockedReason']) delete member[field];
}

function setWare(ware, state, links) {
  for (const field of ['storageId', 'orderId', 'guestId', 'locationId', 'dirtySince', 'assigneeId', 'staffId', 'sinkId', 'returnStorageId', 'breakageChecked']) delete ware[field];
  ware.state = state; Object.assign(ware, links);
}

function dirtyMeal(game, guest) {
  const ware = wareById(game, guest.wareId);
  if (ware) setWare(ware, 'dirty', { locationId: guest.tableId, dirtySince: game.elapsed });
  delete guest.wareId;
}

function leave(game, guest, reason) {
  if (guest.state === 'leaving') return;
  if (reason) { guest.failed = true; guest.happiness = Math.max(0, guest.happiness - 35); game.stats.lost++; event(game, `${guest.name} left: ${reason}.`); }
  guest.state = 'leaving'; guest.path = pathTo(game, guest, ENTRY) ?? []; guest.timer = 0;
  guest.exitBlocked = !sameTile(guest, ENTRY) && !guest.path.length;
  if (guest.orderId) {
    const order = game.orders.find((order) => order.id === guest.orderId), ware = order && wareById(game, order.wareId);
    if (ware) {
      if (ware.state === 'carriedMeal') {
        const holder = game.staff.find((member) => member.id === ware.staffId);
        setWare(ware, 'carriedDirty', { staffId: holder.id });
        delete holder.orderId; delete holder.guestId; holder.task = 'meal-dispose'; holder.taskTarget = order.sourceId; holder.timer = 0;
        replanStaff(game, holder);
      } else setWare(ware, 'dirty', { locationId: order.sourceId, dirtySince: game.elapsed });
    }
    game.orders = game.orders.filter((order) => order.id !== guest.orderId);
  }
  for (const member of game.staff) if ((guest.orderId && member.orderId === guest.orderId) || member.guestId === guest.id) resetStaff(member);
  delete guest.orderId;
}

function arrivals(game, seconds) {
  if (!game.open || game.bankrupt) return;
  game.arrivalIn -= seconds;
  if (game.arrivalIn > 0) return;
  game.arrivalIn += 8 + random(game) * 8;
  if (game.guests.length >= 24) return;
  const allSeats = seats(game).filter(({ table }) => !game.supplies.ware.some((ware) => ware.state === 'dirty' && ware.locationId === table.id));
  const occupied = new Set(game.guests.filter((guest) => guest.state !== 'leaving').map((guest) => guest.seatId));
  let selected;
  for (const seat of allSeats) {
    if (occupied.has(seat.chair.id)) continue;
    const path = pathTo(game, ENTRY, seat.chair, true);
    if (path) { selected = { ...seat, path }; break; }
  }
  if (!selected || !availableMenu(game).length) { game.stats.lost++; game.stats.rating = Math.max(1, game.stats.rating - 0.015); return; }
  const guest = {
    id: id(game, 'guest'), name: NAMES[Math.floor(random(game) * NAMES.length)], x: ENTRY.x, z: ENTRY.z,
    state: 'arriving', tableId: selected.table.id, seatId: selected.chair.id, path: selected.path,
    hunger: 70 + random(game) * 30, patience: 115 + random(game) * 35, happiness: 92,
    timer: 0, mealTime: 13 + random(game) * 9, toiletNeed: random(game) < 0.28, bill: 0,
  };
  game.guests.push(guest);
}

function updateGuests(game, seconds) {
  for (const guest of [...game.guests]) {
    guest.timer += seconds;
    if (guest.state === 'leaving') {
      if (guest.exitBlocked) {
        guest.path = pathTo(game, guest, ENTRY) ?? [];
        guest.exitBlocked = !sameTile(guest, ENTRY) && !guest.path.length;
      }
      if ((!guest.exitBlocked && move(guest, seconds)) || guest.timer > 90) {
        if (guest.bill > 0 && !guest.failed) {
          game.cash += guest.bill; game.stats.revenue += guest.bill; game.daily.revenue += guest.bill;
          game.stats.served++; game.daily.served++;
          const score = clamp(guest.happiness / 20, 1, 5);
          game.stats.rating = clamp(game.stats.rating * 0.9 + score * 0.1, 1, 5);
          if (game.stats.served % 5 === 0) event(game, `${game.stats.served} guests served. Thank you for a lovely meal!`);
        }
        game.guests.splice(game.guests.indexOf(guest), 1);
      }
      continue;
    }
    guest.hunger = Math.max(0, guest.hunger - seconds * 0.025);
    if (guest.state === 'arriving' && move(guest, seconds)) { guest.state = 'waiting'; guest.timer = 0; }
    if (['arriving', 'waiting', 'ordered'].includes(guest.state)) {
      guest.patience -= seconds;
      guest.happiness = clamp(guest.happiness - seconds * (game.stats.cleanliness < 45 ? 0.22 : 0.07), 0, 100);
      if (guest.patience <= 0) { leave(game, guest, 'the wait was too long'); continue; }
    }
    if (guest.state === 'eating' && guest.timer >= guest.mealTime) {
      dirtyMeal(game, guest);
      guest.happiness = clamp(guest.happiness + 7 + (guest.mealQuality - 1) * 15 + (game.stats.cleanliness - 75) * 0.12, 0, 100);
      if (guest.toiletNeed) {
        const candidates = game.objects.filter((object) => object.type === 'toilet');
        const toilet = candidates.map((object) => ({ object, path: adjacentPath(game, guest, object) })).find((entry) => entry.path);
        if (toilet) { guest.state = 'toilet'; guest.path = toilet.path; guest.timer = 0; guest.toiletReached = false; continue; }
        guest.happiness = Math.max(0, guest.happiness - 15);
      }
      leave(game, guest);
    } else if (guest.state === 'toilet') {
      if (!guest.toiletReached && move(guest, seconds)) { guest.toiletReached = true; guest.timer = 0; }
      else if (guest.toiletReached && guest.timer >= 4) leave(game, guest);
    }
  }
}

function taskTarget(game, member) {
  if (['taking-order', 'serving'].includes(member.task)) return game.guests.find((guest) => guest.id === member.guestId);
  if (member.task === 'pickup') return objectById(game, game.orders.find((order) => order.id === member.orderId)?.sourceId);
  return objectById(game, member.taskTarget);
}

function replanStaff(game, member) {
  if (member.task === 'idle') return;
  const target = taskTarget(game, member), path = target && adjacentPath(game, member, target);
  member.path = path ?? [];
  if (!path) { member.blocked = true; member.blockedReason = 'The current task target is inaccessible.'; }
  else { delete member.blocked; delete member.blockedReason; }
}

function releaseAssignment(game, member) {
  for (const order of game.orders) {
    if (order.staffId === member.id) delete order.staffId;
    if (order.waiterId === member.id) delete order.waiterId;
  }
  const ware = wareById(game, member.wareId);
  if (ware?.state === 'dirty' && ware.assigneeId === member.id) { delete ware.assigneeId; delete ware.returnStorageId; }
  resetStaff(member);
}

function assignJob(game, member) {
  const jobs = [];
  const offer = (group, age, data, target, reserve) => {
    if (member.priorities[group] === 'off') return;
    const path = adjacentPath(game, member, target);
    if (path) jobs.push({ group, age, data, path, reserve });
  };
  if (member.priorities.cooking !== 'off') for (const order of game.orders) {
    if (!['queued', 'cooking'].includes(order.state) || order.staffId) continue;
    const recipe = recipeById(order.recipeId);
    if (!recipe.equipment.every((type) => game.objects.some((object) => capability(object, type) && reachable(game, member, object)))) continue;
    if (order.state === 'queued' && order.funding === 'regular' && !materialPlan(game, recipe, member)) continue;
    if (order.funding === 'legacy-pending' && game.cash < order.legacyDebit) continue;
    for (const station of game.objects.filter((object) => order.sourceId ? object.id === order.sourceId : capability(object, recipe.primary))) {
      if (game.staff.some((other) => other.task === 'cooking' && other.taskTarget === station.id)) continue;
      offer('cooking', order.createdAt, { task: 'cooking', orderId: order.id, taskTarget: station.id }, station, () => { order.staffId = member.id; });
    }
  }
  if (member.priorities.serving !== 'off') {
    for (const order of game.orders.filter((order) => order.state === 'ready' && !order.waiterId)) {
      const source = objectById(game, order.sourceId), guest = game.guests.find((guest) => guest.id === order.guestId);
      if (!source || !guest || adjacentPath(game, source, guest) === null) continue;
      offer('serving', order.createdAt, { task: 'pickup', orderId: order.id, guestId: guest.id, wareId: order.wareId }, source, () => { order.waiterId = member.id; });
    }
    const waiting = game.guests.filter((guest) => guest.state === 'waiting' && !game.staff.some((other) => other.guestId === guest.id));
    if (waiting.length && availableMenu(game).some((entry) => recipeById(entry.recipeId).equipment.every((type) => game.objects.some((object) => capability(object, type) && reachable(game, ENTRY, object))))) for (const guest of waiting) {
      offer('serving', game.elapsed - guest.timer, { task: 'taking-order', guestId: guest.id }, guest);
    }
  }
  if (member.priorities.dishwashing !== 'off') for (const ware of game.supplies.ware.filter((ware) => ware.state === 'dirty' && !ware.assigneeId)) {
    const location = objectById(game, ware.locationId);
    for (const sink of game.objects.filter((object) => object.type === 'sink')) {
      if (!location || game.staff.some((other) => other.sinkId === sink.id) || !reachable(game, member, sink)) continue;
      const cabinet = game.objects.find((object) => object.type === 'counter' && freeStorage(game, object) > 0 && reachable(game, member, object));
      if (!cabinet) continue;
      offer('dishwashing', ware.dirtySince, { task: 'dish-collect', wareId: ware.id, taskTarget: location.id, sinkId: sink.id }, location, () => { ware.assigneeId = member.id; ware.returnStorageId = cabinet.id; });
      break;
    }
  }
  if (member.priorities.cleaning !== 'off' && game.cleaningDueSince !== null) {
    const target = game.objects.find((object) => ['bin', 'sink'].includes(object.type) && reachable(game, member, object));
    if (target) offer('cleaning', game.cleaningDueSince, { task: 'cleaning', taskTarget: target.id }, target);
  }
  const rank = { high: 3, normal: 2, low: 1, off: 0 };
  jobs.sort((a, b) => rank[member.priorities[b.group]] - rank[member.priorities[a.group]] || a.age - b.age || TASK_GROUPS.indexOf(a.group) - TASK_GROUPS.indexOf(b.group));
  const job = jobs[0];
  if (job) { Object.assign(member, job.data, { path: job.path, timer: 0 }); job.reserve?.(); }
}

function updateStaff(game, seconds) {
  for (const member of game.staff) {
    member.energy = clamp(member.energy + seconds * (member.task === 'idle' ? 0.08 : -0.018), 15, 100);
    if (member.task === 'idle') assignJob(game, member);
    if (member.task === 'idle') continue;
    if (member.blocked) { replanStaff(game, member); if (member.blocked) continue; }
    const beforeX = member.x, beforeZ = member.z;
    const arrived = move(member, seconds, 1.8 * (0.7 + member.energy / 333) * (0.75 + 0.5 * member.skills.speed));
    let ware = wareById(game, member.wareId);
    if (member.task === 'dish-to-sink' && ware && !ware.breakageChecked && (beforeX !== member.x || beforeZ !== member.z)) {
      ware.breakageChecked = true;
      if (random(game) < 0.04 * member.skills.clumsiness) {
        game.supplies.wareLedger[ware.type].broken++; game.supplies.ware = game.supplies.ware.filter((entry) => entry.id !== ware.id);
        event(game, `${member.name} accidentally broke a dish.`); resetStaff(member); continue;
      }
    }
    if (!arrived) continue;
    member.timer += seconds;
    if (member.task === 'taking-order' && member.timer >= 1.5) {
      const guest = game.guests.find((guest) => guest.id === member.guestId && guest.state === 'waiting');
      const choices = availableMenu(game).filter((entry) => recipeById(entry.recipeId).equipment.every((type) => game.objects.some((object) => capability(object, type) && reachable(game, ENTRY, object))));
      if (guest && choices.length) {
        const entry = choices[Math.floor(random(game) * choices.length)], recipe = recipeById(entry.recipeId);
        if (entry.price > recipe.price * 1.8) { guest.happiness = Math.max(0, guest.happiness - 25); if (random(game) < 0.5) { leave(game, guest, 'the menu was too expensive'); resetStaff(member); continue; } }
        const order = { id: id(game, 'order'), guestId: guest.id, recipeId: recipe.id, price: entry.price, state: 'queued', progress: 0, createdAt: game.elapsed, ingredientsCommitted: false, funding: 'regular' };
        game.orders.push(order); guest.orderId = order.id; guest.state = 'ordered'; guest.timer = 0;
      }
      resetStaff(member);
    } else if (member.task === 'cooking') {
      const order = game.orders.find((order) => order.id === member.orderId), recipe = order && recipeById(order.recipeId);
      if (!order) { resetStaff(member); continue; }
      if (order.state === 'queued') {
        if (order.funding === 'legacy-pending') {
          if (game.cash < order.legacyDebit) { releaseAssignment(game, member); continue; }
          spend(game, order.legacyDebit); delete order.legacyDebit; order.funding = 'legacy-paid';
          ware = grantWare(game, recipe.tableware, 'order', { orderId: order.id });
        } else {
          const plan = materialPlan(game, recipe, member);
          if (!plan) { releaseAssignment(game, member); continue; }
          for (const allocation of plan.allocations) allocation.stock.quantity -= allocation.quantity;
          game.supplies.stocks = game.supplies.stocks.filter((stock) => stock.quantity > 0);
          ware = plan.ware; setWare(ware, 'order', { orderId: order.id });
        }
        order.wareId = ware.id; order.ingredientsCommitted = true; order.state = 'cooking'; order.sourceId = member.taskTarget;
      }
      order.progress += seconds;
      if (order.progress >= recipe.cookTime) { order.state = 'ready'; order.quality = 0.6 + 0.4 * member.skills.cooking; delete order.staffId; resetStaff(member); }
    } else if (member.task === 'pickup') {
      const order = game.orders.find((order) => order.id === member.orderId), guest = game.guests.find((guest) => guest.id === member.guestId);
      if (!order || !guest) { releaseAssignment(game, member); continue; }
      ware = wareById(game, order.wareId); setWare(ware, 'carriedMeal', { staffId: member.id, orderId: order.id });
      member.task = 'serving'; member.timer = 0; replanStaff(game, member);
    } else if (member.task === 'serving' && member.timer >= 0.75) {
      const order = game.orders.find((order) => order.id === member.orderId), guest = game.guests.find((guest) => guest.id === member.guestId);
      if (order && guest) {
        guest.state = 'eating'; guest.timer = 0; guest.bill = order.price; guest.mealQuality = order.quality; guest.mealRecipeId = order.recipeId; guest.wareId = ware.id; guest.happiness = Math.min(100, guest.happiness + 3);
        setWare(ware, 'guest', { guestId: guest.id }); game.orders = game.orders.filter((entry) => entry.id !== order.id); delete guest.orderId;
      }
      resetStaff(member);
    } else if (member.task === 'dish-collect') {
      const returnStorageId = ware.returnStorageId;
      setWare(ware, 'carriedDirty', { staffId: member.id, returnStorageId, breakageChecked: false });
      member.task = 'dish-to-sink'; member.taskTarget = member.sinkId; member.timer = 0; replanStaff(game, member);
    } else if (member.task === 'dish-to-sink') {
      setWare(ware, 'washing', { staffId: member.id, sinkId: member.taskTarget, returnStorageId: ware.returnStorageId });
      member.task = 'dish-wash'; member.timer = 0;
    } else if (member.task === 'dish-wash' && member.timer >= 4) {
      setWare(ware, 'carriedClean', { staffId: member.id, returnStorageId: ware.returnStorageId });
      member.task = 'dish-return'; member.taskTarget = ware.returnStorageId; member.timer = 0; replanStaff(game, member);
    } else if (member.task === 'dish-return') {
      setWare(ware, 'clean', { storageId: ware.returnStorageId }); resetStaff(member);
    } else if (member.task === 'meal-dispose') {
      setWare(ware, 'dirty', { locationId: member.taskTarget, dirtySince: game.elapsed }); resetStaff(member);
    } else if (member.task === 'cleaning') {
      game.stats.cleanliness = Math.min(100, game.stats.cleanliness + seconds * 1.8);
      if (member.timer >= 8 || game.stats.cleanliness >= 99.9) { game.cleaningDueSince = null; resetStaff(member); }
    }
  }
}
function goalValues(game) {
  return { ...game.stats, menuVariety: availableMenu(game).length, seats: seats(game).length, staff: game.staff.length, plants: game.objects.filter((object) => ['plant', 'flowerbox'].includes(object.type)).length };
}

function updateGoals(game) {
  for (const recipe of RECIPES) if (recipe.unlock > 0 && game.stats.served >= recipe.unlock && !game.unlocks.includes(recipe.id)) {
    game.unlocks.push(recipe.id); event(game, `New recipe unlocked: ${recipe.name}. Add it to your menu!`);
  }
  if (game.scenario.complete || !game.scenario.goals.length) return;
  const values = goalValues(game);
  if (game.scenario.goals.every((goal) => values[goal.stat] >= goal.target)) {
    game.scenario.complete = true;
    if (!game.completedScenarios.includes(game.scenario.id)) {
      game.completedScenarios.push(game.scenario.id); game.cash += 500; event(game, `${game.scenario.title} complete! $500 awarded.`);
    }
  }
}

function step(game, seconds) {
  game.elapsed += seconds;
  const previousDay = game.day;
  let remaining = seconds, payrollPaid = 0;
  while (remaining > 1e-9) {
    const nextMonth = (Math.floor(game.calendarSeconds / MONTH_SECONDS) + 1) * MONTH_SECONDS;
    const portion = Math.min(remaining, nextMonth - game.calendarSeconds);
    for (const member of game.staff) member.wageAccrued += member.monthlyWage * portion / MONTH_SECONDS;
    game.calendarSeconds += portion; remaining -= portion;
    if (Math.abs(game.calendarSeconds - nextMonth) < 1e-8) {
      const paid = game.staff.reduce((sum, member) => sum + member.wageAccrued, 0);
      if (paid > 0) { spend(game, paid); payrollPaid += paid; }
      for (const member of game.staff) member.wageAccrued = 0;
      event(game, `Monthly wages paid: $${paid.toFixed(2)}.`);
    }
  }
  game.day = Math.floor(game.calendarSeconds / DAY_SECONDS) + 1;
  game.time = Math.max(0, (game.calendarSeconds - (game.day - 1) * DAY_SECONDS) / DAY_SECONDS * 24);
  if (game.day !== previousDay) game.daily = { served: 0, revenue: 0, expenses: payrollPaid };
  const activeGuests = game.guests.filter((guest) => guest.state !== 'leaving').length;
  const dirtyDishes = game.supplies.ware.filter((ware) => ['dirty', 'carriedDirty', 'washing'].includes(ware.state)).length;
  game.stats.cleanliness = clamp(game.stats.cleanliness - seconds * (0.012 + activeGuests * 0.012 + dirtyDishes * 0.04), 0, 100);
  if (game.stats.cleanliness < 90 && game.cleaningDueSince === null) game.cleaningDueSince = game.elapsed;
  updateDeliveries(game); updateGuests(game, seconds); updateStaff(game, seconds); arrivals(game, seconds); updateGoals(game); updateBankruptcy(game);
}

function updateBankruptcy(game) {
  if (game.cash <= -500 && !game.bankrupt) { game.bankrupt = true; game.open = false; event(game, 'Cash reserves are exhausted. Sell furniture or reduce wages to recover.'); }
  if (game.bankrupt && game.cash > 0) { game.bankrupt = false; event(game, 'Your finances have recovered. You can reopen the restaurant.'); }
}

export function tick(game, dtSeconds) {
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0 || game.speed === 0) return;
  game.accumulator += Math.min(dtSeconds, 60) * game.speed;
  while (game.accumulator + 1e-9 >= STEP) { step(game, STEP); game.accumulator = Math.max(0, game.accumulator - STEP); }
}

function rebuildPaths(game) {
  accessCache.delete(game);
  for (const guest of game.guests) {
    if (guest.state === 'arriving') {
      const chair = objectById(game, guest.seatId), path = chair && pathTo(game, guest, chair, true);
      if (path) guest.path = path; else leave(game, guest, 'their seat became inaccessible');
    } else if (guest.state === 'leaving') { guest.path = pathTo(game, guest, ENTRY) ?? []; guest.exitBlocked = !sameTile(guest, ENTRY) && !guest.path.length; }
    else if (guest.state === 'toilet' && !guest.toiletReached) {
      const path = game.objects.filter((object) => object.type === 'toilet').map((object) => adjacentPath(game, guest, object)).find(Boolean);
      if (path) guest.path = path; else leave(game, guest);
    }
  }
  for (const member of game.staff) {
    if (blockers(game).has(key(tile(member.x), tile(member.z)))) {
      const position = nearestWalkable(game, member);
      if (position) Object.assign(member, position);
    }
    replanStaff(game, member);
  }
}

export function dispatch(game, action) {
  if (!action || typeof action.type !== 'string') return outcome(false, 'Choose a valid restaurant action.');
  switch (action.type) {
    case 'PLACE': {
      return placeObjects(game, action.itemType, [{ x: action.x, z: action.z }], action.rotation);
    }
    case 'STROKE': {
      if (!['wall', 'window'].includes(action.itemType)) return outcome(false, 'Choose wall or window for a construction stroke.');
      const cells = strokeCells(action.cells);
      if (!cells) return outcome(false, 'A stroke needs 1 to 24 unique, contiguous tiles in one straight row or column.');
      const alongX = cells.length === 1 || cells[0].z === cells[1].z;
      const rotation = action.rotation === undefined ? (alongX ? 0 : 90) : action.rotation;
      if (!Number.isFinite(rotation) || cells.length > 1 && ((Math.round(rotation / 90) * 90 % 180) + 180) % 180 !== (alongX ? 0 : 90)) return outcome(false, 'Align the wall stroke rotation with its row (0°) or column (90°).');
      return placeObjects(game, action.itemType, cells, rotation);
    }
    case 'REMOVE': {
      const object = objectById(game, action.id);
      if (!object) return outcome(false, 'Choose an existing piece of furniture to sell.');
      if (game.guests.some((guest) => guest.state !== 'leaving' && (guest.tableId === object.id || guest.seatId === object.id))) return outcome(false, 'Wait until the guest has finished before selling their table or chair.');
      if (object.type === 'toilet' && game.guests.some((guest) => guest.state === 'toilet' && guest.toiletReached && Math.abs(guest.x - object.x) + Math.abs(guest.z - object.z) <= 1.00001)) return outcome(false, 'Wait until the guest has finished using this toilet before selling it.');
      if (game.staff.some((member) => member.taskTarget === object.id && member.task === 'cooking') || game.orders.some((order) => order.sourceId === object.id)) return outcome(false, 'Wait for meals at this station to be served before selling it.');
      if (game.objects.some((child) => child.parentId === object.id)) return outcome(false, 'Remove the countertop appliance before selling this cabinet.');
      if (usedStorage(game, object.id) || reservedStorage(game, object.id) || game.supplies.ware.some((ware) => ware.locationId === object.id || ware.sinkId === object.id) || game.staff.some((member) => member.taskTarget === object.id || member.sinkId === object.id)) return outcome(false, 'Empty this storage or finish its active tasks before selling it.');
      const storageKind = ITEMS[object.type].storageKind;
      if (['shelf', 'fridge'].includes(storageKind) && Object.entries(game.supplies.ingredientBatches).some(([id, quantity]) => INGREDIENTS[id].storageKind === storageKind && quantity > capacity(game, storageKind) - ITEMS[object.type].capacity)) return outcome(false, 'Reduce ingredient batch quantities before selling this storage.');
      game.objects = game.objects.filter((entry) => entry.id !== object.id);
      const refund = Math.round((object.purchaseCost ?? ITEMS[object.type].cost) * 0.6); game.cash += refund; rebuildPaths(game);
      return outcome(true, `${ITEMS[object.type].name} sold for $${refund}.`);
    }
    case 'FLOOR': {
      return layFloors(game, [{ x: action.x, z: action.z }], action.style);
    }
    case 'FLOOR_STROKE': {
      const cells = strokeCells(action.cells);
      if (!cells) return outcome(false, 'A floor stroke needs 1 to 24 unique, contiguous tiles in one straight row or column.');
      return layFloors(game, cells, action.style, true);
    }
    case 'HIRE': {
      const selected = game.candidates.find((candidate) => candidate.id === action.candidateId);
      if (!selected) return outcome(false, 'Choose an available employee candidate.');
      if (game.staff.length >= 20) return outcome(false, 'Your restaurant already has the maximum of 20 employees.');
      if (!inside(action.x, action.z) || !owned(game, action.x, action.z) || !game.floors.some((floor) => floor.x === action.x && floor.z === action.z) || blockers(game).has(key(action.x, action.z))) return outcome(false, 'Place the employee on a clear floor tile inside your land.');
      const member = { ...structuredClone(selected), id: id(game, 'staff'), role: 'employee', wageAccrued: 0, priorities: Object.fromEntries(TASK_GROUPS.map((group) => [group, 'normal'])), energy: 100, x: action.x, z: action.z, task: 'idle', path: [], timer: 0 };
      game.staff.push(member); game.candidates = game.candidates.filter((candidate) => candidate.id !== selected.id); game.candidates.push(candidate(game));
      event(game, `${member.name} joined the team.`);
      return outcome(true, `${member.name} hired.`);
    }
    case 'FIRE': {
      const member = game.staff.find((entry) => entry.id === action.id);
      if (!member) return outcome(false, 'Choose an existing employee to dismiss.');
      const ware = wareById(game, member.wareId);
      if (ware && ['carriedMeal', 'carriedDirty', 'carriedClean', 'washing'].includes(ware.state)) return outcome(false, 'Wait until this employee puts down the dish before dismissing them.');
      releaseAssignment(game, member); spend(game, member.wageAccrued);
      game.staff = game.staff.filter((entry) => entry.id !== action.id);
      event(game, `${member.name} has left the team.`); updateBankruptcy(game); return outcome(true, `${member.name} dismissed.`);
    }
    case 'PRIORITY': {
      const member = game.staff.find((entry) => entry.id === action.id);
      if (!member || !TASK_GROUPS.includes(action.taskGroup) || action.priority !== undefined && !PRIORITIES.includes(action.priority)) return outcome(false, 'Choose an employee, task group and normal, high, off or low priority.');
      const next = action.priority ?? PRIORITIES[(PRIORITIES.indexOf(member.priorities[action.taskGroup]) + 1) % 4];
      member.priorities[action.taskGroup] = next; return outcome(true, `${member.name}: ${action.taskGroup} priority ${next}.`);
    }
    case 'INGREDIENT_BATCH': {
      if (!Object.hasOwn(INGREDIENTS, action.ingredientId) || !Number.isInteger(action.quantity) || action.quantity < 0 || action.quantity > capacity(game, INGREDIENTS[action.ingredientId]?.storageKind)) return outcome(false, 'Set an ingredient batch between zero and matching storage capacity.');
      game.supplies.ingredientBatches[action.ingredientId] = action.quantity; return outcome(true, 'Recurring ingredient batch updated.');
    }
    case 'TABLEWARE_ORDER': {
      if (!Object.hasOwn(TABLEWARE, action.tablewareId) || ![1, -1].includes(action.delta)) return outcome(false, 'Choose a tableware type and add or cancel one queued unit.');
      if (action.delta === -1) {
        const queue = [...game.supplies.tablewareQueue].reverse().find((queue) => queue.tablewareId === action.tablewareId);
        if (!queue) return outcome(false, 'There is no undelivered unit of this tableware to cancel.');
        queue.quantity--; game.supplies.tablewareQueue = game.supplies.tablewareQueue.filter((queue) => queue.quantity > 0);
        spend(game, -15); if (!game.supplies.tablewareQueue.length) game.supplies.tablewareNextAt = null;
        return outcome(true, 'Queued dish cancelled; $15 refunded.');
      }
      if (game.cash < 15) return outcome(false, 'You need $15 to order this dish.');
      const cabinet = game.objects.find((object) => object.type === 'counter' && freeStorage(game, object) > 0 && reachable(game, ENTRY, object));
      if (!cabinet) return outcome(false, 'Provide an accessible cabinet with a free tableware slot.');
      spend(game, 15);
      const existing = game.supplies.tablewareQueue.find((queue) => queue.storageId === cabinet.id && queue.tablewareId === action.tablewareId);
      if (existing) existing.quantity++; else game.supplies.tablewareQueue.push({ tablewareId: action.tablewareId, storageId: cabinet.id, quantity: 1 });
      game.supplies.tablewareNextAt ??= game.elapsed + 75; return outcome(true, 'Dish paid and queued for delivery.');
    }
    case 'PRICE': {
      const entry = game.menu.find((menuEntry) => menuEntry.recipeId === action.recipeId);
      if (!entry || !Number.isFinite(action.price) || action.price < 1 || action.price > 150) return outcome(false, 'Set the price of an existing recipe between $1 and $150.');
      entry.price = Math.round(action.price * 100) / 100; return outcome(true, 'Menu price updated.');
    }
    case 'TOGGLE_RECIPE': {
      const entry = game.menu.find((menuEntry) => menuEntry.recipeId === action.recipeId), recipe = recipeById(action.recipeId);
      if (!entry) return outcome(false, 'Choose an existing recipe.');
      if (!entry.enabled) {
        if (game.stats.served < recipe.unlock) return outcome(false, `Serve ${recipe.unlock} guests to unlock ${recipe.name}.`);
        const status = getRecipeStatus(game).find((status) => status.recipeId === recipe.id);
        if (!status.canEnable) return outcome(false, status.missing[0]?.reason ?? 'This recipe is not ready to add.');
      }
      entry.enabled = !entry.enabled; return outcome(true, `${recipe.name} ${entry.enabled ? 'added to' : 'removed from'} the menu.`);
    }
    case 'SPEED':
      if (![0, 1, 2, 3].includes(action.speed)) return outcome(false, 'Choose pause, normal, double or triple speed.');
      game.speed = action.speed; return outcome(true, action.speed === 0 ? 'Game paused.' : `Speed set to ${action.speed}×.`);
    case 'TOGGLE_OPEN':
      if (!game.open && game.bankrupt) return outcome(false, 'Recover a positive cash balance before reopening.');
      game.open = !game.open; event(game, game.open ? 'The restaurant is open. Welcome in!' : 'The restaurant is closed. Current guests will finish their meals.'); return outcome(true, game.open ? 'Restaurant opened.' : 'Restaurant closed.');
    case 'EXPAND': {
      if (game.land.minX === 0 && game.land.minZ === 0 && game.land.maxX === 23 && game.land.maxZ === 23) return outcome(false, 'You already own all available land.');
      const cost = 1200;
      if (game.cash < cost) return outcome(false, `You need $${cost} to expand your land.`);
      spend(game, cost); game.land.minX = Math.max(0, game.land.minX - 2); game.land.minZ = Math.max(0, game.land.minZ - 2); game.land.maxX = Math.min(23, game.land.maxX + 2); game.land.maxZ = Math.min(23, game.land.maxZ + 2);
      event(game, 'Land expanded. There is room for something wonderful.'); return outcome(true, 'Land expanded by two tiles on every side.');
    }
    case 'RENAME':
      if (typeof action.name !== 'string' || !action.name.trim() || action.name.trim().length > 40) return outcome(false, 'Use a restaurant name between 1 and 40 characters.');
      game.name = action.name.trim(); return outcome(true, 'Restaurant renamed.');
    case 'SCENARIO': {
      const scenario = SCENARIOS.find((entry) => entry.id === action.id);
      if (!scenario) return outcome(false, 'Choose an available scenario.');
      game.scenario = { ...structuredClone(scenario), complete: false }; updateGoals(game); return outcome(true, `${scenario.title} selected.`);
    }
    default: return outcome(false, `Unknown restaurant action: ${action.type}.`);
  }
}

export function getStats(game) {
  const seatCount = seats(game).length, recipes = availableMenu(game), warnings = [];
  const recipeStatus = getRecipeStatus(game);
  const readiness = buildingReadiness(game);
  if (!readiness.hasRoom) warnings.push('Close a wall boundary to create a room and its default flooring.');
  else if (!readiness.hasEntrance) warnings.push('Add a reachable door between the enclosed room and outside.');
  if (!seatCount) warnings.push('Add a table and an adjacent chair on flooring to seat guests.');
  if (!game.staff.some((member) => member.priorities.cooking !== 'off')) warnings.push('Enable cooking for an employee to prepare meals.');
  if (!game.staff.some((member) => member.priorities.serving !== 'off')) warnings.push('Enable serving for an employee to take orders and deliver meals.');
  if (!recipes.length) warnings.push('Enable a recipe and provide its required kitchen equipment.');
  if (!game.objects.some((object) => object.type === 'toilet')) warnings.push('Guests would appreciate a toilet.');
  if (game.stats.cleanliness < 60) warnings.push('The restaurant needs cleaning. Hire a cleaner and provide a sink or bin.');
  if (seatCount && !seats(game).some(({ chair }) => pathTo(game, ENTRY, chair, true))) warnings.push('Your dining room is unreachable. Add a clear entrance.');
  if (game.cash < 250) warnings.push('Cash is running low. Review menu prices and staffing costs.');
  if (recipeStatus.some((status) => status.enabled && status.canOrder && !status.canPrepare)) warnings.push('An enabled dish needs ingredients or clean tableware before cooking can start.');
  if (game.staff.some((member) => member.blocked)) warnings.push('An employee task is blocked. Clear access to the highlighted station.');
  const values = goalValues(game);
  return { ...game.stats, cash: game.cash, day: game.day, time: game.time, guests: game.guests.length, seats: seatCount,
    tables: game.objects.filter((object) => object.type === 'table').length, staff: game.staff.length, orders: game.orders.length,
    profit: game.stats.revenue - game.stats.expenses, occupancy: seatCount ? game.guests.filter((guest) => guest.state !== 'leaving').length / seatCount : 0,
    availableRecipes: recipeStatus.filter((status) => status.canOrder).map((status) => status.recipeId), cookableRecipes: recipeStatus.filter((status) => status.enabled && status.canPrepare).map((status) => status.recipeId), warnings, bankrupt: game.bankrupt,
    hourlyWages: game.staff.reduce((total, member) => total + member.monthlyWage / 22.5, 0), monthlyWages: game.staff.reduce((total, member) => total + member.monthlyWage, 0), wagesAccrued: game.staff.reduce((total, member) => total + member.wageAccrued, 0), wagePeriodDays: 30, candidates: game.candidates, calendar: calendarInfo(game), ...readiness,
    scenarioProgress: game.scenario.goals.map((goal) => ({ ...goal, value: values[goal.stat] ?? 0, complete: (values[goal.stat] ?? 0) >= goal.target })),
  };
}

export function serialize(game) { return JSON.stringify(game); }

function calendarInfo(game) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayOfMonth = (game.day - 1) % 30 + 1, month = Math.floor((game.day - 1) / 30) % 12 + 1, year = Math.floor((game.day - 1) / 360) + 1;
  return { dayOfMonth, month, year, label: `${dayOfMonth} ${months[month - 1]}` };
}

function validateV1Save(game) {
  const ITEMS = V1_ITEMS, RECIPES = V1_RECIPES;
  const recipeById = (id) => RECIPES.find((recipe) => recipe.id === id);
  const fail = (message) => { throw new Error(`Cannot load restaurant: ${message}.`); };
  const finite = (value, low = -Infinity, high = Infinity) => typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
  const actorPosition = (actor) => finite(actor.x, 0, 23) && finite(actor.z, 0, 23);
  if (!game || typeof game !== 'object' || game.version !== 1) fail('the save version must be 1');
  if (typeof game.name !== 'string' || !game.name.trim() || game.name.length > 40 || typeof game.mode !== 'string') fail('the restaurant name or mode is invalid');
  for (const field of ['cash', 'elapsed', 'accumulator', 'arrivalIn']) if (!finite(game[field])) fail(`${field} must be a finite number`);
  if (game.elapsed < 0 || game.accumulator < 0 || game.accumulator >= STEP || game.arrivalIn < 0 || game.arrivalIn > 60) fail('simulation timers are outside their valid range');
  if (!Number.isInteger(game.day) || game.day < 1 || !finite(game.time, 0, 24) || game.time === 24 || ![0, 1, 2, 3].includes(game.speed) || typeof game.open !== 'boolean' || typeof game.bankrupt !== 'boolean') fail('the game clock or opening state is invalid');
  if (!Number.isInteger(game.nextId) || game.nextId < 1 || !Number.isInteger(game.seed) || !finite(game.seed, 0, 4294967295)) fail('the random seed or ID sequence is invalid');
  if (!game.land || !inside(game.land.minX, game.land.minZ) || !inside(game.land.maxX, game.land.maxZ) || game.land.minX > game.land.maxX || game.land.minZ > game.land.maxZ) fail('owned land is outside the world');
  for (const field of ['floors', 'objects', 'staff', 'guests', 'orders', 'menu', 'events', 'unlocks', 'completedScenarios']) if (!Array.isArray(game[field])) fail(`${field} must be a list`);
  if (game.objects.length > 576 || game.floors.length > 576 || game.staff.length > 20 || game.guests.length > 24 || game.orders.length > 24 || game.events.length > 24) fail('the save contains too many actors or tiles');
  const ids = new Set();
  for (const entry of [...game.objects, ...game.staff, ...game.guests, ...game.orders, ...game.events]) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)) fail('actor IDs must be unique strings');
    ids.add(entry.id);
    const suffix = Number(entry.id.slice(entry.id.lastIndexOf('-') + 1));
    if (!Number.isInteger(suffix) || suffix < 1 || suffix >= game.nextId) fail('the ID sequence would overwrite an existing actor');
  }
  const occupied = new Set(), floorTiles = new Set();
  for (const object of game.objects) {
    if (!Object.hasOwn(ITEMS, object.type) || !inside(object.x, object.z) || !owned(game, object.x, object.z) || ![0, 90, 180, 270].includes(object.rotation) || occupied.has(key(object.x, object.z))) fail('furniture type, placement or rotation is invalid');
    if (object.purchaseCost !== undefined && (!finite(object.purchaseCost, 0, ITEMS[object.type].cost) || object.purchaseCost !== ITEMS[object.type].cost && !(object.type === 'door' && object.purchaseCost === 0))) fail('a furniture purchase cost is not a supported paid or free price');
    occupied.add(key(object.x, object.z));
  }
  const existingDoor = game.objects.some((object) => object.type === 'door');
  if (game.doorGrantUsed === undefined) game.doorGrantUsed = existingDoor;
  if (typeof game.doorGrantUsed !== 'boolean' || existingDoor && !game.doorGrantUsed) fail('the first-door grant must record whether a door has been placed');
  for (const floor of game.floors) {
    if (!inside(floor.x, floor.z) || !owned(game, floor.x, floor.z) || !FLOOR_STYLES.has(floor.style) || floorTiles.has(key(floor.x, floor.z))) fail('floor placement or style is invalid');
    floorTiles.add(key(floor.x, floor.z));
  }
  const solidTiles = new Map(game.objects.filter((object) => ITEMS[object.type].solid).map((object) => [key(object.x, object.z), object]));
  const guestIds = new Set(game.guests.map((guest) => guest.id));
  const at = (position, target) => target && Math.abs(position.x - target.x) + Math.abs(position.z - target.z) < 0.00001;
  const destination = (actor) => actor.path.at(-1) ?? actor;
  const destinationAdjacent = (actor, target) => target && Math.abs(destination(actor).x - target.x) + Math.abs(destination(actor).z - target.z) <= 1.00001;
  for (const actor of [...game.staff, ...game.guests]) {
    if (!actorPosition(actor) || !Array.isArray(actor.path) || actor.path.length > 576 || actor.path.some((point) => !inside(point.x, point.z)) || !finite(actor.timer, 0)) fail('an actor position, path or timer is invalid');
    if (!Number.isInteger(actor.x) && !Number.isInteger(actor.z)) fail('an actor position must follow a grid edge');
    const isGuest = guestIds.has(actor.id), ownChair = isGuest && objectById(game, actor.seatId);
    const occupiedTile = solidTiles.get(key(tile(actor.x), tile(actor.z)));
    if (occupiedTile && occupiedTile.id !== ownChair?.id) fail('an actor position overlaps solid furniture outside their reserved seat');
    let previous = actor;
    for (const [index, point] of actor.path.entries()) {
      if (Math.abs(point.x - previous.x) + Math.abs(point.z - previous.z) > 1.00001) fail('an actor path skips intervening tiles');
      const blocked = solidTiles.get(key(point.x, point.z));
      const chairEndpoint = isGuest && blocked?.id === ownChair?.id && actor.state === 'arriving' && index === actor.path.length - 1;
      const chairOrigin = isGuest && blocked?.id === ownChair?.id && index === 0 && sameTile(actor, point);
      if (blocked && !chairEndpoint && !chairOrigin) fail('an actor path crosses solid furniture');
      previous = point;
    }
  }
  for (const member of game.staff) if (!ROLES.includes(member.role) || typeof member.name !== 'string' || !finite(member.wage, 0, 1000) || !finite(member.skill, 0.1, 10) || !finite(member.energy, 0, 100) || !['idle', 'taking-order', 'cooking', 'pickup', 'serving', 'cleaning'].includes(member.task)) fail('a staff member has an invalid role, task or attributes');
  const reserved = new Set();
  for (const guest of game.guests) {
    if (!GUEST_STATES.includes(guest.state) || typeof guest.name !== 'string' || !finite(guest.hunger, 0, 100) || !finite(guest.patience) || !finite(guest.happiness, 0, 100) || !finite(guest.bill, 0, 150) || !finite(guest.mealTime, 0, 1000) || typeof guest.toiletNeed !== 'boolean') fail('a guest has invalid needs or state');
    if (guest.state !== 'leaving') {
      const table = objectById(game, guest.tableId), chair = objectById(game, guest.seatId);
      if (table?.type !== 'table' || chair?.type !== 'chair' || reserved.has(guest.seatId) || Math.abs(table.x - chair.x) + Math.abs(table.z - chair.z) !== 1 || !floorTiles.has(key(table.x, table.z)) || !floorTiles.has(key(chair.x, chair.z))) fail('a guest has a missing or duplicate reserved seat');
      reserved.add(guest.seatId);
      if (['waiting', 'ordered', 'eating'].includes(guest.state) && (!at(guest, chair) || guest.path.length)) fail('a seated guest must remain at their reserved chair');
      if (guest.state === 'arriving' && !at(destination(guest), chair)) fail('an arriving guest path must end at their reserved chair');
    }
    if (guest.state === 'ordered') {
      if (!game.orders.some((order) => order.id === guest.orderId && order.guestId === guest.id)) fail('an ordered guest is missing their meal order');
    } else if (guest.orderId !== undefined) fail('a guest order link does not match their dining state');
    if (['arriving', 'waiting', 'ordered'].includes(guest.state) && guest.bill !== 0 || ['eating', 'toilet'].includes(guest.state) && guest.bill <= 0) fail('a guest bill does not match their dining state');
    if (guest.state === 'toilet' && (typeof guest.toiletReached !== 'boolean' || !game.objects.some((object) => object.type === 'toilet' && destinationAdjacent(guest, object)))) fail('a guest toilet path or facility is missing');
    if (guest.state === 'leaving' && (typeof guest.exitBlocked !== 'boolean' || !guest.exitBlocked && !at(destination(guest), ENTRY))) fail('a departing guest must have an exit path or a blocked exit');
  }
  for (const order of game.orders) {
    const recipe = recipeById(order.recipeId), source = objectById(game, order.sourceId);
    if (!recipe || !game.guests.some((guest) => guest.id === order.guestId && guest.orderId === order.id && guest.state === 'ordered') || !['queued', 'cooking', 'ready'].includes(order.state) || !finite(order.price, 1, 150) || !finite(order.progress, 0, 10000)) fail('an order has an invalid recipe, guest or progress');
    if (order.state !== 'queued' && source?.type !== (recipe.equipment.includes('stove') ? 'stove' : 'prep')) fail('a cooking or ready order requires its recipe-compatible cooking station');
    if (order.state === 'queued' && (order.sourceId !== undefined || order.progress !== 0) || order.state === 'cooking' && order.progress >= recipe.cookTime || order.state === 'ready' && order.progress < recipe.cookTime) fail('an order cooking progress does not match its state');
    if (order.staffId !== undefined && (order.state === 'ready' || !game.staff.some((member) => member.id === order.staffId && member.orderId === order.id && member.task === 'cooking' && member.role === 'chef'))) fail('an order chef link is invalid');
    if (order.waiterId !== undefined && (order.state !== 'ready' || !game.staff.some((member) => member.id === order.waiterId && member.orderId === order.id && ['pickup', 'serving'].includes(member.task) && member.role === 'waiter'))) fail('an order waiter link is invalid');
  }
  const assignedGuests = new Set();
  for (const member of game.staff) {
    const order = game.orders.find((entry) => entry.id === member.orderId), guest = game.guests.find((entry) => entry.id === member.guestId), target = objectById(game, member.taskTarget);
    if (member.task === 'idle' && (member.path.length || ['orderId', 'guestId', 'taskTarget'].some((field) => member[field] !== undefined))) fail('idle staff cannot retain an active assignment');
    if (member.task === 'taking-order' && (member.role !== 'waiter' || guest?.state !== 'waiting' || member.orderId !== undefined || member.taskTarget !== undefined || !destinationAdjacent(member, guest))) fail('a waiter taking an order requires a reachable waiting guest');
    if (member.task === 'cooking') {
      const recipe = order && recipeById(order.recipeId);
      if (member.role !== 'chef' || !order || !['queued', 'cooking'].includes(order.state) || order.staffId !== member.id || target?.type !== (recipe?.equipment.includes('stove') ? 'stove' : 'prep') || order.state === 'cooking' && order.sourceId !== target.id || member.guestId !== undefined || !destinationAdjacent(member, target)) fail('a cooking chef requires a reciprocal order and reachable cooking station');
    }
    if (['pickup', 'serving'].includes(member.task) && (member.role !== 'waiter' || !order || order.state !== 'ready' || order.waiterId !== member.id || guest?.id !== order.guestId || guest?.state !== 'ordered' || member.taskTarget !== undefined || !destinationAdjacent(member, member.task === 'pickup' ? objectById(game, order.sourceId) : guest))) fail('a serving waiter requires a reciprocal ready meal, guest and delivery path');
    if (member.task === 'cleaning' && (member.role !== 'cleaner' || !['bin', 'sink'].includes(target?.type) || member.orderId !== undefined || member.guestId !== undefined || !destinationAdjacent(member, target))) fail('a cleaner requires a reachable sink or waste bin');
    if (member.guestId !== undefined) {
      if (assignedGuests.has(member.guestId)) fail('multiple waiters are assigned to the same guest');
      assignedGuests.add(member.guestId);
    }
  }
  const menuIds = new Set();
  for (const entry of game.menu) {
    if (!recipeById(entry.recipeId) || menuIds.has(entry.recipeId) || !finite(entry.price, 1, 150) || typeof entry.enabled !== 'boolean') fail('the menu has an invalid recipe or price');
    menuIds.add(entry.recipeId);
  }
  if (menuIds.size !== RECIPES.length) fail('the menu is missing recipes');
  if (!game.stats || !game.daily) fail('financial statistics are missing');
  for (const [field, value] of Object.entries(game.stats)) if (!finite(value)) fail(`statistic ${field} must be finite`);
  for (const field of ['served', 'lost', 'revenue', 'expenses']) if (!finite(game.stats[field], 0)) fail(`statistic ${field} is invalid`);
  if (!finite(game.stats.rating, 1, 5) || !finite(game.stats.cleanliness, 0, 100)) fail('rating or cleanliness is invalid');
  for (const field of ['served', 'revenue', 'expenses']) if (!finite(game.daily[field], 0)) fail(`daily ${field} is invalid`);
  if (!game.scenario || !SCENARIOS.some((scenario) => scenario.id === game.scenario.id) || typeof game.scenario.complete !== 'boolean') fail('the challenge is invalid');
  const canonical = SCENARIOS.find((scenario) => scenario.id === game.scenario.id);
  if (JSON.stringify(game.scenario.goals) !== JSON.stringify(canonical.goals)) fail('challenge goals do not match this game version');
  for (const entry of game.events) if (typeof entry.text !== 'string' || !finite(entry.time, 0, 24)) fail('an event is invalid');
  if (game.unlocks.some((recipeId) => !recipeById(recipeId))) fail('an unlocked recipe is invalid');
  if (game.completedScenarios.some((scenarioId) => !SCENARIOS.some((scenario) => scenario.id === scenarioId && scenario.goals.length)) || new Set(game.completedScenarios).size !== game.completedScenarios.length) fail('completed challenges are invalid');
  return game;
}

function validateV2Save(game) {
  const fail = (message) => { throw new Error(`Cannot load restaurant: ${message}.`); };
  const finite = (value, low = -Infinity, high = Infinity) => typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
  const integer = (value, low = 0, high = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= low && value <= high;
  const exactKeys = (object, keys) => object && typeof object === 'object' && !Array.isArray(object) && Object.keys(object).length === keys.length && keys.every((key) => Object.hasOwn(object, key));
  if (!game || typeof game !== 'object' || game.version !== 2) fail('the save version must be 1 or 2');
  if (typeof game.name !== 'string' || !game.name.trim() || game.name.length > 40 || typeof game.mode !== 'string') fail('the restaurant name or mode is invalid');
  if (!finite(game.cash) || !finite(game.elapsed, 0) || !finite(game.calendarSeconds, 0) || !finite(game.accumulator, 0, STEP) || game.accumulator === STEP || !finite(game.arrivalIn, 0, 60)) fail('the financial clock or simulation timers are invalid');
  if (!integer(game.day, 1) || !finite(game.time, 0, 24) || game.time === 24 || Math.abs(game.calendarSeconds - ((game.day - 1) + game.time / 24) * DAY_SECONDS) > 0.00001 || ![0, 1, 2, 3].includes(game.speed)) fail('the calendar phase or speed is invalid');
  if (typeof game.open !== 'boolean' || typeof game.bankrupt !== 'boolean' || !integer(game.nextId, 1) || !integer(game.seed, 0, 4294967295) || !integer(game.candidateSeed, 0, 4294967295)) fail('opening state, ID sequence or random seeds are invalid');
  if (typeof game.doorGrantUsed !== 'boolean') fail('the first-door grant must record whether a door has been placed');
  if (!game.land || !inside(game.land.minX, game.land.minZ) || !inside(game.land.maxX, game.land.maxZ) || game.land.minX > game.land.maxX || game.land.minZ > game.land.maxZ) fail('owned land is outside the world');
  for (const field of ['floors', 'objects', 'staff', 'guests', 'orders', 'menu', 'events', 'unlocks', 'completedScenarios', 'candidates']) if (!Array.isArray(game[field])) fail(`${field} must be a list`);
  if (game.objects.length > 1152 || game.floors.length > 576 || game.staff.length > 20 || game.guests.length > 24 || game.orders.length > 24 || game.events.length > 24 || game.candidates.length !== 3) fail('the save contains too many actors, tiles or candidates');
  if (!game.supplies || !Array.isArray(game.supplies.stocks) || !Array.isArray(game.supplies.tablewareQueue) || !Array.isArray(game.supplies.ware)) fail('supplies and tableware lists are missing');
  const supplies = game.supplies, ids = new Set();
  for (const entry of [...game.objects, ...game.staff, ...game.guests, ...game.orders, ...game.events, ...game.candidates, ...supplies.ware]) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)) fail('actor and tableware IDs must be unique strings');
    ids.add(entry.id); const suffix = Number(entry.id.slice(entry.id.lastIndexOf('-') + 1));
    if (!integer(suffix, 1, game.nextId - 1)) fail('the ID sequence would overwrite an existing actor');
  }
  const ground = new Set(), children = new Set(), floors = new Set();
  for (const object of game.objects) {
    if (!Object.hasOwn(ITEMS, object.type) || !inside(object.x, object.z) || !owned(game, object.x, object.z) || ![0, 90, 180, 270].includes(object.rotation)) fail('furniture type, placement or rotation is invalid');
    if (object.purchaseCost !== undefined && (!finite(object.purchaseCost, 0, ITEMS[object.type].cost) || object.purchaseCost !== ITEMS[object.type].cost && !(object.type === 'door' && object.purchaseCost === 0))) fail('a furniture purchase cost is not supported');
    if (ITEMS[object.type].support) {
      const parent = objectById(game, object.parentId);
      if (!parent || parent.type !== 'counter' || parent.parentId !== undefined || parent.x !== object.x || parent.z !== object.z || parent.rotation !== object.rotation || children.has(parent.id)) fail('a countertop appliance has a missing, incompatible or occupied support');
      children.add(parent.id);
    } else {
      if (object.parentId !== undefined || ground.has(key(object.x, object.z))) fail('ground furniture overlaps or has an invalid parent');
      ground.add(key(object.x, object.z));
    }
  }
  if (!game.doorGrantUsed && game.objects.some((object) => object.type === 'door')) fail('the first-door grant is inconsistent');
  for (const floor of game.floors) {
    if (!floor || !inside(floor.x, floor.z) || !owned(game, floor.x, floor.z) || !FLOOR_STYLES.has(floor.style) || floors.has(key(floor.x, floor.z))) fail('floor placement or style is invalid');
    floors.add(key(floor.x, floor.z));
  }
  if (!exactKeys(supplies.ingredientBatches, Object.keys(INGREDIENTS)) || !exactKeys(supplies.wareLedger, Object.keys(TABLEWARE))) fail('the supply catalog is incomplete or contains unknown types');
  for (const [ingredientId, quantity] of Object.entries(supplies.ingredientBatches)) if (!integer(quantity, 0, capacity(game, INGREDIENTS[ingredientId].storageKind))) fail('an ingredient batch exceeds compatible capacity');
  if (!integer(supplies.ingredientNextDay, 10) || supplies.ingredientNextDay % 10 || supplies.ingredientNextDay !== (Math.floor(game.day / 10) + 1) * 10) fail('the next ingredient delivery calendar boundary is invalid');
  const stockPairs = new Set(), queuePairs = new Set();
  for (const stock of supplies.stocks) {
    const store = objectById(game, stock?.storageId), ingredient = INGREDIENTS[stock?.ingredientId], pair = `${stock?.storageId}:${stock?.ingredientId}`;
    if (!store || !ingredient || !Object.hasOwn(INGREDIENTS, stock.ingredientId) || ITEMS[store.type].storageKind !== ingredient.storageKind || !integer(stock.quantity, 1) || stockPairs.has(pair)) fail('ingredient stock has an invalid storage, type or quantity');
    stockPairs.add(pair);
  }
  for (const queue of supplies.tablewareQueue) {
    const pair = `${queue?.storageId}:${queue?.tablewareId}`;
    if (!queue || !Object.hasOwn(TABLEWARE, queue.tablewareId) || objectById(game, queue.storageId)?.type !== 'counter' || !integer(queue.quantity, 1) || queuePairs.has(pair)) fail('a prepaid dish queue has an invalid type, cabinet or quantity');
    queuePairs.add(pair);
  }
  if (supplies.tablewareQueue.length ? !finite(supplies.tablewareNextAt, 0, game.elapsed + 75.00001) : supplies.tablewareNextAt !== null) fail('the prepaid delivery deadline is invalid');
  if (supplies.ingredientBlockedReason !== undefined && typeof supplies.ingredientBlockedReason !== 'string') fail('a delivery failure reason must be text');
  if (game.cleaningDueSince !== null && !finite(game.cleaningDueSince, 0, game.elapsed)) fail('the cleaning job age is invalid');
  const skillRecord = (record) => exactKeys(record, ['cooking', 'speed', 'clumsiness']) && Object.values(record).every((value) => finite(value, 0, 1));
  for (const record of [...game.staff, ...game.candidates]) if (typeof record.name !== 'string' || !skillRecord(record.skills) || !finite(record.monthlyWage, 0, 22500)) fail('an employee or candidate has invalid skills or monthly pay');
  for (const record of game.candidates) if (record.monthlyWage !== Math.round(30 + 45 * record.skills.cooking + 45 * record.skills.speed + 30 * (1 - record.skills.clumsiness))) fail('candidate pay does not match the candidate skills');
  const solid = new Map(game.objects.filter((object) => ITEMS[object.type].solid).map((object) => [key(object.x, object.z), object]));
  const guests = new Set(game.guests.map((guest) => guest.id));
  const at = (a, b) => !!b && Math.abs(a.x - b.x) + Math.abs(a.z - b.z) < 0.00001;
  for (const actor of [...game.staff, ...game.guests]) {
    if (!finite(actor.x, 0, 23) || !finite(actor.z, 0, 23) || !Number.isInteger(actor.x) && !Number.isInteger(actor.z) || !Array.isArray(actor.path) || actor.path.length > 576 || !finite(actor.timer, 0)) fail('an actor position, path or timer is invalid');
    const ownChair = guests.has(actor.id) && objectById(game, actor.seatId), occupied = solid.get(key(tile(actor.x), tile(actor.z)));
    if (occupied && occupied.id !== ownChair?.id) fail('an actor position overlaps solid furniture outside their reserved seat');
    let previous = actor;
    for (const [index, point] of actor.path.entries()) {
      if (!point || !inside(point.x, point.z) || Math.abs(point.x - previous.x) + Math.abs(point.z - previous.z) > 1.00001) fail('an actor path skips intervening tiles');
      const blocked = solid.get(key(point.x, point.z));
      const ownSeat = blocked?.id === ownChair?.id && (actor.state === 'arriving' && index === actor.path.length - 1 || index === 0 && sameTile(actor, point));
      if (blocked && !ownSeat) fail('an actor path crosses solid furniture');
      previous = point;
    }
  }
  const seatsInUse = new Set();
  for (const guest of game.guests) {
    if (!GUEST_STATES.includes(guest.state) || typeof guest.name !== 'string' || !finite(guest.hunger, 0, 100) || !finite(guest.patience) || !finite(guest.happiness, 0, 100) || !finite(guest.bill, 0, 150) || !finite(guest.mealTime, 0, 1000) || typeof guest.toiletNeed !== 'boolean') fail('a guest has invalid needs or state');
    const chair = objectById(game, guest.seatId), table = objectById(game, guest.tableId);
    if (guest.state !== 'leaving') {
      if (chair?.type !== 'chair' || table?.type !== 'table' || seatsInUse.has(chair.id) || Math.abs(chair.x - table.x) + Math.abs(chair.z - table.z) !== 1 || !floors.has(key(chair.x, chair.z)) || !floors.has(key(table.x, table.z))) fail('a guest has a missing or duplicate reserved seat');
      seatsInUse.add(chair.id);
      if (['waiting', 'ordered', 'eating'].includes(guest.state) && (!at(guest, chair) || guest.path.length)) fail('a seated guest must remain at their reserved chair');
      if (guest.state === 'arriving' && !at(guest.path.at(-1) ?? guest, chair)) fail('an arriving guest path must end at their chair');
    }
    if (guest.state === 'ordered' ? !game.orders.some((order) => order.id === guest.orderId && order.guestId === guest.id) : guest.orderId !== undefined) fail('a guest order link is invalid');
    if (['arriving', 'waiting', 'ordered'].includes(guest.state) && guest.bill !== 0 || ['eating', 'toilet'].includes(guest.state) && guest.bill <= 0) fail('a guest bill does not match their state');
    if (guest.bill > 0 && (!finite(guest.mealQuality, 0, 1) || guest.legacyMeal !== true && !recipeById(guest.mealRecipeId) || guest.legacyMeal === true && guest.mealRecipeId !== undefined)) fail('served meal quality or recipe provenance is invalid');
    if (guest.legacyMeal !== undefined && guest.legacyMeal !== true || guest.bill === 0 && ['mealQuality', 'mealRecipeId', 'legacyMeal'].some((field) => guest[field] !== undefined)) fail('a guest meal provenance flag does not match their dining state');
    if (guest.state === 'eating') {
      const ware = wareById(game, guest.wareId);
      if (!ware || ware.state !== 'guest' || ware.guestId !== guest.id || ware.type !== (guest.legacyMeal ? 'plate' : recipeById(guest.mealRecipeId).tableware)) fail('an eating guest is missing their compatible dish');
    } else if (guest.wareId !== undefined) fail('a guest retains dish ownership after eating');
    if (guest.state === 'toilet' && (typeof guest.toiletReached !== 'boolean' || !game.objects.some((object) => object.type === 'toilet' && Math.abs((guest.path.at(-1) ?? guest).x - object.x) + Math.abs((guest.path.at(-1) ?? guest).z - object.z) <= 1.00001))) fail('a guest toilet path or facility is missing');
    if (guest.state === 'leaving' && (typeof guest.exitBlocked !== 'boolean' || !guest.exitBlocked && !at(guest.path.at(-1) ?? guest, ENTRY))) fail('a departing guest has no valid exit path');
  }
  for (const order of game.orders) {
    const recipe = recipeById(order.recipeId), source = objectById(game, order.sourceId), unit = wareById(game, order.wareId);
    if (!recipe || !game.guests.some((guest) => guest.id === order.guestId && guest.state === 'ordered' && guest.orderId === order.id) || !['queued', 'cooking', 'ready'].includes(order.state) || !finite(order.price, 1, 150) || !finite(order.progress, 0, 10000) || !finite(order.createdAt, 0, game.elapsed) || !['regular', 'legacy-pending', 'legacy-paid'].includes(order.funding)) fail('an order recipe, owner, funding or progress is invalid');
    if (order.state === 'queued') {
      if (order.ingredientsCommitted !== false || order.sourceId !== undefined || order.wareId !== undefined || order.progress !== 0 || order.quality !== undefined || order.funding === 'legacy-paid') fail('an unprepared order cannot own committed materials');
      const legacyRecipe = V1_RECIPES.find((recipe) => recipe.id === order.recipeId);
      if (order.funding === 'legacy-pending' ? !legacyRecipe || !finite(order.legacyDebit, 0) || order.legacyDebit !== legacyRecipe.cost : order.legacyDebit !== undefined) fail('a legacy queued debit is invalid');
    } else {
      if (order.ingredientsCommitted !== true || order.funding === 'legacy-pending' || order.legacyDebit !== undefined || !source || !capability(source, recipe.primary) || !unit || unit.type !== recipe.tableware || unit.orderId !== order.id || !['order', 'carriedMeal'].includes(unit.state)) fail('a prepared order requires committed ingredients, compatible source and dish');
      if (order.funding === 'legacy-paid' && !V1_RECIPES.some((legacy) => legacy.id === order.recipeId)) fail('legacy funding cannot apply to a newly added recipe');
      if (order.state === 'ready' ? order.progress < recipe.cookTime || !finite(order.quality, 0, 1) : order.progress >= recipe.cookTime || order.quality !== undefined) fail('order cooking progress or quality does not match its state');
    }
    if (order.staffId !== undefined && (order.state === 'ready' || !game.staff.some((member) => member.id === order.staffId && member.task === 'cooking' && member.orderId === order.id))) fail('an order chef link is invalid');
    if (order.waiterId !== undefined && (order.state !== 'ready' || !game.staff.some((member) => member.id === order.waiterId && ['pickup', 'serving'].includes(member.task) && member.orderId === order.id))) fail('an order waiter link is invalid');
  }
  const assignments = new Set(), sinksInUse = new Set();
  const tasks = ['idle', 'taking-order', 'cooking', 'pickup', 'serving', 'cleaning', 'dish-collect', 'dish-to-sink', 'dish-wash', 'dish-return', 'meal-dispose'];
  for (const member of game.staff) {
    if (member.role !== 'employee' || !finite(member.energy, 0, 100) || !finite(member.wageAccrued, 0, member.monthlyWage + 0.00001) || !exactKeys(member.priorities, TASK_GROUPS) || Object.values(member.priorities).some((priority) => !PRIORITIES.includes(priority)) || !tasks.includes(member.task)) fail('an employee has invalid priorities, task or accrued wages');
    const order = game.orders.find((order) => order.id === member.orderId), guest = game.guests.find((guest) => guest.id === member.guestId), ware = wareById(game, member.wareId), target = taskTarget(game, member);
    const links = ['orderId', 'guestId', 'wareId', 'taskTarget', 'sinkId'];
    const allowed = member.task === 'idle' ? [] : member.task === 'taking-order' ? ['guestId'] : member.task === 'cooking' ? ['orderId', 'taskTarget'] : ['pickup', 'serving'].includes(member.task) ? ['orderId', 'guestId', 'wareId'] : member.task === 'cleaning' ? ['taskTarget'] : member.task === 'meal-dispose' ? ['wareId', 'taskTarget'] : ['wareId', 'taskTarget', 'sinkId'];
    if (links.some((field) => member[field] !== undefined && !allowed.includes(field))) fail('an employee task retains incompatible ownership links');
    if (member.task === 'idle') { if (member.path.length || member.blocked !== undefined) fail('idle staff cannot retain a path or blocked task'); continue; }
    if (!target) fail('an employee task target is missing');
    if (member.blocked !== undefined) {
      if (member.blocked !== true || member.path.length || typeof member.blockedReason !== 'string' || adjacentPath(game, member, target) !== null) fail('a blocked employee task must have an actually unreachable target');
    } else {
      const end = member.path.at(-1) ?? member;
      if (Math.abs(end.x - target.x) + Math.abs(end.z - target.z) > 1.00001) fail('an employee path does not reach its task target');
    }
    if (member.task === 'taking-order' && guest?.state !== 'waiting') fail('an employee taking an order needs a waiting guest');
    if (member.task === 'cooking' && (!order || !['queued', 'cooking'].includes(order.state) || order.staffId !== member.id || !capability(target, recipeById(order.recipeId).primary) || order.state === 'cooking' && order.sourceId !== target.id)) fail('a cooking employee requires a reciprocal order and compatible station');
    if (['pickup', 'serving'].includes(member.task) && (!order || order.state !== 'ready' || order.waiterId !== member.id || guest?.id !== order.guestId || guest.state !== 'ordered' || !ware || ware.id !== order.wareId || ware.state !== (member.task === 'pickup' ? 'order' : 'carriedMeal'))) fail('a serving employee requires reciprocal meal, guest and dish links');
    if (member.task === 'cleaning' && !['sink', 'bin'].includes(target.type)) fail('a cleaner requires a reachable sink or waste bin');
    if (member.task.startsWith('dish-')) {
      const expected = { 'dish-collect': 'dirty', 'dish-to-sink': 'carriedDirty', 'dish-wash': 'washing', 'dish-return': 'carriedClean' }[member.task];
      if (!ware || ware.state !== expected || objectById(game, member.sinkId)?.type !== 'sink' || objectById(game, ware.returnStorageId)?.type !== 'counter') fail('a dishwashing task requires its owned dish, sink and reserved cabinet');
      if (member.task === 'dish-collect' ? ware.assigneeId !== member.id || ware.locationId !== target.id : ware.staffId !== member.id) fail('a dishwashing owner link is inconsistent');
      if (['dish-to-sink', 'dish-wash'].includes(member.task) && target.id !== member.sinkId || member.task === 'dish-return' && target.id !== ware.returnStorageId) fail('a washing task has an incompatible destination');
      if (sinksInUse.has(member.sinkId)) fail('multiple dishwashing tasks reserve one sink'); sinksInUse.add(member.sinkId);
    }
    if (member.task === 'meal-dispose' && (!ware || ware.state !== 'carriedDirty' || ware.staffId !== member.id || ware.returnStorageId !== undefined || !['stove', 'prep', 'cuttingboard', 'fryer'].includes(target.type))) fail('a meal disposal requires its carried dish and original cooking station');
    if (member.guestId !== undefined) { if (assignments.has(member.guestId)) fail('multiple waiters are assigned to one guest'); assignments.add(member.guestId); }
  }
  const wareLinks = ['storageId', 'orderId', 'guestId', 'locationId', 'dirtySince', 'assigneeId', 'staffId', 'sinkId', 'returnStorageId', 'breakageChecked'];
  for (const ware of supplies.ware) {
    if (!Object.hasOwn(TABLEWARE, ware.type)) fail('a dish has an unknown tableware type');
    const holder = game.staff.find((member) => member.id === ware.staffId);
    const required = { clean: ['storageId'], order: ['orderId'], carriedMeal: ['staffId', 'orderId'], guest: ['guestId'], dirty: ['locationId', 'dirtySince'], carriedDirty: ['staffId'], washing: ['staffId', 'sinkId', 'returnStorageId'], carriedClean: ['staffId', 'returnStorageId'] }[ware.state];
    if (!required) fail('a dish has an invalid state');
    const allowed = [...required];
    if (ware.state === 'dirty' && ware.assigneeId !== undefined) allowed.push('assigneeId', 'returnStorageId');
    if (ware.state === 'carriedDirty' && holder?.task === 'dish-to-sink') { allowed.push('returnStorageId', 'breakageChecked'); required.push('returnStorageId', 'breakageChecked'); }
    if (required.some((field) => ware[field] === undefined) || wareLinks.some((field) => ware[field] !== undefined && !allowed.includes(field))) fail('dish ownership fields do not match its state');
    if (ware.state === 'clean' && objectById(game, ware.storageId)?.type !== 'counter') fail('a clean dish is missing its cabinet');
    if (ware.state === 'order' && !game.orders.some((order) => order.id === ware.orderId && order.wareId === ware.id && order.state !== 'queued')) fail('a dish order ownership link is invalid');
    if (ware.state === 'carriedMeal' && (!holder || holder.task !== 'serving' || holder.wareId !== ware.id || holder.orderId !== ware.orderId || !game.orders.some((order) => order.id === ware.orderId && order.wareId === ware.id && order.waiterId === holder.id))) fail('a carried meal ownership link is invalid');
    if (ware.state === 'guest' && !game.guests.some((guest) => guest.id === ware.guestId && guest.state === 'eating' && guest.wareId === ware.id)) fail('a guest dish ownership link is invalid');
    if (ware.state === 'dirty') {
      if (!['table', 'stove', 'prep', 'cuttingboard', 'fryer'].includes(objectById(game, ware.locationId)?.type) || !finite(ware.dirtySince, 0, game.elapsed)) fail('a dirty dish location or age is invalid');
      if (ware.assigneeId !== undefined && !game.staff.some((member) => member.id === ware.assigneeId && member.task === 'dish-collect' && member.wareId === ware.id)) fail('a dirty dish collector is missing');
    }
    if (['carriedDirty', 'washing', 'carriedClean'].includes(ware.state) && (!holder || holder.wareId !== ware.id || !['dish-to-sink', 'dish-wash', 'dish-return', 'meal-dispose'].includes(holder.task))) fail('a carried or washing dish has no reciprocal employee');
    if (ware.state === 'washing' && (objectById(game, ware.sinkId)?.type !== 'sink' || holder.taskTarget !== ware.sinkId)) fail('a washing dish has no compatible sink');
    if (ware.state === 'carriedDirty' && holder?.task === 'dish-to-sink' && typeof ware.breakageChecked !== 'boolean') fail('a dish carry breakage check is invalid');
    if (ware.returnStorageId !== undefined && objectById(game, ware.returnStorageId)?.type !== 'counter') fail('a dish return reservation has no cabinet');
  }
  for (const object of game.objects.filter((object) => ITEMS[object.type].capacity)) if (usedStorage(game, object.id) + reservedStorage(game, object.id) > ITEMS[object.type].capacity) fail('storage or tableware reservations exceed capacity');
  for (const [type, ledger] of Object.entries(supplies.wareLedger)) if (!exactKeys(ledger, ['granted', 'delivered', 'broken']) || Object.values(ledger).some((value) => !integer(value)) || ledger.granted + ledger.delivered !== supplies.ware.filter((ware) => ware.type === type).length + ledger.broken) fail('tableware conservation totals are inconsistent');
  const menu = new Set();
  for (const entry of game.menu) { if (!recipeById(entry?.recipeId) || menu.has(entry.recipeId) || !finite(entry.price, 1, 150) || typeof entry.enabled !== 'boolean') fail('a menu recipe or price is invalid'); menu.add(entry.recipeId); }
  if (menu.size !== RECIPES.length) fail('the menu is missing recipes');
  if (!game.stats || !game.daily) fail('financial statistics are missing');
  for (const field of ['served', 'lost', 'revenue', 'expenses']) if (!finite(game.stats[field], 0)) fail(`statistic ${field} is invalid`);
  if (!finite(game.stats.rating, 1, 5) || !finite(game.stats.cleanliness, 0, 100) || !finite(game.daily.served, 0) || !finite(game.daily.revenue, 0) || !finite(game.daily.expenses)) fail('rating, hygiene or daily financial statistics are invalid');
  const scenario = SCENARIOS.find((scenario) => scenario.id === game.scenario?.id);
  if (!scenario || typeof game.scenario.complete !== 'boolean' || JSON.stringify(scenario.goals) !== JSON.stringify(game.scenario.goals)) fail('the challenge goals are invalid');
  if (game.unlocks.some((recipeId) => !recipeById(recipeId)) || game.completedScenarios.some((id) => !SCENARIOS.some((scenario) => scenario.id === id && scenario.goals.length)) || new Set(game.completedScenarios).size !== game.completedScenarios.length) fail('unlocked recipes or completed challenges are invalid');
  for (const event of game.events) if (typeof event.text !== 'string' || !finite(event.time, 0, 24)) fail('an event is invalid');
  return game;
}
function migrateV1(game) {
  game.version = 2; game.calendarSeconds = ((game.day - 1) + game.time / 24) * DAY_SECONDS;
  game.supplies = freshSupplies(game.day); game.cleaningDueSince = game.stats.cleanliness < 90 ? game.elapsed : null;
  for (const member of game.staff) {
    member.priorities = profile(member.role); member.role = 'employee'; member.monthlyWage = member.wage * 22.5; member.wageAccrued = 0;
    member.skills = { cooking: clamp(member.skill - 0.5, 0, 1), speed: 0.5, clumsiness: 0.1 };
    delete member.wage; delete member.skill;
  }
  for (const order of game.orders) {
    const guest = game.guests.find((guest) => guest.id === order.guestId);
    order.createdAt = Math.max(0, game.elapsed - guest.timer); order.ingredientsCommitted = order.state !== 'queued';
    order.funding = order.state === 'queued' ? 'legacy-pending' : 'legacy-paid';
    if (order.state === 'queued') order.legacyDebit = V1_RECIPES.find((recipe) => recipe.id === order.recipeId).cost;
    else {
      const waiter = game.staff.find((member) => member.id === order.waiterId), carried = waiter?.task === 'serving';
      const ware = grantWare(game, recipeById(order.recipeId).tableware, carried ? 'carriedMeal' : 'order', carried ? { orderId: order.id, staffId: waiter.id } : { orderId: order.id });
      order.wareId = ware.id;
      if (waiter) waiter.wareId = ware.id;
      if (order.state === 'ready') order.quality = 1;
    }
  }
  for (const guest of game.guests) {
    if (guest.bill > 0) { guest.mealQuality = 1; guest.legacyMeal = true; }
    if (guest.state === 'eating') guest.wareId = grantWare(game, 'plate', 'guest', { guestId: guest.id }).id;
    else if (guest.bill > 0 && objectById(game, guest.tableId)?.type === 'table') grantWare(game, 'plate', 'dirty', { locationId: guest.tableId, dirtySince: game.elapsed });
  }
  game.menu.push({ recipeId: 'fries', price: 15, enabled: false });
  game.candidates = Array.from({ length: 3 }, () => candidate(game));
  return game;
}

export function deserialize(value) {
  if (typeof value !== 'string' || value.length > 2000000) throw new Error('Cannot load restaurant: provide a save string smaller than 2 MB.');
  let parsed;
  try { parsed = JSON.parse(value); } catch { throw new Error('Cannot load restaurant: the save is not valid JSON.'); }
  try {
    if (parsed?.version === 1) return validateV2Save(migrateV1(validateV1Save(parsed)));
    return validateV2Save(parsed);
  }
  catch (error) {
    if (error instanceof Error && error.message.startsWith('Cannot load restaurant:')) throw error;
    throw new Error('Cannot load restaurant: the save contains malformed records.');
  }
}
