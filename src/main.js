import './style.css';
import { createGame, dispatch, tick, getStats, getSupplies, getRecipeStatus, serialize, deserialize } from './engine.js';
import { ITEMS, RECIPES, SCENARIOS, INGREDIENTS, TABLEWARE, TASK_GROUPS } from './catalog.js';
import { createScene } from './scene.js';

const SAVE_KEY = 'corner-table.save.v1';
const app = document.querySelector('#app');
const money = (value) => '$' + Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const number = (value) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const iconPaths = {
  build: '<path d="m4 10 8-6 8 6v10H4Z"/><path d="M9 20v-7h6v7M3 10l9-7 9 7"/>',
  menu: '<path d="M5 3v7c0 2 4 2 4 0V3M7 3v18M17 3c-4 5-4 10 0 10v8M17 3v10"/>',
  staff: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v2"/>',
  finance: '<path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7M2 21h20"/>',
  coin: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v4c0 4 16 4 16 0V6M4 10v4c0 4 16 4 16 0v-4M4 14v4c0 4 16 4 16 0v-4"/>',
  goals: '<path d="M5 21V3h14l-2 4 2 4H5"/>',
  save: '<path d="M4 3h14l3 3v15H3V3Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 1 3h4l1-3 3-1 3-2-1-4 1-3-3-2-1-3Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3v3M12 18h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  rotate: '<path d="M20 7a8 8 0 1 0 0 10M20 3v5h-5"/>',
  move: '<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
  trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
  table: '<path d="M3 7h18v5H3ZM6 12v9M18 12v9M12 3v4"/>',
  kitchen: '<path d="M4 3h16v18H4ZM4 9h16M8 13h8v5H8Z"/><circle cx="8" cy="6" r=".5"/><circle cx="16" cy="6" r=".5"/>',
  decor: '<path d="M8 14h8l-1 7H9ZM12 14V5M12 9C4 9 4 2 12 5M12 11c8 0 8-7 0-4"/>',
  floor: '<path d="m12 3 10 6-10 6L2 9Zm-9 10 9 6 9-6M3 17l9 5 9-5"/>',
  toilet: '<path d="M5 3h11v8H5ZM5 12h15a8 8 0 0 1-8 7v3H7v-5M8 7h5"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  clean: '<path d="m14 3-8 11M8 11l7 5-3 6-10-7 6-4M18 4v6M15 7h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  minus: '<path d="M4 12h16"/>',
  expand: '<path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M3 3l6 6M21 3l-6 6M21 21l-6-6M3 21l6-6"/>',
  ingredients: '<path d="M12 7c-6-5-11 1-8 7s5 8 8 6c3 2 6 0 8-6S17 2 12 7ZM12 7V3M12 4c1-3 4-3 6-2-1 3-3 4-6 2"/>',
  tableware: '<ellipse cx="12" cy="12" rx="10" ry="7"/><ellipse cx="12" cy="12" rx="7" ry="4"/>',
  inventory: '<path d="m3 6 9-3 9 3-9 3ZM3 6v13l9 3 9-3V6M12 9v13M7 5l9 3v5"/>',
  calendar: '<path d="M3 5h18v16H3ZM3 10h18M7 2v6M17 2v6M7 14h2M14 14h2M7 18h2"/>',
};
const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.table}</svg>`;
const ui = { panel: null, ingredientsOpen: false, inventoryOpen: false, ingredientStorage: 'shelf', staffTab: 'priorities', recipeId: null, category: 'construction', tool: null, rotation: 0, selected: null, hover: null, view: 'isometric', wallMode: 'full', azimuth: Math.PI * 3 / 4, dirty: true, modal: null, lastSpeed: 1 };
const panKeys = new Set();
let game;
let savedAt = 0;
let lastSaveError = false;
let automaticSaveBlocked = false;
try {
  const saved = localStorage.getItem(SAVE_KEY);
  game = saved !== null ? deserialize(saved) : createGame('sandbox');
  if (!game || typeof game !== 'object' || !Array.isArray(game.objects)) throw new Error('Save does not contain a restaurant.');
} catch {
  game = createGame('sandbox');
  lastSaveError = true;
  automaticSaveBlocked = true;
}

app.innerHTML = `
  <main id="game" aria-label="Corner Table restaurant management game">
    <div id="scene" aria-label="3D restaurant. WASD, Shift-drag or middle-drag to pan, right-drag to orbit, scroll to zoom, click an object to inspect it."></div>
    <header class="topbar">
      <div class="top-stats" role="status" aria-label="Restaurant statistics">
        <button class="stat stat-button reputation-button" data-action="panel" data-panel="goals" title="Guest rating and objectives"><span id="rating" class="reputation-stars" role="img"></span><small>Rating</small></button>
        <div class="stat cash-stat" title="Available funds">${icon('coin')}<strong id="cash"></strong><small>Funds</small></div>
        <div class="stat visitor-stat" title="Guests currently visiting">${icon('staff')}<strong id="guest-count"></strong></div>
        <button class="stat stat-button hygiene-stat" data-action="panel" data-panel="staff" title="Restaurant hygiene">${icon('clean')}<strong id="hygiene"></strong><small>Hygiene</small></button>
      </div>
      <div class="date-group">${icon('calendar')}<strong id="day"></strong></div>
      <div class="restaurant-heading"><button id="restaurant-name" data-action="rename" title="Rename restaurant"></button><span id="restaurant-subtitle"></span></div>
      <div class="time-controls" aria-label="Simulation speed"><button class="icon-button pause-button" data-action="pause" title="Pause or resume (Space)" aria-label="Pause or resume">${icon('pause')}</button>${[1, 2, 3].map((speed) => `<button class="speed-button" data-action="speed" data-speed="${speed}" aria-label="${speed} times speed">${speed}×</button>`).join('')}</div>
      <button class="icon-button help-button" data-action="help" title="How to play (?)" aria-label="How to play">${icon('help')}</button>
      <button class="icon-button" data-action="toggle-inventory" title="Inventory" aria-label="Inventory">${icon('inventory')}</button>
    </header>
    <div class="venue-bar"><button id="open-button" data-action="open" class="status-toggle"></button><span id="service-label"></span></div>
    <aside id="construction-hint" class="construction-hint" role="status" hidden></aside>
    <section id="panel" class="panel" aria-label="Management panel" hidden></section>
    <section id="ingredients-panel" class="supply-window ingredients-panel" aria-label="Ingredients" hidden></section>
    <aside id="inventory-panel" class="supply-window inventory-panel" aria-label="Inventory" hidden></aside>
    <aside id="inspector" class="inspector" aria-label="Selected item" hidden></aside>
    <div id="tool-banner" class="tool-banner" hidden></div>
    <div class="camera-tools" aria-label="Camera controls">
      <button class="icon-button" data-action="rotate-camera" data-direction="-1" title="Rotate camera left (Q)" aria-label="Rotate camera left">${icon('rotate', 'flip')}</button>
      <button class="icon-button" data-action="view" title="Toggle overhead camera" aria-label="Toggle overhead camera">${icon('eye')}</button>
      <button class="wall-mode-button" data-action="wall-mode" title="Change wall visibility" aria-label="Change wall visibility: full walls">${icon('build')}<span id="wall-mode-label">Full walls</span></button>
      <button class="icon-button" data-action="rotate-camera" data-direction="1" title="Rotate camera right (E)" aria-label="Rotate camera right">${icon('rotate')}</button>
      <span></span>
      <button class="icon-button" data-action="zoom" data-direction="1" title="Zoom in" aria-label="Zoom in">${icon('plus')}</button>
      <button class="icon-button" data-action="zoom" data-direction="-1" title="Zoom out" aria-label="Zoom out">${icon('minus')}</button>
    </div>
    <footer class="bottom-bar">
      <nav class="management-nav" aria-label="Manage restaurant">
        ${[['build', 'Build', 'B'], ['menu', 'Menu', 'M'], ['ingredients', 'Ingredients', ''], ['tableware', 'Tableware', ''], ['staff', 'Staff', ''], ['finance', 'Finances', ''], ['goals', 'Goals', '']].map(([key, label, shortcut]) => `<button data-action="${key === 'ingredients' ? 'toggle-ingredients' : 'panel'}" data-panel="${key}" class="nav-button" title="${label}${shortcut ? ` (${shortcut})` : ''}">${icon(key)}<span>${label}</span>${shortcut ? `<kbd>${shortcut}</kbd>` : ''}</button>`).join('')}
      </nav>
      <div class="session-controls"><button class="icon-button" data-action="save" title="Save restaurant" aria-label="Save restaurant">${icon('save')}</button><button class="icon-button" data-action="settings" title="Save, load, or start a new restaurant" aria-label="Game settings">${icon('settings')}</button></div>
    </footer>
    <div class="view-caption"><span id="view-label">Isometric view</span><span class="caption-separator">·</span><span id="hover-label">WASD / Shift-drag to pan · Right-drag to orbit · Scroll to zoom</span></div>
    <div id="toast" role="status" aria-live="polite" hidden></div>
    <div id="modal" class="modal-backdrop" hidden></div>
  </main>`;

let scene;
try {
  scene = createScene(document.querySelector('#scene'), {
    onTileClick: ({ x, z }) => {
      if (ui.modal) return;
      if (ui.tool?.type === 'HIRE') {
        const result = act({ type: 'HIRE', candidateId: ui.tool.candidateId, x, z });
        if (result.ok) { setTool(null); render(); }
      }
      else if (ui.tool?.type === 'MOVE') {
        const id = ui.tool.id;
        const result = act({ type: 'MOVE', id, x, z, rotation: ui.rotation });
        if (result.ok) { setTool(null); ui.selected = id; ui.dirty = true; render(); }
      }
      else if (ui.tool?.type === 'PLACE') {
        const itemType = ui.tool.itemType;
        const result = act({ type: 'PLACE', itemType, x, z, rotation: ui.rotation });
        if (result.ok && !['wall', 'window', 'door'].includes(itemType)) { setTool(null); render(); }
      }
      else if (ui.tool?.type === 'FLOOR') act({ type: 'FLOOR', x, z, style: ui.tool.style });
      else if (ui.tool?.type === 'REMOVE') toast('Click the item you want to remove.');
      else { ui.selected = null; renderInspector(); }
    },
    onTileStroke: ({ cells, axis }) => {
      if (ui.modal || !Array.isArray(cells) || !cells.length) return;
      if (ui.tool?.type === 'FLOOR') act({ type: 'FLOOR_STROKE', cells, style: ui.tool.style });
      else if (ui.tool?.type === 'PLACE' && ['wall', 'window'].includes(ui.tool.itemType)) {
        act({ type: 'STROKE', itemType: ui.tool.itemType, cells, rotation: axis === 'z' ? 90 : 0 });
      }
    },
    onCameraChange: ({ azimuth }) => { if (Number.isFinite(azimuth)) ui.azimuth = azimuth; },
    onObjectClick: (id) => {
      if (ui.modal) return;
      if (ui.tool?.type === 'REMOVE') act({ type: 'REMOVE', id });
      else { ui.inventoryOpen = false; renderInventory(); ui.selected = id; renderInspector(); }
    },
    onHover: (tile) => {
      ui.hover = tile;
      const object = game.objects.find((item) => item.id === tile?.objectId);
      document.querySelector('#hover-label').textContent = tile && ui.tool?.type === 'MOVE' ? `Tile ${tile.x}, ${tile.z} · Click to move here` : object ? `${ITEMS[object.type]?.name || object.type} · Click to inspect` : tile && ui.tool ? `Tile ${tile.x}, ${tile.z} · Click or drag to build` : 'WASD / Shift-drag to pan · Right-drag to orbit · Scroll to zoom';
    },
  });
  scene.update(game);
} catch (error) {
  console.error(error);
  document.querySelector('#scene').innerHTML = `<div class="render-error"><h1>Your table is nearly ready</h1><p>The 3D view could not start. Enable hardware acceleration or try a browser with WebGL support.</p><small>${escapeHtml(error.message)}</small><button onclick="location.reload()">Try again</button></div>`;
}

function act(action, quiet = false) {
  try {
    const result = dispatch(game, action);
    if (!quiet || result?.ok === false) toast(result?.message || (result?.ok === false ? 'That action could not be completed.' : 'Restaurant updated.'), result?.ok === false);
    ui.dirty = true;
    render();
    scene?.update(game);
    return result;
  } catch (error) {
    toast(error.message || 'The restaurant could not be updated.', true);
    return { ok: false, message: error.message };
  }
}

let toastTimer;
function toast(message, error = false) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.className = error ? 'toast-error' : '';
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { element.hidden = true; }, error ? 5500 : 3200);
}

function itemArt(type, color, floorStyle) {
  const ingredientId = type.startsWith('ingredient-') ? type.slice(11) : null;
  const wareId = type.startsWith('ware-') ? type.slice(5) : null;
  const dishId = type.startsWith('dish-') ? type.slice(5) : null;
  const label = type === 'floor' ? (floorStyle || 'peach') + ' floor' : INGREDIENTS[ingredientId]?.name || TABLEWARE[wareId]?.name || RECIPES.find((recipe) => recipe.id === dishId)?.name || ITEMS[type]?.name || type;
  const preview = scene?.thumbnail?.(type, color, floorStyle);
  return preview
    ? '<img class="item-art" src="' + escapeHtml(preview) + '" alt="' + escapeHtml(label) + '" draggable="false" />'
    : '<span class="item-art item-art-empty" role="img" aria-label="' + escapeHtml(label + ' preview unavailable') + '"></span>';
}

function personArt(person) {
  const preview = scene?.personThumbnail?.(person);
  return preview ? `<img class="person-art" src="${escapeHtml(preview)}" alt="${escapeHtml(person.name)}" draggable="false" />` : `<span class="person-art" role="img" aria-label="${escapeHtml(person.name)} portrait unavailable"></span>`;
}

const taskLabel = (group) => ({ serving: 'Serving', cooking: 'Cooking', dishwashing: 'Dishwashing', cleaning: 'Cleaning' })[group];
const prioritySymbol = (priority) => ({ normal: '', high: '▲', off: '×', low: '▼' })[priority];
function priorityButton(staff, group) {
  const priority = staff.priorities[group];
  return `<button class="priority-button priority-${priority}" data-action="priority" data-id="${escapeHtml(staff.id)}" data-group="${group}" aria-label="${escapeHtml(staff.name)} ${taskLabel(group)} priority: ${priority}" title="${taskLabel(group)}: ${priority}. Click for normal → high → off → low.">${prioritySymbol(priority)}</button>`;
}

function skillBars(person) {
  return `<div class="skill-bars">${[['clumsiness', 'Clumsiness'], ['cooking', 'Cooking'], ['speed', 'Speed']].map(([key, label]) => `<div class="skill-row"><span>${label}</span><div class="skill-track" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(person.skills[key] * 100)}"><i style="width:${person.skills[key] * 100}%"></i></div></div>`).join('')}</div>`;
}

function windowHeading(title, closeAction) {
  return `<div class="panel-heading"><span>${title}</span><button class="close-button" data-action="${closeAction}" aria-label="Close ${title}">${icon('close')}</button></div>`;
}

function paintWindow(element, html) {
  if (element.innerHTML === html) return;
  const positions = [...element.querySelectorAll('.panel-body, .ingredient-list, .dish-grid, .staff-list')].map((node) => node.scrollTop);
  element.innerHTML = html;
  [...element.querySelectorAll('.panel-body, .ingredient-list, .dish-grid, .staff-list')].forEach((node, index) => { node.scrollTop = positions[index] || 0; });
}

function deliveryStatus(delivery, cost, label) {
  const progress = Math.max(0, Math.min(1, delivery.progress));
  const status = delivery.status === 'idle' ? 'No delivery scheduled' : delivery.status === 'blocked' ? 'Delivery blocked' : delivery.status === 'due' ? 'Delivery due' : 'Next delivery';
  return `<div class="delivery-status ${delivery.status === 'blocked' ? 'blocked' : ''}"><div class="delivery-summary"><span>${label || status}${delivery.nextDay ? ` · Day ${delivery.nextDay}` : ''}</span>${cost !== undefined ? `<strong>${money(cost)}</strong>` : `<small>${status}</small>`}</div><div class="delivery-track" role="progressbar" aria-label="${label || 'Delivery'} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress * 100)}"><i style="width:${progress * 100}%"></i></div>${delivery.blockedReason ? `<p class="blocked-reason">${escapeHtml(delivery.blockedReason)}</p>` : ''}</div>`;
}

function renderIngredients(supplies) {
  const panel = document.querySelector('#ingredients-panel');
  panel.hidden = !ui.ingredientsOpen;
  if (!ui.ingredientsOpen) return;
  supplies ||= getSupplies(game);
  const rows = supplies.ingredients.filter((row) => row.storageKind === ui.ingredientStorage);
  paintWindow(panel, windowHeading('Ingredients', 'toggle-ingredients') + `<div class="supply-body"><label class="storage-selector"><span class="sr-only">Ingredient storage</span><select id="ingredient-storage" aria-label="Ingredient storage"><option value="shelf" ${ui.ingredientStorage === 'shelf' ? 'selected' : ''}>Shelf</option><option value="fridge" ${ui.ingredientStorage === 'fridge' ? 'selected' : ''}>Fridge</option></select></label><div class="ingredient-list">${rows.map((row) => `<article class="ingredient-row" title="${escapeHtml(row.blockedReason || `${row.onHand} on hand · ${row.storageFree} free storage units`)}"><div class="ingredient-label">${itemArt('ingredient-' + row.id)}<strong>${escapeHtml(row.name)}</strong><small>${money(row.unitPrice)}</small></div><div class="quantity-controls"><button data-action="ingredient-batch" data-id="${row.id}" data-delta="-1" aria-label="Decrease ${escapeHtml(row.name)} batch" ${row.batchQuantity <= 0 ? 'disabled' : ''}>−</button><output aria-label="${escapeHtml(row.name)} delivery batch">${row.batchQuantity}</output><button data-action="ingredient-batch" data-id="${row.id}" data-delta="1" aria-label="Increase ${escapeHtml(row.name)} batch" ${!row.storageAvailable || row.batchQuantity >= row.batchLimit ? 'disabled' : ''}>+</button></div></article>`).join('')}</div><p class="supply-note">Quantities are recurring batches. Payment is taken when goods arrive.</p>${deliveryStatus(supplies.deliveries.ingredient, supplies.deliveries.ingredient.scheduledCost)}</div>`);
}

function renderInventory(supplies) {
  const panel = document.querySelector('#inventory-panel');
  panel.hidden = !ui.inventoryOpen;
  if (!ui.inventoryOpen) return;
  supplies ||= getSupplies(game);
  paintWindow(panel, windowHeading('Inventory', 'toggle-inventory') + `<div class="supply-body"><h3 class="inventory-label">Ingredients on hand</h3><div class="stock-grid">${supplies.ingredients.map((row) => `<div class="stock-count ${row.onHand === 0 ? 'empty' : ''}" title="${escapeHtml(row.name)}: ${row.onHand} on hand, ${row.usable} usable">${itemArt('ingredient-' + row.id)}<strong>${row.onHand}</strong></div>`).join('')}</div><h3 class="inventory-label">Clean tableware</h3><div class="stock-grid">${supplies.tableware.map((row) => `<div class="stock-count ${row.clean === 0 ? 'empty' : ''}" title="${escapeHtml(row.name)}: ${row.clean} clean, ${row.usable} usable, ${row.inUse} in use, ${row.dirty} dirty, ${row.returning} returning, ${row.queued} pending">${itemArt('ware-' + row.id)}<strong>${row.clean}</strong></div>`).join('')}</div></div>`);
}

function renderTableware() {
  const supplies = getSupplies(game);
  return `<div class="tableware-grid">${supplies.tableware.map((row) => `<article class="tableware-card"><h3>${escapeHtml(row.name)}</h3>${itemArt('ware-' + row.id)}<strong>${money(row.unitPrice)}</strong><div class="quantity-controls"><button data-action="tableware-order" data-id="${row.id}" data-delta="-1" aria-label="Cancel pending ${escapeHtml(row.name)}" ${!row.canCancel ? 'disabled' : ''}>−</button><button data-action="tableware-order" data-id="${row.id}" data-delta="1" aria-label="Order ${escapeHtml(row.name)}" ${!row.canAdd ? 'disabled' : ''} title="Prepay ${money(row.unitPrice)}; requires an available cabinet slot">+</button></div><small>${row.clean} clean · ${row.queued} pending</small></article>`).join('')}</div><div class="tableware-queue" aria-label="Pending tableware">${supplies.tableware.filter((row) => row.queued > 0).map((row) => `<span>${itemArt('ware-' + row.id)}<strong>${row.queued}</strong></span>`).join('') || '<span>No pending tableware</span>'}</div>${deliveryStatus(supplies.deliveries.tableware, undefined, 'Tableware delivery')}<p class="supply-note">Plus prepays ${money(15)} per item. Minus refunds pending items only. Delivered tableware is reusable.</p>`;
}

function renderMenu() {
  const statuses = getRecipeStatus(game);
  const recipe = RECIPES.find((entry) => entry.id === ui.recipeId) || RECIPES[0];
  ui.recipeId = recipe.id;
  const status = statuses.find((entry) => entry.recipeId === recipe.id);
  const menuEntry = game.menu.find((entry) => entry.recipeId === recipe.id);
  return `<div class="menu-layout"><div class="dish-grid" aria-label="Recipes">${RECIPES.map((dish) => {
    const row = statuses.find((entry) => entry.recipeId === dish.id);
    const price = game.menu.find((entry) => entry.recipeId === dish.id).price;
    return `<button class="dish-card ${ui.recipeId === dish.id ? 'selected' : ''} ${row.enabled ? 'enabled' : ''} ${!row.unlocked ? 'locked' : ''}" data-action="select-recipe" data-id="${dish.id}" aria-label="Select ${escapeHtml(dish.name)}" title="${escapeHtml(dish.name)} · ${row.enabled ? 'On menu' : row.status}">${itemArt('dish-' + dish.id)}<strong>${money(price)}</strong><small>${escapeHtml(dish.name)}</small>${row.enabled ? '<span class="on-menu-mark">✓</span>' : ''}</button>`;
  }).join('')}</div><article class="dish-detail"><h2>${escapeHtml(recipe.name)}</h2>${itemArt('dish-' + recipe.id)}<button class="menu-toggle ${status.enabled ? 'remove' : ''}" data-action="recipe" data-recipe="${recipe.id}" aria-label="${status.enabled ? 'Remove' : 'Add'} ${escapeHtml(recipe.name)} ${status.enabled ? 'from' : 'to'} menu" ${!status.enabled && !status.canEnable ? 'disabled' : ''}>${status.enabled ? 'Remove from menu' : 'Add to menu'}</button><div class="dish-price"><button data-action="recipe-price" data-id="${recipe.id}" data-delta="-1" aria-label="Decrease ${escapeHtml(recipe.name)} price">−</button><label><span class="sr-only">${escapeHtml(recipe.name)} price</span><input type="number" aria-label="${escapeHtml(recipe.name)} price" data-price="${recipe.id}" min="1" max="150" step="1" value="${menuEntry.price}" /></label><button data-action="recipe-price" data-id="${recipe.id}" data-delta="1" aria-label="Increase ${escapeHtml(recipe.name)} price">+</button></div>${[['equipment', 'Equipment'], ['ingredient', 'Ingredients'], ['tableware', 'Tableware']].map(([kind, title]) => `<section class="requirement-section"><h3>${title}</h3><div class="requirement-cards">${status.requirements.filter((requirement) => requirement.kind === kind).map((requirement) => `<div class="requirement-card ${requirement.met ? '' : 'missing'}" title="${escapeHtml(requirement.reason || requirement.label)}" aria-label="${escapeHtml(requirement.label)}: ${requirement.available} available, ${requirement.required} required">${itemArt(kind === 'ingredient' ? 'ingredient-' + requirement.id : kind === 'tableware' ? 'ware-' + requirement.id : requirement.id)}<small>${requirement.available}/${requirement.required}</small></div>`).join('')}</div></section>`).join('')}<p class="recipe-status ${status.canPrepare ? 'ready' : 'shortage'}">${!status.unlocked ? `Serve ${recipe.unlock} guests to unlock this recipe.` : status.canPrepare ? 'Ready to prepare.' : escapeHtml(status.missing.map((requirement) => requirement.reason || requirement.label).join(' · '))}${status.enabled && !status.canPrepare ? '<br>Still on the menu. Orders wait until supplies are ready.' : ''}</p></article></div>`;
}

function renderStaff() {
  const stats = getStats(game);
  const tabs = `<div class="staff-tabs" role="tablist" aria-label="Employee management"><button role="tab" aria-selected="${ui.staffTab === 'priorities'}" data-action="staff-tab" data-tab="priorities">Priorities</button><button role="tab" aria-selected="${ui.staffTab === 'hire'}" data-action="staff-tab" data-tab="hire">Hire employees</button></div>`;
  if (ui.staffTab === 'hire') return tabs + `<div class="candidate-grid">${game.candidates.map((candidate) => `<article class="candidate-card">${personArt(candidate)}<h3>${escapeHtml(candidate.name)}</h3><strong>${money(candidate.monthlyWage)} / month</strong>${skillBars(candidate)}<button data-action="hire-candidate" data-id="${candidate.id}" aria-label="Hire ${escapeHtml(candidate.name)}">Hire</button></article>`).join('')}</div><p class="supply-note">Choose an employee, then click a clear floor tile to place them. Wages accrue through the month.</p>`;
  return tabs + `<div class="priorities-table"><div class="priority-head"><span>Employee</span>${TASK_GROUPS.map((group) => `<span>${taskLabel(group)}</span>`).join('')}<span></span></div><div class="staff-list">${game.staff.map((staff) => `<div class="priority-row"><div class="employee-label">${personArt(staff)}<span><strong>${escapeHtml(staff.name)}</strong><small>${money(staff.monthlyWage)} / month</small><small>${escapeHtml(staff.blockedReason || staff.task)}</small></span></div>${TASK_GROUPS.map((group) => priorityButton(staff, group)).join('')}<button class="icon-button subtle" data-action="fire" data-id="${staff.id}" aria-label="Dismiss ${escapeHtml(staff.name)}" title="Dismiss employee">${icon('close')}</button></div>`).join('') || '<p class="empty-state">No employees. Open Hire employees to meet the candidates.</p>'}</div></div><p class="supply-note">Click a square to cycle normal → high ▲ → off × → low ▼. Employees choose available jobs in priority order.</p><div class="payroll-summary"><span>Monthly wages <strong>${money(stats.monthlyWages)}</strong></span><span>Accrued this month <strong>${money(stats.wagesAccrued)}</strong></span></div>`;
}

const categories = [
  { id: 'dining', name: 'Dining', icon: 'table', match: /dining|furniture|seating/ },
  { id: 'kitchen', name: 'Kitchen', icon: 'kitchen', match: /kitchen|appliance|storage/ },
  { id: 'construction', name: 'Build', icon: 'build', match: /building|construction|wall|structure/ },
  { id: 'decor', name: 'Decor', icon: 'decor', match: /decor|decoration/ },
  { id: 'utility', name: 'Facilities', icon: 'toilet', match: /utility|facilit|sanit|hygiene|restroom/ },
  { id: 'floors', name: 'Floors', icon: 'floor', match: /floor/ },
];

function classify(type, item) {
  if (/floor/.test(type)) return 'floors';
  if (/wall|door|window|fence/.test(type)) return 'construction';
  if (/toilet|sink|clean|broom|bin|trash/.test(type) && !/kitchen/.test(item.category || '')) return 'utility';
  return categories.find((category) => category.match.test(String(item.category || '').toLowerCase()))?.id || (/plant|flower|painting|clock|lamp/.test(type) ? 'decor' : /table|chair|bench/.test(type) ? 'dining' : 'kitchen');
}

function setPanel(panel) {
  ui.panel = ui.panel === panel ? null : panel;
  ui.dirty = true;
  if (ui.panel && ui.panel !== 'build') setTool(null);
  render();
}

function setTool(tool) {
  ui.tool = tool;
  ui.selected = null;
  scene?.setTool(tool);
  scene?.setRotation(ui.rotation);
  document.querySelector('#scene').classList.toggle('placing', Boolean(tool));
  renderToolBanner();
  renderInspector();
  ui.dirty = true;
}

function chooseTool(tool) {
  setTool(tool);
  if (window.matchMedia('(max-width: 620px)').matches) ui.panel = null;
  render();
}

function buildPrice(type, item) {
  const usedDoorGrant = game.doorGrantUsed ?? game.objects.some((object) => object.type === 'door');
  return type === 'door' && !usedDoorGrant ? 0 : item.cost;
}

function renderToolBanner() {
  const banner = document.querySelector('#tool-banner');
  banner.hidden = !ui.tool;
  banner.setAttribute('aria-label', ui.tool?.type === 'MOVE' ? 'Moving item' : 'Construction tool');
  if (!ui.tool) return;
  const moving = ui.tool.type === 'MOVE';
  const name = ui.tool.type === 'HIRE' ? `Place ${ui.tool.candidate.name}` : ui.tool.type === 'REMOVE' ? 'Remove item' : ui.tool.type === 'FLOOR' ? `${ui.tool.style} floor` : `${moving ? 'Move ' : ''}${ITEMS[ui.tool.itemType]?.name || ui.tool.itemType}`;
  const drawing = ui.tool.type === 'FLOOR' || (ui.tool.type === 'PLACE' && ['wall', 'window'].includes(ui.tool.itemType));
  const supported = ['cuttingboard', 'fryer'].includes(ui.tool.itemType);
  const hint = ui.tool.type === 'HIRE' ? `${money(ui.tool.candidate.monthlyWage)} / month · Click clear owned ground` : ui.tool.type === 'REMOVE' ? 'Click an item to remove · 60% refund' : drawing ? 'Drag a straight line or click a tile' : supported ? `Click an empty cabinet · Follows cabinet rotation${moving ? ' · Esc to cancel' : ''}` : moving ? 'Click a destination · R to rotate · Esc to cancel' : 'Click owned ground to place · R to rotate';
  banner.innerHTML = `${icon(moving ? 'move' : ui.tool.type === 'REMOVE' ? 'trash' : 'build')}<span><strong>${escapeHtml(name)}</strong><small>${hint}</small></span><button data-action="show-build" title="Open construction catalog">${icon('build')}<span>Catalog</span></button>${['PLACE', 'MOVE'].includes(ui.tool.type) && !supported ? `<button data-action="rotate-item" title="Rotate item (R)">${icon('rotate')}<span>${ui.rotation}°</span></button>` : ''}<button class="icon-button" data-action="cancel" title="Cancel (Esc)" aria-label="${moving ? 'Cancel move' : 'Cancel building'}">${icon('close')}</button>`;
}

function renderPanel() {
  const panel = document.querySelector('#panel');
  panel.hidden = !ui.panel;
  if (!ui.panel) return;
  const titles = { build: ui.category === 'construction' ? 'Construction' : categories.find((category) => category.id === ui.category)?.name || 'Construction', menu: 'Menu', staff: 'Employees', finance: 'Finances', goals: 'Scenario goals', tableware: 'Tableware' };
  const heading = `<div class="panel-heading"><span>${icon(ui.panel)}${titles[ui.panel]}</span><button class="close-button" data-action="close-panel" aria-label="Close management panel">${icon('close')}</button></div>`;
  panel.className = `panel panel-${ui.panel}`;
  let content = '';
  if (ui.panel === 'build') {
    const entries = Object.entries(ITEMS).filter(([type, item]) => classify(type, item) === ui.category);
    content = `<div class="category-tabs" role="tablist" aria-label="Build categories">${categories.map((category) => `<button role="tab" aria-selected="${ui.category === category.id}" class="${ui.category === category.id ? 'active' : ''}" data-action="category" data-category="${category.id}" title="${category.name}">${icon(category.icon)}<span>${category.name}</span></button>`).join('')}</div><div class="palette-caption"><span>${categories.find((category) => category.id === ui.category)?.name}</span><span>${ui.category === 'floors' ? 'Drag or click to paint' : 'Choose an item'}</span></div><div class="item-grid">${ui.category === 'floors' ? ['peach', 'wood', 'tile', 'stone', 'checker'].map((style) => `<button class="item-card ${ui.tool?.style === style ? 'selected' : ''}" data-action="floor" data-style="${style}" title="${style} floor · Drag a line or click to paint" aria-label="Build ${style} floor">${itemArt('floor', undefined, style)}<span class="item-price">$12</span><span class="item-name">${style}</span></button>`).join('') : entries.map(([type, item]) => `<button class="item-card ${ui.tool?.itemType === type ? 'selected' : ''}" data-action="item" data-item="${escapeHtml(type)}" title="${escapeHtml(item.name)} · ${money(buildPrice(type, item))}${item.description ? ` · ${escapeHtml(item.description)}` : ''}" aria-label="Build ${escapeHtml(item.name)}, ${money(buildPrice(type, item))}">${itemArt(type)}<span class="item-price">${money(buildPrice(type, item))}</span><span class="item-name">${escapeHtml(item.name)}</span></button>`).join('')}</div><div class="palette-footer"><button data-action="demolish" class="text-button ${ui.tool?.type === 'REMOVE' ? 'active' : ''}">${icon('trash')}Remove <kbd>Del</kbd></button><button data-action="expand" class="text-button" title="Buy a larger plot of land">${icon('expand')}Buy land</button></div>`;
  } else if (ui.panel === 'menu') {
    content = renderMenu();
  } else if (ui.panel === 'staff') {
    content = renderStaff();
  } else if (ui.panel === 'tableware') {
    content = renderTableware();
  } else if (ui.panel === 'finance') {
    const stats = getStats(game);
    const history = game.history || game.finances || [];
    content = `<div class="panel-intro"><h2>Every little table counts.</h2><p>Keep your menu profitable and invest in a restaurant your neighbors will return to.</p></div><div class="finance-hero"><small>AVAILABLE FUNDS</small><strong>${money(game.cash)}</strong><span>${escapeHtml(stats.calendar.label)} · ${game.open ? 'Trading' : 'Closed'}</span></div><div class="finance-grid"><div><small>Total sales</small><strong class="positive">${money(stats.revenue)}</strong></div><div><small>Total expenses</small><strong>${money(stats.expenses)}</strong></div><div><small>Net result</small><strong class="${stats.revenue >= stats.expenses ? 'positive' : ''}">${money((stats.revenue || 0) - (stats.expenses || 0))}</strong></div><div><small>Guests served</small><strong>${number(stats.served)}</strong></div><div><small>Monthly wages</small><strong>${money(stats.monthlyWages)}</strong></div><div><small>Accrued wages</small><strong>${money(stats.wagesAccrued)}</strong></div></div><h3 class="section-label">RECENT ACTIVITY</h3><div class="activity-list">${history.length ? history.slice(-8).reverse().map((entry) => `<div><span>Day ${entry.day || game.day}</span><strong>${money(entry.revenue ?? entry.income)}</strong><small>Expenses ${money(entry.expenses ?? entry.cost)}</small></div>`).join('') : (game.events || []).slice(0, 7).map((event) => `<p>${escapeHtml(event.text || event.message)}</p>`).join('') || '<p>Your first day is just beginning.</p>'}</div>`;
  } else if (ui.panel === 'goals') {
    const scenario = game.scenario;
    content = `<div class="panel-intro"><h2>${escapeHtml(scenario?.title || 'Make yourself at home.')}</h2><p>${escapeHtml(scenario?.description || 'Start small. Cook something lovely. Build a place the neighborhood loves.')}</p></div>${renderGoals()}<div class="scenario-heading"><h3 class="section-label">A NEW CHALLENGE</h3><p>Choose a brief for your restaurant.</p></div><div class="scenario-list">${SCENARIOS.map((scenario, index) => `<button data-action="scenario" data-id="${escapeHtml(scenario.id)}" class="scenario-card ${game.scenario?.id === scenario.id ? 'current' : ''}"><span class="scenario-number">0${index + 1}</span><span><strong>${escapeHtml(scenario.title || scenario.name)}</strong><small>${escapeHtml(scenario.description || 'A new restaurant challenge.')}</small></span>${icon('arrow')}</button>`).join('')}</div>`;
  }
  paintWindow(panel, heading + `<div class="panel-body">${content}</div>`);
}

function goalValue(goal) {
  const stats = getStats(game) || {};
  const metric = goal.stat || goal.metric || goal.key || goal.type;
  return Number(goal.current ?? goal.progress ?? goal.value ?? stats[metric] ?? game.stats?.[metric] ?? game[metric] ?? 0);
}

function renderGoals(compact = false) {
  const goals = getStats(game).scenarioProgress || game.scenario?.goals || [];
  const fallback = [
    { label: 'Serve 25 guests', current: game.stats?.served || 0, target: 25 },
    { stat: 'rating', label: 'Earn a 4-star reputation', current: game.stats?.rating || 0, target: 4 },
    { label: 'Keep hygiene above 85%', current: game.stats?.cleanliness || 0, target: 85 },
  ];
  return `<div class="goal-list ${compact ? 'compact' : ''}">${(goals.length ? goals : fallback).map((goal) => {
    const current = goalValue(goal);
    const target = Number(goal.target || goal.value || 1);
    const percent = Math.min(100, Math.max(0, current / target * 100));
    const isRating = (goal.stat || goal.metric) === 'rating';
    const currentLabel = isRating ? current.toFixed(1) : number(current);
    const targetLabel = isRating ? target.toLocaleString('en-US', { maximumFractionDigits: 1 }) : number(target);
    return `<div class="goal ${goal.complete || percent >= 100 ? 'complete' : ''}"><span class="goal-check">${goal.complete || percent >= 100 ? '✓' : ''}</span><div><span>${escapeHtml(goal.label || goal.description || goal.title || `Reach ${target} ${goal.metric || ''}`)}</span><div class="progress-track"><i style="width:${percent}%"></i></div></div><small>${currentLabel}<span> / ${targetLabel}</span></small></div>`;
  }).join('')}</div>`;
}

function renderConstructionHint() {
  const hint = document.querySelector('#construction-hint');
  const stats = getStats(game);
  const needsRoom = !stats.hasUsableSeating && stats.hasRoom === false;
  const needsEntrance = !stats.hasUsableSeating && stats.hasRoom === true && stats.hasEntrance === false;
  hint.hidden = !needsRoom && !needsEntrance;
  hint.innerHTML = needsRoom
    ? '<strong>Build an enclosed room</strong><span>Choose walls in Construction and drag four sides. An enclosed room receives peach flooring automatically.</span>'
    : needsEntrance
      ? '<strong>Add an entrance</strong><span>Choose a doorway and place it on a boundary wall.' + (!game.doorGrantUsed ? ' Your first doorway is free.' : '') + '</span>'
      : '';
}

function renderInspector() {
  const inspector = document.querySelector('#inspector');
  const object = game.objects.find((item) => item.id === ui.selected);
  const staff = game.staff.find((person) => person.id === ui.selected);
  const guest = game.guests.find((person) => person.id === ui.selected);
  inspector.hidden = !object && !staff && !guest;
  if (!object && (staff || guest)) {
    const person = staff || guest;
    inspector.innerHTML = `<div class="panel-heading"><span>${escapeHtml(person.name)}</span><button class="close-button" data-action="close-inspector" aria-label="Close person details">${icon('close')}</button></div><div class="inspector-preview">${personArt(person)}</div><div class="inspector-content"><small>${staff ? 'EMPLOYEE' : 'GUEST'}</small><p>${escapeHtml(person.blockedReason || person.task || person.state || 'Enjoying the restaurant')}</p>${staff ? `<div class="inspector-priorities">${TASK_GROUPS.map((group) => `<label>${taskLabel(group)}${priorityButton(staff, group)}</label>`).join('')}</div>${skillBars(staff)}<div class="person-metrics"><span>Monthly wage<strong>${money(staff.monthlyWage)}</strong></span><span>Accrued<strong>${money(staff.wageAccrued)}</strong></span></div><button class="danger-button" data-action="fire" data-id="${escapeHtml(staff.id)}">Dismiss employee</button>` : `<div class="person-metrics"><span>Happiness<strong>${Math.round(guest.happiness || 0)}%</strong></span><span>Patience<strong>${Math.round(guest.patience || 0)}%</strong></span></div>`}</div>`;
    return;
  }
  if (!object) return;
  const item = ITEMS[object.type] || {};
  const storage = getSupplies(game).storage.find((entry) => entry.id === object.id);
  const stock = storage ? `<div class="storage-summary"><strong>Storage ${storage.used} / ${storage.capacity}</strong><span>${storage.reserved} reserved</span>${storage.contents.map((entry) => `<small>${escapeHtml(INGREDIENTS[entry.id]?.name || TABLEWARE[entry.id]?.name || entry.id)} × ${entry.quantity}</small>`).join('')}</div>` : '';
  inspector.innerHTML = `<div class="panel-heading"><span>${escapeHtml(item.name || object.type)}</span><button class="close-button" data-action="close-inspector" aria-label="Close item details">${icon('close')}</button></div><div class="inspector-preview">${itemArt(object.type, object.color)}</div><div class="inspector-content"><small>TILE ${object.x}, ${object.z} · ${object.rotation || 0}°</small><p>${escapeHtml(item.description || 'Keep a clear route to this item for your employees and guests.')}</p>${stock}<button class="move-button" data-action="move-selected" aria-label="Move item">${icon('move')}Move</button><button class="danger-button" data-action="remove-selected">${icon('trash')}Remove · ${money(Math.round((object.purchaseCost ?? item.cost ?? 0) * .6))} refund</button></div>`;
}

function renderReputation(value) {
  const rating = document.querySelector('#rating');
  if (rating.dataset.value === value.toFixed(2)) return;
  rating.dataset.value = value.toFixed(2);
  rating.setAttribute('aria-label', `Guest rating ${value.toFixed(1)} out of 5`);
  rating.innerHTML = Array.from({ length: 5 }, (_, index) => `<span class="reputation-star"><span>★</span><i style="width:${Math.max(0, Math.min(1, value - index)) * 100}%">★</i></span>`).join('');
}

function render() {
  const stats = getStats(game);
  document.querySelector('#restaurant-name').textContent = game.name || 'The Corner Table';
  document.querySelector('#cash').textContent = number(game.cash);
  document.querySelector('#cash').classList.toggle('negative', game.cash < 0);
  renderReputation(stats.rating);
  document.querySelector('#hygiene').textContent = `${Math.round(stats.cleanliness ?? 100)}%`;
  document.querySelector('#day').textContent = stats.calendar.label;
  const open = document.querySelector('#open-button');
  open.innerHTML = `<i class="${game.open ? 'open' : ''}"></i>${game.open ? 'OPEN FOR BUSINESS' : 'CLOSED'}<span>${game.open ? 'Close' : 'Open'}</span>`;
  document.querySelector('#guest-count').textContent = `${game.guests.length}`;
  document.querySelector('#service-label').textContent = game.speed === 0 ? 'PAUSED' : game.open ? 'SERVICE IN PROGRESS' : 'TIME TO MAKE IT YOURS';
  document.querySelector('#service-label').classList.toggle('paused', game.speed === 0);
  document.querySelector('#restaurant-subtitle').textContent = game.scenario?.title ? `${game.scenario.title} · ${game.scenario.id === 'sandbox' ? 'Free play' : game.scenario.complete ? 'Challenge complete' : 'Challenge in progress'}` : 'A little place. A big possibility.';
  for (const button of document.querySelectorAll('.nav-button')) button.classList.toggle('active', button.dataset.panel === 'ingredients' ? ui.ingredientsOpen : button.dataset.panel === ui.panel);
  for (const button of document.querySelectorAll('.speed-button')) button.classList.toggle('active', Number(button.dataset.speed) === game.speed);
  const pause = document.querySelector('.pause-button');
  pause.innerHTML = icon(game.speed === 0 ? 'play' : 'pause');
  pause.classList.toggle('active', game.speed === 0);
  document.querySelector('#view-label').textContent = ui.view === 'top' ? 'Floor plan' : 'Isometric view';
  if (ui.dirty) {
    renderPanel();
    renderInspector();
    renderToolBanner();
    renderConstructionHint();
    const supplies = ui.ingredientsOpen || ui.inventoryOpen ? getSupplies(game) : undefined;
    renderIngredients(supplies);
    renderInventory(supplies);
    ui.dirty = false;
  }
}

function save(silent = false) {
  if (silent && automaticSaveBlocked) return false;
  try {
    localStorage.setItem(SAVE_KEY, serialize(game));
    automaticSaveBlocked = false;
    savedAt = Date.now();
    if (!silent) toast('Restaurant saved on this browser.');
    return true;
  } catch {
    if (!silent) toast('Could not save. Your browser may have disabled local storage.', true);
    return false;
  }
}

function showModal(type) {
  panKeys.clear();
  ui.modal = type;
  const modal = document.querySelector('#modal');
  modal.hidden = false;
  const close = `<button class="modal-close icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button>`;
  let content;
  if (type === 'help') content = `<span class="eyebrow">WELCOME TO CORNER TABLE</span><h2>A restaurant of your own.</h2><p>Make a welcoming room, put good food on the menu, and take care of the people in it.</p><div class="help-grid"><div>${icon('build')}<strong>Build your space</strong><p>Furnish clear owned ground outdoors, or enclose a room with walls for automatic peach flooring. Click an existing item and choose Move to rearrange it without repurchasing.</p></div><div>${icon('menu')}<strong>Make a menu</strong><p>Select a dish, check its equipment, ingredients and tableware, then add it to the menu. Enabled dishes wait for supplies when stock runs out.</p></div><div>${icon('staff')}<strong>Find your people</strong><p>Compare three candidates and place an employee on clear owned ground. Set serving, cooking, dishwashing and cleaning priorities independently; wages are monthly.</p></div><div>${icon('star')}<strong>Keep supplies moving</strong><p>Order recurring ingredient batches and prepaid tableware. Used dishes need a sink, cabinet space and an employee with dishwashing enabled to return clean.</p></div></div><div class="shortcut-list"><span><kbd>WASD</kbd> Pan camera</span><span><kbd>Shift-drag</kbd> Pan camera</span><span><kbd>Right-drag</kbd> Orbit camera</span><span><kbd>Scroll</kbd> Zoom</span><span><kbd>Q</kbd><kbd>E</kbd> Rotate camera</span><span><kbd>R</kbd> Rotate item</span><span><kbd>Space</kbd> Pause</span><span><kbd>Esc</kbd> Cancel</span><span><kbd>B</kbd> Build</span><span><kbd>M</kbd> Menu</span><span><kbd>Delete</kbd> Remove</span><span>Wall button: full / cutaway / low</span></div><button class="primary-button" data-action="close-modal">Let's make something good ${icon('arrow')}</button>`;
  else if (type === 'new') content = `<span class="eyebrow">A FRESH START</span><h2>Your next great little place.</h2><p>Choose how to begin. A new restaurant replaces the current restaurant and its browser save.</p><label class="field-label">Restaurant name<input id="new-name" maxlength="40" value="The Corner Table" /></label><div class="new-game-options"><button data-action="start-game" data-mode="sandbox">${icon('table')}<strong>The neighborhood bistro</strong><span>A furnished restaurant and a small team. Jump straight into service.</span>${icon('arrow')}</button><button data-action="start-game" data-mode="empty">${icon('build')}<strong>A blank canvas</strong><span>An empty plot and a starting budget. Build every corner yourself.</span>${icon('arrow')}</button></div>`;
  else if (type === 'rename') content = `<span class="eyebrow">MAKE IT YOURS</span><h2>A name above the door.</h2><form id="rename-form"><label class="field-label">Restaurant name<input id="rename-name" maxlength="40" required value="${escapeHtml(game.name)}" /></label><button class="primary-button" type="submit">Save name ${icon('arrow')}</button></form>`;
  else content = `<span class="eyebrow">TAKE A LITTLE BREAK</span><h2>The Corner Table</h2><p>${automaticSaveBlocked ? 'Your previous save could not be loaded and is kept untouched. Choose Save or New Restaurant to replace it when you are ready.' : 'Your restaurant is saved automatically on this browser every 30 seconds.'}</p><div class="settings-actions"><button data-action="save">${icon('save')}Save restaurant<span>Save the current service</span></button><button data-action="load">${icon('clock')}Load saved restaurant<span>Return to your most recent save</span></button><button data-action="new-game">${icon('plus')}New restaurant<span>Start with a bistro or a blank plot</span></button><button data-action="help">${icon('help')}How to play<span>Controls and a few helpful tips</span></button></div><p class="settings-note">${savedAt ? `Last saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `Browser save · Version ${game.version}`} · Made for a good little service.</p>`;
  modal.innerHTML = `<section class="modal-card ${type === 'help' ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${type === 'help' ? 'How to play' : type === 'new' ? 'New restaurant' : type === 'rename' ? 'Rename restaurant' : 'Game settings'}">${close}${content}</section>`;
  modal.querySelector('input, button')?.focus();
}

function closeModal() {
  ui.modal = null;
  document.querySelector('#modal').hidden = true;
}

function pause() {
  if (game.speed > 0) ui.lastSpeed = game.speed;
  act({ type: 'SPEED', speed: game.speed === 0 ? ui.lastSpeed || 1 : 0 }, true);
}

app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action } = button.dataset;
  if (action === 'panel') setPanel(button.dataset.panel);
  else if (action === 'toggle-ingredients') { ui.ingredientsOpen = !ui.ingredientsOpen; ui.dirty = true; render(); }
  else if (action === 'toggle-inventory') { ui.inventoryOpen = !ui.inventoryOpen; if (ui.inventoryOpen) ui.selected = null; ui.dirty = true; render(); }
  else if (action === 'close-panel') { ui.panel = null; ui.dirty = true; render(); }
  else if (action === 'show-build') { ui.panel = 'build'; ui.dirty = true; render(); }
  else if (action === 'category') { ui.category = button.dataset.category; ui.dirty = true; render(); }
  else if (action === 'item') chooseTool({ type: 'PLACE', itemType: button.dataset.item });
  else if (action === 'floor') chooseTool({ type: 'FLOOR', style: button.dataset.style });
  else if (action === 'demolish') chooseTool({ type: 'REMOVE' });
  else if (action === 'cancel') { setTool(null); render(); }
  else if (action === 'rotate-item') { ui.rotation = (ui.rotation + 90) % 360; scene?.setRotation(ui.rotation); renderToolBanner(); }
  else if (action === 'expand') act({ type: 'EXPAND' });
  else if (action === 'open') act({ type: 'TOGGLE_OPEN' });
  else if (action === 'pause') pause();
  else if (action === 'speed') act({ type: 'SPEED', speed: Number(button.dataset.speed) }, true);
  else if (action === 'staff-tab') { ui.staffTab = button.dataset.tab; ui.dirty = true; render(); }
  else if (action === 'hire-candidate') {
    const candidate = game.candidates.find((entry) => entry.id === button.dataset.id);
    ui.panel = null;
    chooseTool({ type: 'HIRE', candidateId: candidate.id, candidate });
  }
  else if (action === 'priority') act({ type: 'PRIORITY', id: button.dataset.id, taskGroup: button.dataset.group });
  else if (action === 'ingredient-batch') {
    const row = getSupplies(game).ingredients.find((entry) => entry.id === button.dataset.id);
    act({ type: 'INGREDIENT_BATCH', ingredientId: row.id, quantity: row.batchQuantity + Number(button.dataset.delta) });
  }
  else if (action === 'tableware-order') act({ type: 'TABLEWARE_ORDER', tablewareId: button.dataset.id, delta: Number(button.dataset.delta) });
  else if (action === 'fire') act({ type: 'FIRE', id: button.dataset.id });
  else if (action === 'recipe') act({ type: 'TOGGLE_RECIPE', recipeId: button.dataset.recipe });
  else if (action === 'select-recipe') { ui.recipeId = button.dataset.id; ui.dirty = true; render(); }
  else if (action === 'recipe-price') {
    const entry = game.menu.find((row) => row.recipeId === button.dataset.id);
    act({ type: 'PRICE', recipeId: entry.recipeId, price: entry.price + Number(button.dataset.delta) });
  }
  else if (action === 'scenario') act({ type: 'SCENARIO', id: button.dataset.id });
  else if (action === 'move-selected') {
    const object = game.objects.find((item) => item.id === ui.selected);
    if (!object) return;
    ui.rotation = object.rotation || 0;
    ui.panel = null;
    chooseTool({ type: 'MOVE', id: object.id, itemType: object.type, color: object.color });
  }
  else if (action === 'remove-selected') { act({ type: 'REMOVE', id: ui.selected }); ui.selected = null; renderInspector(); }
  else if (action === 'close-inspector') { ui.selected = null; renderInspector(); ui.dirty = true; render(); }
  else if (action === 'rotate-camera') scene?.rotate(Number(button.dataset.direction) * Math.PI / 4);
  else if (action === 'zoom') scene?.zoom(Number(button.dataset.direction) * .2);
  else if (action === 'view') { ui.view = ui.view === 'top' ? 'isometric' : 'top'; scene?.setView(ui.view); render(); }
  else if (action === 'wall-mode') {
    const modes = ['full', 'cutaway', 'low'];
    ui.wallMode = modes[(modes.indexOf(ui.wallMode) + 1) % modes.length];
    scene?.setWallMode?.(ui.wallMode);
    document.querySelector('#wall-mode-label').textContent = { full: 'Full walls', cutaway: 'Cutaway', low: 'Low walls' }[ui.wallMode];
    button.setAttribute('aria-label', `Change wall visibility: ${ui.wallMode} walls`);
  }
  else if (action === 'save') save();
  else if (action === 'settings') showModal('settings');
  else if (action === 'help') showModal('help');
  else if (action === 'rename') showModal('rename');
  else if (action === 'close-modal') closeModal();
  else if (action === 'new-game') showModal('new');
  else if (action === 'load') {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) return toast('No saved restaurant yet. Save your current restaurant first.', true);
      const loaded = deserialize(saved);
      if (!loaded || !Array.isArray(loaded.objects)) throw new Error('This save could not be read.');
      game = loaded;
      automaticSaveBlocked = false;
      ui.selected = null;
      setTool(null);
      ui.dirty = true;
      render();
      scene?.update(game);
      closeModal();
      toast('Your saved restaurant is ready.');
    } catch (error) { toast(`Could not load the restaurant: ${error.message}`, true); }
  } else if (action === 'start-game') {
    const name = document.querySelector('#new-name')?.value.trim() || 'The Corner Table';
    game = createGame(button.dataset.mode);
    automaticSaveBlocked = false;
    dispatch(game, { type: 'RENAME', name });
    ui.selected = null;
    ui.panel = null;
    setTool(null);
    ui.dirty = true;
    closeModal();
    render();
    scene?.update(game);
    save(true);
    toast(button.dataset.mode === 'empty' ? 'A fresh plot. Open Build to get started.' : 'Your bistro is ready. Welcome to the neighborhood.');
  }
});

app.addEventListener('change', (event) => {
  const input = event.target;
  if (input.dataset.price) act({ type: 'PRICE', recipeId: input.dataset.price, price: Number(input.value) });
  else if (input.id === 'ingredient-storage') { ui.ingredientStorage = input.value; ui.dirty = true; render(); }
});
app.addEventListener('submit', (event) => {
  if (event.target.id === 'rename-form') {
    event.preventDefault();
    const result = act({ type: 'RENAME', name: document.querySelector('#rename-name').value });
    if (result?.ok !== false) closeModal();
  }
});
document.querySelector('#modal').addEventListener('click', (event) => { if (event.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', (event) => {
  if (ui.modal && event.key === 'Tab') {
    const focusable = [...document.querySelectorAll('#modal button, #modal input, #modal select')];
    const index = focusable.indexOf(document.activeElement);
    if (event.shiftKey && index === 0) { event.preventDefault(); focusable.at(-1)?.focus(); }
    else if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); focusable[0]?.focus(); }
  }
  if (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.target.isContentEditable) return;
  if (event.key === 'Escape') { if (ui.modal) closeModal(); else { setTool(null); ui.panel = null; ui.ingredientsOpen = false; ui.inventoryOpen = false; ui.selected = null; ui.dirty = true; render(); } return; }
  if (ui.modal || event.ctrlKey || event.metaKey || event.altKey) return;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) { event.preventDefault(); panKeys.add(event.code); }
  else if (event.code === 'Space') { event.preventDefault(); pause(); }
  else if (event.key.toLowerCase() === 'b') setPanel('build');
  else if (event.key.toLowerCase() === 'm') setPanel('menu');
  else if (event.key.toLowerCase() === 'r' && ui.tool) { ui.rotation = (ui.rotation + 90) % 360; scene?.setRotation(ui.rotation); renderToolBanner(); }
  else if (event.key.toLowerCase() === 'q') scene?.rotate(-Math.PI / 4);
  else if (event.key.toLowerCase() === 'e') scene?.rotate(Math.PI / 4);
  else if (event.key === 'Delete') { setTool({ type: 'REMOVE' }); render(); }
  else if (event.key === '?') showModal('help');
});
document.addEventListener('keyup', (event) => panKeys.delete(event.code));
document.addEventListener('focusin', (event) => {
  if (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.target.isContentEditable) panKeys.clear();
});
window.addEventListener('blur', () => panKeys.clear());

let frame = 0;
let previous = performance.now();
let refresh = 0;
let liveRefresh = 0;
let stopped = false;
function animate(now) {
  if (stopped) return;
  const elapsed = Math.min((now - previous) / 1000, .1);
  previous = now;
  if (!ui.modal && panKeys.size) {
    const horizontal = Number(panKeys.has('KeyD')) - Number(panKeys.has('KeyA'));
    const vertical = Number(panKeys.has('KeyS')) - Number(panKeys.has('KeyW'));
    const distance = elapsed * 8 / (Math.hypot(horizontal, vertical) || 1);
    scene?.pan?.((horizontal * Math.cos(ui.azimuth) + vertical * Math.sin(ui.azimuth)) * distance,
      (-horizontal * Math.sin(ui.azimuth) + vertical * Math.cos(ui.azimuth)) * distance);
  }
  tick(game, elapsed);
  scene?.update(game);
  refresh += elapsed;
  liveRefresh += elapsed;
  if (refresh > .2) {
    if (liveRefresh > 2) {
      if (game.speed > 0) {
        renderConstructionHint();
        if (ui.panel && ui.panel !== 'build' && !document.querySelector('#panel input:focus, #panel select:focus')) renderPanel();
        const supplies = ui.ingredientsOpen || ui.inventoryOpen ? getSupplies(game) : undefined;
        if (!document.querySelector('#ingredients-panel select:focus')) renderIngredients(supplies);
        renderInventory(supplies);
        if (!document.querySelector('#inspector select:focus')) renderInspector();
      }
      liveRefresh = 0;
    }
    render();
    refresh = 0;
  }
  if (!automaticSaveBlocked && Date.now() - savedAt > 30000) save(true);
  frame = requestAnimationFrame(animate);
}
render();
frame = requestAnimationFrame(animate);
if (lastSaveError) toast('The previous save could not be loaded. It is kept untouched until you choose Save or New Restaurant.', true);
window.addEventListener('resize', () => scene?.resize());
if (import.meta.env.DEV) {
  window.__cornerTable = {
    getState: () => JSON.parse(serialize(game)),
    screenPosition: (x, z) => scene?.screenPosition(x, z),
  };
}
window.addEventListener('pagehide', () => {
  stopped = true;
  cancelAnimationFrame(frame);
  clearTimeout(toastTimer);
  save(true);
  scene?.dispose();
}, { once: true });
