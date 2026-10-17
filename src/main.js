import './style.css';
import { createGame, dispatch, tick, getStats, serialize, deserialize } from './engine.js';
import { ITEMS, RECIPES, SCENARIOS } from './catalog.js';
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
  goals: '<path d="M5 21V3h14l-2 4 2 4H5"/>',
  save: '<path d="M4 3h14l3 3v15H3V3Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 1 3h4l1-3 3-1 3-2-1-4 1-3-3-2-1-3Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3v3M12 18h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  rotate: '<path d="M20 7a8 8 0 1 0 0 10M20 3v5h-5"/>',
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
};
const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.table}</svg>`;
const ui = { panel: null, category: 'dining', tool: null, rotation: 0, selected: null, hover: null, view: 'isometric', dirty: true, modal: null, lastSpeed: 1 };
let game;
let savedAt = 0;
let lastSaveError = false;
try {
  const saved = localStorage.getItem(SAVE_KEY);
  game = saved ? deserialize(saved) : createGame('sandbox');
  if (!game || typeof game !== 'object' || !Array.isArray(game.objects)) throw new Error('Save does not contain a restaurant.');
} catch {
  game = createGame('sandbox');
  lastSaveError = true;
}

app.innerHTML = `
  <main id="game" aria-label="Corner Table restaurant management game">
    <div id="scene" aria-label="3D restaurant. Drag to move the camera, scroll to zoom, click an object to inspect it."></div>
    <header class="topbar">
      <button class="brand" data-action="settings" title="Restaurant settings"><span class="brand-mark">${icon('table')}</span><span>CORNER<span class="brand-second">TABLE</span></span></button>
      <div class="restaurant-heading"><button id="restaurant-name" data-action="rename" title="Rename restaurant"></button><span id="restaurant-subtitle">A little place. A big possibility.</span></div>
      <div class="top-stats" role="status" aria-label="Restaurant statistics">
        <div class="stat cash-stat"><span class="stat-symbol">$</span><span><strong id="cash"></strong><small>AVAILABLE FUNDS</small></span></div>
        <button class="stat stat-button" data-action="panel" data-panel="goals" title="Guest satisfaction and objectives">${icon('star')}<span><strong id="rating"></strong><small>GUEST RATING</small></span></button>
        <button class="stat stat-button" data-action="panel" data-panel="staff" title="Hygiene is improved by staff with cleaning priority">${icon('clean')}<span><strong id="hygiene"></strong><small>HYGIENE</small></span></button>
      </div>
      <div class="date-group"><span id="day"></span><strong id="time"></strong></div>
      <button class="icon-button help-button" data-action="help" title="How to play (?)" aria-label="How to play">${icon('help')}</button>
    </header>
    <div class="venue-bar"><button id="open-button" data-action="open" class="status-toggle"></button><span id="guest-count"></span><span class="venue-divider"></span><span id="service-label">SERVICE IN PROGRESS</span></div>
    <aside id="overview" class="overview" aria-label="Restaurant overview"></aside>
    <section id="panel" class="panel" aria-label="Management panel" hidden></section>
    <aside id="inspector" class="inspector" aria-label="Selected item" hidden></aside>
    <div id="tool-banner" class="tool-banner" hidden></div>
    <div class="camera-tools" aria-label="Camera controls">
      <button class="icon-button" data-action="rotate-camera" data-direction="-1" title="Rotate camera left (Q)" aria-label="Rotate camera left">${icon('rotate', 'flip')}</button>
      <button class="icon-button" data-action="view" title="Toggle overhead camera" aria-label="Toggle overhead camera">${icon('eye')}</button>
      <button class="icon-button" data-action="rotate-camera" data-direction="1" title="Rotate camera right (E)" aria-label="Rotate camera right">${icon('rotate')}</button>
      <span></span>
      <button class="icon-button" data-action="zoom" data-direction="1" title="Zoom in" aria-label="Zoom in">${icon('plus')}</button>
      <button class="icon-button" data-action="zoom" data-direction="-1" title="Zoom out" aria-label="Zoom out">${icon('minus')}</button>
    </div>
    <footer class="bottom-bar">
      <nav class="management-nav" aria-label="Manage restaurant">
        ${[['build', 'Build', 'B'], ['menu', 'Menu', 'M'], ['staff', 'Staff', ''], ['finance', 'Finances', ''], ['goals', 'Goals', '']].map(([key, label, shortcut]) => `<button data-action="panel" data-panel="${key}" class="nav-button" title="${label}${shortcut ? ` (${shortcut})` : ''}">${icon(key)}<span>${label}</span>${shortcut ? `<kbd>${shortcut}</kbd>` : ''}</button>`).join('')}
      </nav>
      <div class="time-controls" aria-label="Simulation speed"><button class="icon-button pause-button" data-action="pause" title="Pause or resume (Space)" aria-label="Pause or resume">${icon('pause')}</button>${[1, 2, 3].map((speed) => `<button class="speed-button" data-action="speed" data-speed="${speed}" aria-label="${speed} times speed">${speed}×</button>`).join('')}</div>
      <div class="session-controls"><button class="icon-button" data-action="save" title="Save restaurant" aria-label="Save restaurant">${icon('save')}</button><button class="icon-button" data-action="settings" title="Save, load, or start a new restaurant" aria-label="Game settings">${icon('settings')}</button></div>
    </footer>
    <div class="view-caption"><span class="live-dot"></span><span id="view-label">NEIGHBORHOOD VIEW</span><span class="caption-separator">/</span><span id="hover-label">Drag to explore · Scroll to zoom</span></div>
    <div id="toast" role="status" aria-live="polite" hidden></div>
    <div id="modal" class="modal-backdrop" hidden></div>
  </main>`;

let scene;
try {
  scene = createScene(document.querySelector('#scene'), {
    onTileClick: ({ x, z }) => {
      if (ui.modal) return;
      if (ui.tool?.type === 'PLACE') act({ type: 'PLACE', itemType: ui.tool.itemType, x, z, rotation: ui.rotation });
      else if (ui.tool?.type === 'FLOOR') act({ type: 'FLOOR', x, z, style: ui.tool.style });
      else if (ui.tool?.type === 'REMOVE') toast('Click the item you want to remove.');
      else { ui.selected = null; renderInspector(); }
    },
    onObjectClick: (id) => {
      if (ui.modal) return;
      if (ui.tool?.type === 'REMOVE') act({ type: 'REMOVE', id });
      else { ui.selected = id; renderInspector(); }
    },
    onHover: (tile) => {
      ui.hover = tile;
      const object = game.objects.find((item) => item.id === tile?.objectId);
      document.querySelector('#hover-label').textContent = object ? `${ITEMS[object.type]?.name || object.type} · Click to inspect` : tile ? `Tile ${tile.x}, ${tile.z}${ui.tool ? ' · Click to place' : ''}` : 'Drag to explore · Scroll to zoom';
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

function itemArt(type, color) {
  const fill = typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : color || '#a87952';
  let shapes;
  if (/table|bar/.test(type)) shapes = '<path d="m20 43 35 17 34-18-35-17Z" fill="#bd8e5f"/><path d="m20 43 35 17v7L20 50Zm35 17 34-18v7L55 67Z" fill="#805637"/><path d="M27 53v29l6 3V56m43-4v28l-5 3V56M53 64v27l6-3V63" fill="#634834"/><ellipse cx="55" cy="41" rx="10" ry="5" fill="#f4eee1"/><path d="M55 38V28" stroke="#546342" stroke-width="3"/><circle cx="55" cy="26" r="4" fill="#b96655"/>';
  else if (/chair|bench/.test(type)) shapes = '<path d="m36 15 25 6v34l-25-8Z" fill="COLOR"/><path d="m31 49 29 8 20-11-25-8Z" fill="COLOR"/><path d="M32 51v33l6 3V53m36-4v30l-5 3V52m-12 7v34l6-2V57" fill="#61483a"/><path d="m39 20 18 5v20l-18-5Z" fill="#f2e1c7" opacity=".35"/>';
  else if (/plant|flower/.test(type)) shapes = '<path d="m34 59 41 1-7 29H41Z" fill="#9f6950"/><ellipse cx="54" cy="60" rx="21" ry="8" fill="#73513d"/><path d="M53 63V25M51 47 35 33M54 43l16-20" stroke="#586e42" stroke-width="4"/><ellipse cx="32" cy="31" rx="15" ry="8" fill="#7d955c" transform="rotate(30 32 31)"/><ellipse cx="70" cy="22" rx="15" ry="8" fill="#69834d" transform="rotate(-30 70 22)"/><ellipse cx="52" cy="27" rx="9" ry="17" fill="#8ba86a" transform="rotate(12 52 27)"/>';
  else if (/wall|door|window|painting|clock/.test(type)) shapes = '<path d="m26 20 51 16v54L26 72Z" fill="COLOR"/><path d="m77 36 8-5v53l-8 6Z" fill="#7a6957"/><path d="m39 35 25 8v33l-25-8Z" fill="#e4d2ae"/><path d="m43 40 17 6v23l-17-5Z" fill="#72918a"/><path d="m43 59 8-7 9 12v5l-17-5Z" fill="#9b8056"/>';
  else if (/toilet/.test(type)) shapes = '<path d="m35 19 28-4 14 9v28L49 59 35 49Z" fill="#eeeae2"/><path d="m40 50 32-3 15 11v10L60 81 36 65Z" fill="#f8f5ec"/><ellipse cx="61" cy="57" rx="22" ry="11" fill="#c8c6be"/><ellipse cx="61" cy="57" rx="14" ry="6" fill="#8faaa8"/><path d="m48 74 23-4-3 19-20 2Z" fill="#deded7"/>';
  else if (/floor/.test(type)) shapes = '<path d="m13 53 42-26 42 25-43 26Z" fill="COLOR"/><path d="m13 53 41 25 43-26v7L54 84 13 59Z" fill="#907657"/><path d="m27 45 42 25M41 36l41 26M27 62l42-26M41 70l43-26" stroke="#f3e6cb" opacity=".45"/>';
  else if (/fridge|shelf|cabinet/.test(type)) shapes = '<path d="m31 12 35-6 15 10v68l-35 10-15-11Z" fill="#c7c8be"/><path d="m31 12 15 11v71L31 83Z" fill="#9a9e96"/><path d="m46 23 35-7v68l-35 10Z" fill="#e4e5dc"/><path d="m47 48 32-7M52 34v7M52 58v11" stroke="#69746f" stroke-width="3"/>';
  else if (/sink|clean|broom/.test(type)) shapes = '<path d="m22 40 38-15 27 16-38 18Z" fill="#d5d9d2"/><path d="m22 40 27 19v29L22 72Zm27 19 38-18v30L49 88Z" fill="#a6b3ac"/><ellipse cx="56" cy="42" rx="17" ry="8" fill="#718d8e"/><path d="M63 36V21q0-10-10-4" stroke="#d4e2dc" stroke-width="4" fill="none"/>';
  else shapes = '<path d="m23 35 37-14 27 17-39 17Z" fill="#9aa6a0"/><path d="m23 35 25 20v35L23 70Z" fill="#84928b"/><path d="m48 55 39-17v36L48 90Z" fill="#c2cbc3"/><path d="m54 64 26-12v20L54 83Z" fill="#455457"/><path d="m51 57 31-14" stroke="#e4e7d9" stroke-width="2"/><ellipse cx="51" cy="35" rx="10" ry="5" fill="#40504b"/><ellipse cx="68" cy="41" rx="9" ry="5" fill="#40504b"/>';
  return `<svg class="item-art" viewBox="0 0 110 104" aria-hidden="true"><ellipse cx="55" cy="91" rx="33" ry="6" fill="#323731" opacity=".1"/>${shapes.replaceAll('COLOR', fill)}</svg>`;
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
  if (ui.panel !== 'build') setTool(null);
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

function renderToolBanner() {
  const banner = document.querySelector('#tool-banner');
  banner.hidden = !ui.tool;
  if (!ui.tool) return;
  const name = ui.tool.type === 'REMOVE' ? 'Remove item' : ui.tool.type === 'FLOOR' ? `${ui.tool.style} floor` : ITEMS[ui.tool.itemType]?.name || ui.tool.itemType;
  banner.innerHTML = `${icon(ui.tool.type === 'REMOVE' ? 'trash' : 'build')}<span><strong>${escapeHtml(name)}</strong><small>${ui.tool.type === 'REMOVE' ? 'Click an item · 60% refund' : 'Click a tile to place · R to rotate'}</small></span><button data-action="rotate-item" title="Rotate item (R)">${icon('rotate')}<span>${ui.rotation}°</span></button><button class="icon-button" data-action="cancel" title="Cancel (Esc)" aria-label="Cancel building">${icon('close')}</button>`;
}

function renderPanel() {
  const panel = document.querySelector('#panel');
  panel.hidden = !ui.panel;
  if (!ui.panel) return;
  const titles = { build: 'Build your restaurant', menu: 'Food & drink', staff: 'Your team', finance: 'The books', goals: 'A place to be proud of' };
  const heading = `<div class="panel-heading"><span>${icon(ui.panel)}${titles[ui.panel]}</span><button class="close-button" data-action="close-panel" aria-label="Close management panel">${icon('close')}</button></div>`;
  panel.className = `panel panel-${ui.panel}`;
  let content = '';
  if (ui.panel === 'build') {
    const entries = Object.entries(ITEMS).filter(([type, item]) => classify(type, item) === ui.category);
    content = `<div class="category-tabs" role="tablist" aria-label="Build categories">${categories.map((category) => `<button role="tab" aria-selected="${ui.category === category.id}" class="${ui.category === category.id ? 'active' : ''}" data-action="category" data-category="${category.id}" title="${category.name}">${icon(category.icon)}<span>${category.name}</span></button>`).join('')}</div><div class="palette-caption"><span>${categories.find((category) => category.id === ui.category)?.name}</span><span>${ui.category === 'floors' ? 'Click tiles to paint' : 'Choose an item'}</span></div><div class="item-grid">${ui.category === 'floors' ? ['wood', 'tile', 'stone', 'checker'].map((style, index) => `<button class="item-card ${ui.tool?.style === style ? 'selected' : ''}" data-action="floor" data-style="${style}" title="${style} floor · Click a tile to paint" aria-label="Build ${style} floor">${itemArt('floor', ['#b98b5f', '#d6cdb7', '#93968a', '#d6bc8f'][index])}<span class="item-price">$12</span><span class="item-name">${style}</span></button>`).join('') : entries.map(([type, item]) => `<button class="item-card ${ui.tool?.itemType === type ? 'selected' : ''}" data-action="item" data-item="${escapeHtml(type)}" title="${escapeHtml(item.name)} · ${money(item.cost)}${item.description ? ` · ${escapeHtml(item.description)}` : ''}" aria-label="Build ${escapeHtml(item.name)}, ${money(item.cost)}">${itemArt(type, item.color)}<span class="item-price">${money(item.cost)}</span><span class="item-name">${escapeHtml(item.name)}</span></button>`).join('')}</div><div class="palette-footer"><button data-action="demolish" class="text-button ${ui.tool?.type === 'REMOVE' ? 'active' : ''}">${icon('trash')}Remove <kbd>Del</kbd></button><button data-action="expand" class="text-button" title="Buy a larger plot of land">${icon('expand')}Buy land</button></div>`;
  } else if (ui.panel === 'menu') {
    content = `<div class="panel-intro"><h2>Something for everyone.</h2><p>A thoughtful menu keeps guests happy. Equipment must be available before a dish can be served.</p></div><div class="recipe-list">${RECIPES.map((recipe) => {
      const entry = game.menu.find((item) => item.recipeId === recipe.id) || { price: recipe.price, enabled: false };
      const locked = (game.stats.served || 0) < (recipe.unlock || 0);
      const missing = (recipe.equipment || []).filter((type) => !game.objects.some((object) => object.type === type));
      return `<article class="recipe-row"><span class="recipe-symbol">${/coffee|tea|drink|lemon|juice|beer/.test(recipe.id) ? '☕' : /salad/.test(recipe.id) ? '🥗' : /pizza/.test(recipe.id) ? '🍕' : /cake|bread|toast/.test(recipe.id) ? '🍞' : /pasta/.test(recipe.id) ? '🍝' : '🍽'}</span><div class="recipe-info"><strong>${escapeHtml(recipe.name)}</strong><small>${locked ? `Unlocks after ${recipe.unlock} guests` : missing.length ? `Needs ${escapeHtml(missing.map((type) => ITEMS[type]?.name || type).join(', '))}` : `Ingredients ${money(recipe.cost)} · Ready to serve`}</small></div><label class="price-input"><span>$</span><input type="number" aria-label="${escapeHtml(recipe.name)} price" data-price="${escapeHtml(recipe.id)}" min="1" max="150" step="1" value="${Number(entry.price || recipe.price)}" /></label><button class="switch ${entry.enabled ? 'on' : ''}" data-action="recipe" data-recipe="${escapeHtml(recipe.id)}" aria-label="${entry.enabled ? 'Remove' : 'Add'} ${escapeHtml(recipe.name)} ${entry.enabled ? 'from' : 'to'} menu" aria-pressed="${entry.enabled}" title="${entry.enabled ? 'On the menu' : 'Off the menu'}"><span></span></button></article>`;
    }).join('')}</div><div class="panel-tip">${icon('star')}Higher prices increase margins. Guests also judge value, variety, and waiting time.</div>`;
  } else if (ui.panel === 'staff') {
    content = `<div class="panel-intro"><h2>Good food takes good people.</h2><p>Give each employee a main priority. Balance your kitchen, service, and cleaning as the restaurant grows.</p></div><div class="hire-options">${[['chef', 'Cooking', 'kitchen'], ['waiter', 'Serving', 'menu'], ['cleaner', 'Cleaning', 'clean']].map(([role, label, glyph]) => `<button data-action="hire" data-role="${role}" title="Hire an employee with ${label.toLowerCase()} priority">${icon(glyph)}<span>Hire for<strong>${label}</strong></span>${icon('plus')}</button>`).join('')}</div><div class="staff-list">${game.staff.length ? game.staff.map((staff, index) => `<article class="staff-row"><span class="staff-avatar color-${index % 4}">${escapeHtml(staff.name?.charAt(0) || 'S')}</span><div class="staff-info"><strong>${escapeHtml(staff.name)}</strong><small>${escapeHtml(staff.task || 'Ready for the next task')} · ${money(staff.wage)}/hour</small></div><label class="priority-select"><span class="sr-only">Main priority for ${escapeHtml(staff.name)}</span><select data-priority="${escapeHtml(staff.id)}">${[['chef', 'Cooking'], ['waiter', 'Serving'], ['cleaner', 'Cleaning']].map(([value, label]) => `<option value="${value}" ${staff.role === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><button class="icon-button subtle" data-action="fire" data-id="${escapeHtml(staff.id)}" aria-label="Dismiss ${escapeHtml(staff.name)}" title="Dismiss employee">${icon('close')}</button></article>`).join('') : '<div class="empty-state">Your first employee is a hire away.<small>Start with cooking, serving, and cleaning priorities.</small></div>'}</div><div class="panel-tip">${icon('finance')}Hourly payroll: <strong>${money(game.staff.reduce((total, staff) => total + Number(staff.wage || 0), 0))}</strong></div>`;
  } else if (ui.panel === 'finance') {
    const stats = game.stats || {};
    const history = game.history || game.finances || [];
    content = `<div class="panel-intro"><h2>Every little table counts.</h2><p>Keep your menu profitable and invest in a restaurant your neighbors will return to.</p></div><div class="finance-hero"><small>AVAILABLE FUNDS</small><strong>${money(game.cash)}</strong><span>Day ${game.day} · ${game.open ? 'Trading' : 'Closed'}</span></div><div class="finance-grid"><div><small>Total sales</small><strong class="positive">${money(stats.revenue)}</strong></div><div><small>Total expenses</small><strong>${money(stats.expenses)}</strong></div><div><small>Net result</small><strong class="${stats.revenue >= stats.expenses ? 'positive' : ''}">${money((stats.revenue || 0) - (stats.expenses || 0))}</strong></div><div><small>Guests served</small><strong>${number(stats.served)}</strong></div></div><h3 class="section-label">RECENT ACTIVITY</h3><div class="activity-list">${history.length ? history.slice(-8).reverse().map((entry) => `<div><span>Day ${entry.day || game.day}</span><strong>${money(entry.revenue ?? entry.income)}</strong><small>Expenses ${money(entry.expenses ?? entry.cost)}</small></div>`).join('') : (game.events || []).slice(0, 7).map((event) => `<p>${escapeHtml(event.text || event.message)}</p>`).join('') || '<p>Your first day is just beginning.</p>'}</div>`;
  } else if (ui.panel === 'goals') {
    const scenario = game.scenario;
    content = `<div class="panel-intro"><h2>${escapeHtml(scenario?.title || 'Make yourself at home.')}</h2><p>${escapeHtml(scenario?.description || 'Start small. Cook something lovely. Build a place the neighborhood loves.')}</p></div>${renderGoals()}<div class="scenario-heading"><h3 class="section-label">A NEW CHALLENGE</h3><p>Choose a brief for your restaurant.</p></div><div class="scenario-list">${SCENARIOS.map((scenario, index) => `<button data-action="scenario" data-id="${escapeHtml(scenario.id)}" class="scenario-card ${game.scenario?.id === scenario.id ? 'current' : ''}"><span class="scenario-number">0${index + 1}</span><span><strong>${escapeHtml(scenario.title || scenario.name)}</strong><small>${escapeHtml(scenario.description || 'A new restaurant challenge.')}</small></span>${icon('arrow')}</button>`).join('')}</div>`;
  }
  panel.innerHTML = heading + `<div class="panel-body">${content}</div>`;
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
    { label: 'Earn a 4-star reputation', current: game.stats?.rating || 0, target: 4 },
    { label: 'Keep hygiene above 85%', current: game.stats?.cleanliness || 0, target: 85 },
  ];
  return `<div class="goal-list ${compact ? 'compact' : ''}">${(goals.length ? goals : fallback).map((goal) => {
    const current = goalValue(goal);
    const target = Number(goal.target || goal.value || 1);
    const percent = Math.min(100, Math.max(0, current / target * 100));
    return `<div class="goal ${goal.complete || percent >= 100 ? 'complete' : ''}"><span class="goal-check">${goal.complete || percent >= 100 ? '✓' : ''}</span><div><span>${escapeHtml(goal.label || goal.description || goal.title || `Reach ${target} ${goal.metric || ''}`)}</span><div class="progress-track"><i style="width:${percent}%"></i></div></div><small>${number(current)}<span> / ${number(target)}</span></small></div>`;
  }).join('')}</div>`;
}

