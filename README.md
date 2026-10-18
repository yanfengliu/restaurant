# Corner Table

A desktop 3D browser game about turning a little neighborhood bistro into a local favorite.

## Play locally

Use Node.js 24.12.0 (pinned in `.nvmrc`).

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. The starter bistro begins service immediately. Open the gear menu to begin on an empty plot instead.

## Make it yours

- **Build:** drag straight wall or window runs, close a room to receive peach flooring automatically, and add a doorway. The first doorway is free. Drag floor strokes or click single tiles; place tables, chairs and equipment individually. Remove items for 60% of their actual purchase price and buy more land.
- **Ingredients:** choose a shelf or fridge batch for each ingredient. Quantities recur every ten game days; payment is taken only for the goods that fit and arrive. The order window displays the full scheduled batch cost even when storage is currently full.
- **Tableware:** plus prepays 15 coins for a unit and reserves cabinet space; minus refunds a unit that is still pending. The shipment arrives after five game days. Plates and bowls return through collection, washing, and clean storage after use.
- **Inventory:** inspect ingredient stock and clean tableware in a separate window while ordering or building. Hover a tableware count for in-use, dirty, returning, and pending quantities.
- **Menu:** select a dish, set its price, and inspect its equipment, ingredient, and tableware requirements. Red cards identify shortages. Adding a dish requires its prerequisites; an enabled dish remains on the menu when supplies temporarily run out.
- **Staff:** compare three candidates' cooking, speed, clumsiness, and monthly wages. Choose Hire, then click clear owned ground to place the employee. Independently cycle serving, cooking, dishwashing, and cleaning through normal, high, off, and low priorities.
- **Finances:** watch sales, expenses, cash, and service activity.
- **Goals:** choose from six restaurant challenges or play freely.

Use **WASD**, **Shift-drag**, or middle-drag to pan the camera, **right-drag** to orbit, and scroll to zoom. **Q / E** also rotate the view. **B** opens Build, **M** opens Menu, **R** rotates furniture, **Delete** selects removal, **Space** pauses, and **Esc** cancels. The camera controls also offer an overhead view and full, cutaway, or low walls. Use Catalog or Build to reopen the construction catalog, or Esc / Cancel to clear the active tool.

The calendar uses 15 simulation seconds per game day and 30 days per month. Wages accrue after hiring while simulation time advances, and are paid at each day boundary or when an employee is dismissed. Dishwashers wait for five dirty dishes, wash unattended, then staff return clean dishes to cabinets; sinks retain their single-dish process. Pause and speed controls affect service and deliveries together.

The game saves automatically in this browser every 30 seconds. The gear menu includes explicit save, load, and new restaurant controls. Version 2 saves retain stock, reusable dishes, deliveries, and employee priorities; valid version 1 saves migrate on load using the existing browser save key. Browser storage is local to the browser and origin; clearing it removes the save. If a save cannot be loaded, automatic saving stops and the original save stays untouched until you explicitly choose Save or New Restaurant.

## Development

Vanilla JavaScript modules, Vite 8.3.4, and Three.js 0.186.1. Geometry, interface illustrations, and game content are authored in the project. No art download or account is needed at runtime.

```sh
npm run check
npm run audit
```

`check` checks JavaScript syntax, runs the Node simulation tests, and produces a production build. `audit` checks installed dependency advisories. `npm run preview` serves the production build locally.

The development server exposes a read-only `window.__cornerTable` inspection helper for input-driven browser verification. Production builds omit that helper.

Research and scope notes live in [docs/research.md](docs/research.md).
