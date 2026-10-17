import { ITEMS, RECIPES, SCENARIOS } from './catalog.js';

const STEP = 0.25;
const HOUR = 20;
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

function addStaff(game, role) {
  const member = { id: id(game, 'staff'), name: NAMES[game.staff.length % NAMES.length], role, wage: WAGES[role], skill: 1, energy: 100, x: 8 + game.staff.length, z: 7, task: 'idle', path: [], timer: 0 };
  const spot = nearestWalkable(game, member);
  if (spot) Object.assign(member, spot);
  game.staff.push(member);
  return member;
}

export function createGame(mode = 'sandbox') {
  const selected = SCENARIOS.find((scenario) => scenario.id === mode) ?? SCENARIOS[0];
  const game = {
    version: 1, mode, name: 'Corner Table', cash: mode === 'empty' ? 15000 : 6250,
    day: 1, time: 10, speed: 1, open: mode !== 'empty',
    land: { minX: 4, maxX: 19, minZ: 4, maxZ: 19 }, floors: [], objects: [], staff: [], guests: [], orders: [],
    menu: RECIPES.map((recipe) => ({ recipeId: recipe.id, price: recipe.price, enabled: recipe.unlock === 0 })),
    stats: { served: 0, lost: 0, revenue: 0, expenses: 0, rating: 3.8, cleanliness: 100 },
    events: [], scenario: { ...structuredClone(selected), complete: false },
    seed: 741852, nextId: 1, elapsed: 0, accumulator: 0, arrivalIn: 3, bankrupt: false, unlocks: [], completedScenarios: [], doorGrantUsed: mode !== 'empty',
    daily: { served: 0, revenue: 0, expenses: 0 },
  };
  if (mode !== 'empty') {
    for (let x = 6; x <= 17; x++) for (let z = 6; z <= 16; z++) game.floors.push({ x, z, style: z <= 8 ? 'kitchen' : 'peach' });
    for (let x = 6; x <= 17; x++) { addObject(game, 'wall', x, 6); addObject(game, 'wall', x, 16); }
    for (let z = 7; z <= 15; z++) { addObject(game, 'wall', 6, z, 90); addObject(game, 'wall', 17, z, 90); }
    game.objects = game.objects.filter((object) => !(object.x === 11 && object.z === 6));
    addObject(game, 'door', 11, 6, 0, 0);
    addObject(game, 'stove', 7, 7); addObject(game, 'prep', 8, 7); addObject(game, 'fridge', 9, 7);
    addObject(game, 'sink', 13, 7); addObject(game, 'bin', 14, 7); addObject(game, 'counter', 12, 8);
    for (const [x, z] of [[9, 10], [13, 10], [9, 13], [13, 13]]) {
      addObject(game, 'table', x, z); addObject(game, 'chair', x - 1, z, 90); addObject(game, 'chair', x + 1, z, 270);
    }
    addObject(game, 'toilet', 16, 14); addObject(game, 'sink', 16, 13);
    for (const [x, z] of [[7, 9], [16, 9], [7, 15], [15, 15]]) addObject(game, 'plant', x, z);
    addObject(game, 'painting', 10, 15); addObject(game, 'clock', 14, 15); addObject(game, 'lamp', 7, 12); addObject(game, 'flowerbox', 10, 5);
    addStaff(game, 'chef'); addStaff(game, 'waiter'); addStaff(game, 'cleaner');
    event(game, 'Welcome! Your restaurant is open. Build, hire and create your menu.');
  } else event(game, 'A fresh start. Lay floors, build a kitchen and dining room, then open your doors.');
  return game;
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
    const existing = game.objects.find((object) => object.x === x && object.z === z);
    if (existing && STRUCTURAL_TYPES.has(itemType) && existing.type === itemType) continue;
    const replacingWall = itemType === 'door' && existing && ['wall', 'window'].includes(existing.type);
    if (existing && !replacingWall) return outcome(false, 'That tile already contains furniture.');
    if (game.guests.some((guest) => sameTile(guest, { x, z }))) return outcome(false, 'Wait for the guest to leave this tile before building.');
    if (!['Building', 'Decoration'].includes(item.category) && !game.floors.some((floor) => floor.x === x && floor.z === z)) return outcome(false, 'Lay a floor on this tile before placing furniture.');
    const cost = itemType === 'door' && !game.doorGrantUsed ? 0 : item.cost;
    totalCost += cost; changes.push({ x, z, existing: replacingWall ? existing : null, cost });
  }
  if (!changes.length) return outcome(true, `${item.name} is already in place.`);
  if (totalCost > 0 && game.cash < totalCost) return outcome(false, `You need $${totalCost} to buy ${changes.length === 1 ? item.name.toLowerCase() : `${changes.length} ${item.name.toLowerCase()} segments`}.`);
  if (totalCost > 0) spend(game, totalCost);
  const normalizedRotation = Number.isFinite(rotation) ? ((Math.round(rotation / 90) * 90 % 360) + 360) % 360 : 0;
  for (const change of changes) {
    if (change.existing) {
      change.existing.type = itemType; change.existing.purchaseCost = change.cost;
    } else addObject(game, itemType, change.x, change.z, normalizedRotation, change.cost);
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
  const equipment = new Set(game.objects.map((object) => object.type));
  return game.menu.filter((entry) => {
    const recipe = recipeById(entry.recipeId);
    return entry.enabled && recipe.unlock <= game.stats.served && recipe.equipment.every((type) => equipment.has(type));
  });
}