function renderOverview() {
  const stats = game.stats || {};
  const overview = document.querySelector('#overview');
  overview.innerHTML = `<div class="overview-kicker">YOUR LITTLE RESTAURANT</div><h1>A seat at the<br><em>corner table.</em></h1><div class="overview-line"></div><div class="service-summary"><span>${icon('menu')}<strong>${stats.served || 0}</strong> served</span><span>${icon('table')}<strong>${game.objects.filter((object) => /table/.test(object.type)).length}</strong> tables</span></div><button class="overview-goal" data-action="panel" data-panel="goals"><span>${icon('goals')}TODAY'S AMBITION</span>${icon('arrow')}</button>${renderGoals(true)}<p class="overview-note">${game.speed === 0 ? 'Take your time. A good room is worth planning.' : !game.open ? 'The door is closed. Make it yours before opening.' : stats.cleanliness < 65 ? 'A little cleaning will make a big difference.' : 'The door is open. Let the good things simmer.'}</p>`;
}

function renderInspector() {
  const inspector = document.querySelector('#inspector');
  const object = game.objects.find((item) => item.id === ui.selected);
  const staff = game.staff.find((person) => person.id === ui.selected);
  const guest = game.guests.find((person) => person.id === ui.selected);
  inspector.hidden = !object && !staff && !guest;
  if (!object && (staff || guest)) {
    const person = staff || guest;
    inspector.innerHTML = `<div class="panel-heading"><span>${escapeHtml(person.name)}</span><button class="close-button" data-action="close-inspector" aria-label="Close person details">${icon('close')}</button></div><div class="inspector-preview"><span class="staff-avatar inspector-person">${escapeHtml(person.name?.charAt(0) || '?')}</span></div><div class="inspector-content"><small>${staff ? 'YOUR TEAM' : 'YOUR GUEST'}</small><p>${escapeHtml(person.task || person.state || 'Enjoying the restaurant')}</p>${staff ? `<label class="field-label">Main priority<select data-priority="${escapeHtml(staff.id)}">${[['chef', 'Cooking'], ['waiter', 'Serving'], ['cleaner', 'Cleaning']].map(([value, label]) => `<option value="${value}" ${staff.role === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><div class="person-metrics"><span>Wage<strong>${money(staff.wage)}/h</strong></span><span>Skill<strong>${Math.round(staff.skill || 0)}</strong></span></div><button class="danger-button" data-action="fire" data-id="${escapeHtml(staff.id)}">Dismiss employee</button>` : `<div class="person-metrics"><span>Happiness<strong>${Math.round(guest.happiness || 0)}%</strong></span><span>Patience<strong>${Math.round(guest.patience || 0)}%</strong></span></div>`}</div>`;
    return;
  }
  if (!object) return;
  const item = ITEMS[object.type] || {};
  inspector.innerHTML = `<div class="panel-heading"><span>${escapeHtml(item.name || object.type)}</span><button class="close-button" data-action="close-inspector" aria-label="Close item details">${icon('close')}</button></div><div class="inspector-preview">${itemArt(object.type, item.color)}</div><div class="inspector-content"><small>TILE ${object.x}, ${object.z} · ${object.rotation || 0}°</small><p>${escapeHtml(item.description || 'Part of your restaurant. Keep clear paths around furniture so your guests and team can move freely.')}</p><button class="danger-button" data-action="remove-selected">${icon('trash')}Remove · ${money(Math.round((item.cost || 0) * .6))} refund</button></div>`;
}

function render() {
  const stats = game.stats || {};
  document.querySelector('#restaurant-name').textContent = game.name || 'The Corner Table';
  document.querySelector('#cash').textContent = money(game.cash);
  document.querySelector('#cash').classList.toggle('negative', game.cash < 0);
  document.querySelector('#rating').textContent = `${Number(stats.rating || 0).toFixed(1)} / 5`;
  document.querySelector('#hygiene').textContent = `${Math.round(stats.cleanliness ?? 100)}%`;
  document.querySelector('#day').textContent = `DAY ${game.day || 1}`;
  const hours = Math.floor(game.time || 0) % 24;
  const minutes = Math.floor(((game.time || 0) % 1) * 60);
  document.querySelector('#time').textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const open = document.querySelector('#open-button');
  open.innerHTML = `<i class="${game.open ? 'open' : ''}"></i>${game.open ? 'OPEN FOR BUSINESS' : 'CLOSED'}<span>${game.open ? 'Close' : 'Open'}</span>`;
  document.querySelector('#guest-count').textContent = `${game.guests.length} ${game.guests.length === 1 ? 'guest' : 'guests'} visiting`;
  document.querySelector('#service-label').textContent = game.speed === 0 ? 'PAUSED' : game.open ? 'SERVICE IN PROGRESS' : 'TIME TO MAKE IT YOURS';
  document.querySelector('#restaurant-subtitle').textContent = game.scenario?.title ? `${game.scenario.title} · ${game.scenario.complete ? 'Challenge complete' : 'Challenge in progress'}` : 'A little place. A big possibility.';
  for (const button of document.querySelectorAll('.nav-button')) button.classList.toggle('active', button.dataset.panel === ui.panel);
  for (const button of document.querySelectorAll('.speed-button')) button.classList.toggle('active', Number(button.dataset.speed) === game.speed);
  const pause = document.querySelector('.pause-button');
  pause.innerHTML = icon(game.speed === 0 ? 'play' : 'pause');
  pause.classList.toggle('active', game.speed === 0);
  document.querySelector('#view-label').textContent = ui.view === 'top' ? 'FLOOR PLAN' : 'NEIGHBORHOOD VIEW';
  document.querySelector('#overview').hidden = Boolean(ui.selected);
  if (ui.dirty) {
    renderPanel();
    renderInspector();
    renderToolBanner();
    renderOverview();
    ui.dirty = false;
  }
}

function save(silent = false) {
  try {
    localStorage.setItem(SAVE_KEY, serialize(game));
    savedAt = Date.now();
    if (!silent) toast('Restaurant saved on this browser.');
    return true;
  } catch {
    if (!silent) toast('Could not save. Your browser may have disabled local storage.', true);
    return false;
  }
}

function showModal(type) {
  ui.modal = type;
  const modal = document.querySelector('#modal');
  modal.hidden = false;
  const close = `<button class="modal-close icon-button" data-action="close-modal" aria-label="Close dialog">${icon('close')}</button>`;
  let content;
  if (type === 'help') content = `<span class="eyebrow">WELCOME TO CORNER TABLE</span><h2>A restaurant of your own.</h2><p>Make a welcoming room, put good food on the menu, and take care of the people in it.</p><div class="help-grid"><div>${icon('build')}<strong>Build your space</strong><p>Open Build, choose furniture, and click a tile. Leave clear paths between tables and kitchen equipment.</p></div><div>${icon('menu')}<strong>Make a menu</strong><p>Turn dishes on, set their prices, and build the equipment each recipe needs.</p></div><div>${icon('staff')}<strong>Find your people</strong><p>Hire employees for cooking, serving, and cleaning. Change their main priorities as service gets busy.</p></div><div>${icon('star')}<strong>Make guests happy</strong><p>Keep waits short, prices fair, the room clean, and toilets available. Good reviews bring more guests.</p></div></div><div class="shortcut-list"><span><kbd>Drag</kbd> Move camera</span><span><kbd>Scroll</kbd> Zoom</span><span><kbd>Q</kbd><kbd>E</kbd> Rotate camera</span><span><kbd>R</kbd> Rotate item</span><span><kbd>Space</kbd> Pause</span><span><kbd>Esc</kbd> Cancel</span><span><kbd>B</kbd> Build</span><span><kbd>M</kbd> Menu</span><span><kbd>Delete</kbd> Remove</span></div><button class="primary-button" data-action="close-modal">Let's make something good ${icon('arrow')}</button>`;
  else if (type === 'new') content = `<span class="eyebrow">A FRESH START</span><h2>Your next great little place.</h2><p>Choose how to begin. A new restaurant replaces the current restaurant and its browser save.</p><label class="field-label">Restaurant name<input id="new-name" maxlength="40" value="The Corner Table" /></label><div class="new-game-options"><button data-action="start-game" data-mode="sandbox">${icon('table')}<strong>The neighborhood bistro</strong><span>A furnished restaurant and a small team. Jump straight into service.</span>${icon('arrow')}</button><button data-action="start-game" data-mode="empty">${icon('build')}<strong>A blank canvas</strong><span>An empty plot and a starting budget. Build every corner yourself.</span>${icon('arrow')}</button></div>`;
  else if (type === 'rename') content = `<span class="eyebrow">MAKE IT YOURS</span><h2>A name above the door.</h2><form id="rename-form"><label class="field-label">Restaurant name<input id="rename-name" maxlength="40" required value="${escapeHtml(game.name)}" /></label><button class="primary-button" type="submit">Save name ${icon('arrow')}</button></form>`;
  else content = `<span class="eyebrow">TAKE A LITTLE BREAK</span><h2>The Corner Table</h2><p>Your restaurant is saved automatically on this browser every 30 seconds.</p><div class="settings-actions"><button data-action="save">${icon('save')}Save restaurant<span>Save the current service</span></button><button data-action="load">${icon('clock')}Load saved restaurant<span>Return to your most recent save</span></button><button data-action="new-game">${icon('plus')}New restaurant<span>Start with a bistro or a blank plot</span></button><button data-action="help">${icon('help')}How to play<span>Controls and a few helpful tips</span></button></div><p class="settings-note">${savedAt ? `Last saved ${new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Browser save · Version 1'} · Made for a good little service.</p>`;
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
  else if (action === 'close-panel') { ui.panel = null; setTool(null); render(); }
  else if (action === 'category') { ui.category = button.dataset.category; ui.dirty = true; render(); }
  else if (action === 'item') { setTool({ type: 'PLACE', itemType: button.dataset.item, color: ITEMS[button.dataset.item]?.color }); render(); }
  else if (action === 'floor') { setTool({ type: 'FLOOR', style: button.dataset.style }); render(); }
  else if (action === 'demolish') { setTool({ type: 'REMOVE' }); render(); }
  else if (action === 'cancel') { setTool(null); render(); }
  else if (action === 'rotate-item') { ui.rotation = (ui.rotation + 90) % 360; scene?.setRotation(ui.rotation); renderToolBanner(); }
  else if (action === 'expand') act({ type: 'EXPAND' });
  else if (action === 'open') act({ type: 'TOGGLE_OPEN' });
  else if (action === 'pause') pause();
  else if (action === 'speed') act({ type: 'SPEED', speed: Number(button.dataset.speed) }, true);
  else if (action === 'hire') act({ type: 'HIRE', role: button.dataset.role });
  else if (action === 'fire') act({ type: 'FIRE', id: button.dataset.id });
  else if (action === 'recipe') act({ type: 'TOGGLE_RECIPE', recipeId: button.dataset.recipe });
  else if (action === 'scenario') act({ type: 'SCENARIO', id: button.dataset.id });
  else if (action === 'remove-selected') { act({ type: 'REMOVE', id: ui.selected }); ui.selected = null; renderInspector(); }
  else if (action === 'close-inspector') { ui.selected = null; renderInspector(); ui.dirty = true; render(); }
  else if (action === 'rotate-camera') scene?.rotate(Number(button.dataset.direction) * Math.PI / 4);
  else if (action === 'zoom') scene?.zoom(Number(button.dataset.direction) * .2);
  else if (action === 'view') { ui.view = ui.view === 'top' ? 'isometric' : 'top'; scene?.setView(ui.view); render(); }
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
  else if (input.dataset.priority) act({ type: 'PRIORITY', id: input.dataset.priority, role: input.value });
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
  if (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
  if (event.key === 'Escape') { if (ui.modal) closeModal(); else { setTool(null); ui.panel = null; ui.selected = null; ui.dirty = true; render(); } return; }
  if (ui.modal || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Space') { event.preventDefault(); pause(); }
  else if (event.key.toLowerCase() === 'b') setPanel('build');
  else if (event.key.toLowerCase() === 'm') setPanel('menu');
  else if (event.key.toLowerCase() === 'r' && ui.tool) { ui.rotation = (ui.rotation + 90) % 360; scene?.setRotation(ui.rotation); renderToolBanner(); }
  else if (event.key.toLowerCase() === 'q') scene?.rotate(-Math.PI / 4);
  else if (event.key.toLowerCase() === 'e') scene?.rotate(Math.PI / 4);
  else if (event.key === 'Delete') { setTool({ type: 'REMOVE' }); render(); }
  else if (event.key === '?') showModal('help');
});

let frame = 0;
let previous = performance.now();
let refresh = 0;
let overviewRefresh = 0;
let stopped = false;
function animate(now) {
  if (stopped) return;
  const elapsed = Math.min((now - previous) / 1000, .1);
  previous = now;
  tick(game, elapsed);
  scene?.update(game);
  refresh += elapsed;
  overviewRefresh += elapsed;
  if (refresh > .2) {
    if (overviewRefresh > 2 && !document.querySelector('#panel input:focus, #panel select:focus')) { ui.dirty = true; overviewRefresh = 0; }
    render();
    refresh = 0;
  }
  if (Date.now() - savedAt > 30000) save(true);
  frame = requestAnimationFrame(animate);
}
render();
frame = requestAnimationFrame(animate);
if (lastSaveError) toast('The previous save could not be loaded. A fresh bistro is ready.', true);
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


