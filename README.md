# Corner Table

A 3D restaurant management game about turning a little neighborhood bistro into a local favorite.

## Play locally

Use Node.js 24.12.0 (pinned in `.nvmrc`).

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. The starter bistro begins service immediately. Open the gear menu to begin on an empty plot instead.

## Make it yours

- **Build:** drag straight wall or window runs, close a room to receive peach flooring automatically, and add a doorway. The first doorway is free. Drag floor strokes or click single tiles; place tables, chairs and equipment individually. Remove items for 60% of their actual purchase price and buy more land.
- **Menu:** enable recipes and set prices. Each recipe lists the equipment it needs.
- **Staff:** hire employees and choose cooking, serving, or cleaning as their main priority.
- **Finances:** watch sales, expenses, cash, and service activity.
- **Goals:** choose from six restaurant challenges or play freely.

Use **WASD**, **Shift-drag**, or middle-drag to pan the camera, **right-drag** to orbit, and scroll to zoom. **Q / E** also rotate the view. **B** opens Build, **M** opens Menu, **R** rotates furniture, **Delete** selects removal, **Space** pauses, and **Esc** cancels. The camera controls also offer an overhead view and full, cutaway, or low walls. On narrow screens, choosing an item closes the catalog while keeping the construction tool active; use Catalog or Build to reopen it, or Esc / Cancel to clear the tool.

The game saves automatically in this browser every 30 seconds. The gear menu includes explicit save, load, and new restaurant controls. Browser storage is local to the browser and origin; clearing it removes the save. If a save cannot be loaded, automatic saving stops and the original save stays untouched until you explicitly choose Save or New Restaurant.

## Development

Vanilla JavaScript modules, Vite 8.3.4, and Three.js 0.186.1. Geometry, interface illustrations, and game content are authored in the project. No art download or account is needed at runtime.

```sh
npm run check
npm run audit
```

`check` checks JavaScript syntax, runs the Node simulation tests, and produces a production build. `audit` checks installed dependency advisories. `npm run preview` serves the production build locally.

The development server exposes a read-only `window.__cornerTable` inspection helper for input-driven browser verification. Production builds omit that helper.

Research and scope notes live in [docs/research.md](docs/research.md).