function resetStaff(member) {
  member.task = 'idle'; member.path = []; member.timer = 0;
  delete member.taskTarget; delete member.orderId; delete member.guestId;
}

function leave(game, guest, reason) {
  if (guest.state === 'leaving') return;
  if (reason) { guest.failed = true; guest.happiness = Math.max(0, guest.happiness - 35); game.stats.lost++; event(game, `${guest.name} left: ${reason}.`); }
  guest.state = 'leaving'; guest.path = pathTo(game, guest, ENTRY) ?? []; guest.timer = 0;
  guest.exitBlocked = !sameTile(guest, ENTRY) && !guest.path.length;
  if (guest.orderId) {
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
  const allSeats = seats(game);
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
      guest.happiness = clamp(guest.happiness + 7 + (game.stats.cleanliness - 75) * 0.12, 0, 100);
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

function assignChef(game, member) {
  for (const order of game.orders.filter((entry) => ['queued', 'cooking'].includes(entry.state) && !entry.staffId)) {
    const recipe = recipeById(order.recipeId);
    const equipment = game.objects.filter((object) => recipe.equipment.includes(object.type));
    if (!recipe.equipment.every((type) => equipment.some((object) => object.type === type))) continue;
    const candidates = equipment.filter((object) => order.sourceId ? object.id === order.sourceId : object.type === (recipe.equipment.includes('stove') ? 'stove' : 'prep'));
    for (const object of candidates) {
      if (game.staff.some((other) => other.id !== member.id && other.taskTarget === object.id && other.task === 'cooking')) continue;
      const path = adjacentPath(game, member, object);
      if (path) { member.task = 'cooking'; member.taskTarget = object.id; member.orderId = order.id; member.path = path; member.timer = 0; order.staffId = member.id; return; }
    }
  }
}

function assignWaiter(game, member) {
  for (const order of game.orders.filter((entry) => entry.state === 'ready' && !entry.waiterId)) {
    const source = objectById(game, order.sourceId);
    const guest = game.guests.find((entry) => entry.id === order.guestId && entry.state === 'ordered');
    if (!source || !guest || !adjacentPath(game, source, guest)) continue;
    const path = adjacentPath(game, member, source);
    if (path) { member.task = 'pickup'; member.orderId = order.id; member.guestId = guest.id; member.path = path; order.waiterId = member.id; return; }
  }
  for (const guest of game.guests.filter((entry) => entry.state === 'waiting')) {
    if (game.staff.some((other) => other.guestId === guest.id)) continue;
    const path = adjacentPath(game, member, guest);
    if (path) { member.task = 'taking-order'; member.guestId = guest.id; member.path = path; member.timer = 0; return; }
  }
}

function updateStaff(game, seconds) {
  for (const member of game.staff) {
    member.energy = clamp(member.energy + seconds * (member.task === 'idle' ? 0.08 : -0.018), 15, 100);
    const speed = 1.8 * (0.7 + member.energy / 333);
    if (member.task === 'idle') {
      if (member.role === 'chef') assignChef(game, member);
      if (member.role === 'waiter') assignWaiter(game, member);
      if (member.role === 'cleaner' && game.stats.cleanliness < 99) {
        const target = game.objects.filter((object) => ['bin', 'sink'].includes(object.type)).map((object) => ({ object, path: adjacentPath(game, member, object) })).find((entry) => entry.path);
        if (target) { member.task = 'cleaning'; member.taskTarget = target.object.id; member.path = target.path; member.timer = 0; }
      }
    }
    if (member.task === 'idle' || !move(member, seconds, speed)) continue;
    member.timer += seconds;
    if (member.task === 'taking-order' && member.timer >= 1.5) {
      const guest = game.guests.find((entry) => entry.id === member.guestId && entry.state === 'waiting');
      const choices = availableMenu(game);
      if (guest && choices.length) {
        const menuEntry = choices[Math.floor(random(game) * choices.length)], recipe = recipeById(menuEntry.recipeId);
        if (menuEntry.price > recipe.price * 1.8) { guest.happiness -= 25; if (random(game) < 0.5) { leave(game, guest, 'the menu was too expensive'); resetStaff(member); continue; } }
        const order = { id: id(game, 'order'), guestId: guest.id, recipeId: recipe.id, price: menuEntry.price, state: 'queued', progress: 0 };
        game.orders.push(order); guest.orderId = order.id; guest.state = 'ordered'; guest.timer = 0;
      }
      resetStaff(member);
    } else if (member.task === 'cooking') {
      const order = game.orders.find((entry) => entry.id === member.orderId);
      const recipe = order && recipeById(order.recipeId);
      if (!order || !objectById(game, member.taskTarget)) { resetStaff(member); continue; }
      if (order.state === 'queued') {
        if (game.cash < recipe.cost) continue;
        spend(game, recipe.cost); order.state = 'cooking'; order.sourceId = member.taskTarget;
      }
      order.progress += seconds * member.skill;
      if (order.progress >= recipe.cookTime) { order.state = 'ready'; delete order.staffId; member.skill = Math.min(1.5, member.skill + 0.002); resetStaff(member); }
    } else if (member.task === 'pickup') {
      const order = game.orders.find((entry) => entry.id === member.orderId), guest = game.guests.find((entry) => entry.id === member.guestId);
      const path = guest && adjacentPath(game, member, guest);
      if (!order || !guest || !path) { if (order) delete order.waiterId; resetStaff(member); continue; }
      member.task = 'serving'; member.path = path; member.timer = 0;
    } else if (member.task === 'serving' && member.timer >= 0.75) {
      const order = game.orders.find((entry) => entry.id === member.orderId), guest = game.guests.find((entry) => entry.id === member.guestId);
      if (order && guest && guest.state === 'ordered') {
        guest.state = 'eating'; guest.timer = 0; guest.bill = order.price; guest.happiness = Math.min(100, guest.happiness + 3);
        game.orders = game.orders.filter((entry) => entry.id !== order.id); delete guest.orderId;
      }
      resetStaff(member);
    } else if (member.task === 'cleaning') {
      game.stats.cleanliness = Math.min(100, game.stats.cleanliness + seconds * 1.3);
      if (member.timer >= 10 || game.stats.cleanliness >= 99.9) resetStaff(member);
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
  game.time += seconds / HOUR;
  while (game.time >= 24) {
    game.time -= 24; game.day++;
    const rent = 90 + (game.land.maxX - game.land.minX + 1) * (game.land.maxZ - game.land.minZ + 1) * 0.25;
    spend(game, rent); event(game, `Day ${game.day}. Daily rent paid: $${rent.toFixed(0)}.`);
    game.daily = { served: 0, revenue: 0, expenses: rent };
  }
  spend(game, game.staff.reduce((total, member) => total + member.wage, 0) * seconds / HOUR);
  const activeGuests = game.guests.filter((guest) => guest.state !== 'leaving').length;
  game.stats.cleanliness = clamp(game.stats.cleanliness - seconds * (0.012 + activeGuests * 0.012), 0, 100);
  updateGuests(game, seconds); updateStaff(game, seconds); arrivals(game, seconds); updateGoals(game);
  if (game.cash <= -500 && !game.bankrupt) { game.bankrupt = true; game.open = false; event(game, 'Cash reserves are exhausted. Sell furniture or reduce wages to recover.'); }
  if (game.bankrupt && game.cash > 0) { game.bankrupt = false; event(game, 'Your finances have recovered. You can reopen the restaurant.'); }
}

export function tick(game, dtSeconds) {
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0 || game.speed === 0) return;
  game.accumulator += Math.min(dtSeconds, 60) * game.speed;
  while (game.accumulator + 1e-9 >= STEP) { step(game, STEP); game.accumulator = Math.max(0, game.accumulator - STEP); }
}

function rebuildPaths(game) {
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
    if (member.orderId) {
      const order = game.orders.find((entry) => entry.id === member.orderId);
      if (order) { delete order.staffId; delete order.waiterId; }
    }
    if (blockers(game).has(key(tile(member.x), tile(member.z)))) {
      const position = nearestWalkable(game, member);
      if (position) Object.assign(member, position);
    }
    resetStaff(member);
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
      if (!ROLES.includes(action.role)) return outcome(false, 'Choose chef, waiter or cleaner as the staff role.');
      if (game.staff.length >= 20) return outcome(false, 'Your restaurant already has the maximum of 20 employees.');
      if (game.cash < 100) return outcome(false, 'You need $100 for recruitment.');
      spend(game, 100); const member = addStaff(game, action.role); event(game, `${member.name} joined as a ${action.role}.`);
      return outcome(true, `${member.name} hired.`);
    }
    case 'FIRE': {
      const member = game.staff.find((entry) => entry.id === action.id);
      if (!member) return outcome(false, 'Choose an existing employee to dismiss.');
      game.staff = game.staff.filter((entry) => entry.id !== action.id);
      for (const order of game.orders) { if (order.staffId === action.id) delete order.staffId; if (order.waiterId === action.id) delete order.waiterId; }
      event(game, `${member.name} has left the team.`); return outcome(true, `${member.name} dismissed.`);
    }
    case 'PRIORITY': {
      const member = game.staff.find((entry) => entry.id === action.id);
      if (!member || !ROLES.includes(action.role)) return outcome(false, 'Choose an existing employee and a valid staff role.');
      for (const order of game.orders) { if (order.staffId === member.id) delete order.staffId; if (order.waiterId === member.id) delete order.waiterId; }
      resetStaff(member); member.role = action.role; member.wage = WAGES[action.role]; return outcome(true, `${member.name} is now a ${action.role}.`);
    }
    case 'PRICE': {
      const entry = game.menu.find((menuEntry) => menuEntry.recipeId === action.recipeId);
      if (!entry || !Number.isFinite(action.price) || action.price < 1 || action.price > 150) return outcome(false, 'Set the price of an existing recipe between $1 and $150.');
      entry.price = Math.round(action.price * 100) / 100; return outcome(true, 'Menu price updated.');
    }
    case 'TOGGLE_RECIPE': {
      const entry = game.menu.find((menuEntry) => menuEntry.recipeId === action.recipeId), recipe = recipeById(action.recipeId);
      if (!entry) return outcome(false, 'Choose an existing recipe.');
      if (game.stats.served < recipe.unlock) return outcome(false, `Serve ${recipe.unlock} guests to unlock ${recipe.name}.`);
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
  const readiness = buildingReadiness(game);
  if (!readiness.hasRoom) warnings.push('Close a wall boundary to create a room and its default flooring.');
  else if (!readiness.hasEntrance) warnings.push('Add a reachable door between the enclosed room and outside.');
  if (!seatCount) warnings.push('Add a table and an adjacent chair on flooring to seat guests.');
  if (!game.staff.some((member) => member.role === 'chef')) warnings.push('Hire a chef to prepare meals.');
  if (!game.staff.some((member) => member.role === 'waiter')) warnings.push('Hire a waiter to take orders and serve food.');
  if (!recipes.length) warnings.push('Enable a recipe and provide its required kitchen equipment.');
  if (!game.objects.some((object) => object.type === 'toilet')) warnings.push('Guests would appreciate a toilet.');
  if (game.stats.cleanliness < 60) warnings.push('The restaurant needs cleaning. Hire a cleaner and provide a sink or bin.');
  if (seatCount && !seats(game).some(({ chair }) => pathTo(game, ENTRY, chair, true))) warnings.push('Your dining room is unreachable. Add a clear entrance.');
  if (game.cash < 250) warnings.push('Cash is running low. Review menu prices and staffing costs.');
  const values = goalValues(game);
  return { ...game.stats, cash: game.cash, day: game.day, time: game.time, guests: game.guests.length, seats: seatCount,
    tables: game.objects.filter((object) => object.type === 'table').length, staff: game.staff.length, orders: game.orders.length,
    profit: game.stats.revenue - game.stats.expenses, occupancy: seatCount ? game.guests.filter((guest) => guest.state !== 'leaving').length / seatCount : 0,
    availableRecipes: recipes.map((entry) => entry.recipeId), warnings, bankrupt: game.bankrupt,
    hourlyWages: game.staff.reduce((total, member) => total + member.wage, 0), ...readiness,
    scenarioProgress: game.scenario.goals.map((goal) => ({ ...goal, value: values[goal.stat] ?? 0, complete: (values[goal.stat] ?? 0) >= goal.target })),
  };
}

export function serialize(game) { return JSON.stringify(game); }

function validateSave(game) {
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

export function deserialize(value) {
  if (typeof value !== 'string' || value.length > 2000000) throw new Error('Cannot load restaurant: provide a save string smaller than 2 MB.');
  let parsed;
  try { parsed = JSON.parse(value); } catch { throw new Error('Cannot load restaurant: the save is not valid JSON.'); }
  try { return validateSave(parsed); }
  catch (error) {
    if (error instanceof Error && error.message.startsWith('Cannot load restaurant:')) throw error;
    throw new Error('Cannot load restaurant: the save contains malformed records.');
  }
}
