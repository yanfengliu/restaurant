# Design research

Research accessed 2026-10-17 for Corner Table, an original browser restaurant management game.
The current priority is matching the observed reference behavior and visuals before creative departures; observations and remaining gaps below bound what has actually been verified.

## Sources and observations

- [TasteMaker official Steam page](https://store.steampowered.com/app/1289340/TasteMaker/) describes a small plot that expands through profit, construction and decoration, employee priorities, menu composition and prices, hygiene, restrooms, customer satisfaction, and six scenarios.
- [Small Update, 27 May 2024](https://store.steampowered.com/news/app/1289340/view/4150708808482745314?l=english), supplied by the user, adds three painting frames, a wall clock, and three flower boxes.
- The supplied post's [body image](https://clan.akamai.steamstatic.com/images/37954720/b9466df4a643fb6a160cd73f79fa9cb46291ff23.png) shows peach vertical wall panels with dark caps and skirting, rectangular and oval frames, a cream clock, and slatted wood boxes holding yellow, red, or white flowers.
- The same post's [header image](https://clan.akamai.steamstatic.com/images/37954720/526369413e1bc88dd21f4e46df01e9a5828aa443.png) shows warm wood square tables, ivory chairs, red table flowers, patterned red floor tiles, and soft isometric lighting.
- [Devblog 40, 3 March 2023](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/5070528176566335005) explains contextual teaching, independent restroom need, cleaning frequency, concise object tiles, tooltips, stronger early profits, and customer arrivals affected by reviews.
- Its [interface screenshot](https://clan.akamai.steamstatic.com/images/37954720/1509601b504a5a0d36ef50eee922fc4671d33758.jpg) was inspected at native resolution: a compact black title bar and close control, charcoal category strip, pale gray panel, four columns of gray object tiles with rendered item previews and prices, hover details, and an otherwise unobstructed 3D room.
- [Devblog 30, 20 October 2022](https://steamcommunity.com/games/1289340/announcements/detail/3555054653455218436) explains one employee class with task priorities, configurable clothes, and three statistics: cooking, speed, and clumsiness.
- [Devblog 22, 26 May 2022](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/4437747060827370725) explains employee room zoning, table-specific dishes, and visible storage inventories.
- [Devblog 24, 27 August 2022](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/4514316500009912657) replaces floor ingredient piles with deliveries limited by rack capacity; delivered ingredients begin at full quality and slowly age. The inventory window displays quality and dims ingredients unused by the current menu.
- [Devblog 34, 17 November 2022](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/4789043687474141157) describes strict named staff zones, inaccessible-equipment feedback, zone-wide table menu settings, and dirty tableware reducing hygiene. Collection favors the dirtiest tableware, while the hygiene overlay shows floor dirt and dirty dishes.
- Devblog 30 also links clumsiness to broken tableware, cooking to meal quality, and speed to walking, with stronger candidates earning more. Its historical tableware price of 25 differs from the installed build's observed 15; the direct observation takes precedence for the current balancing target.
- [The full-release post, 21 April 2023](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/5133583099799216886) explains selecting item colors before placement, dynamically generated item icons, floor and wall colors, and continued decoration work.
- The [official announcement index](https://steamcommunity.com/app/1289340/allnews/) provides the chronology and further developer context.
- A [community strategy guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3296695712) corroborates the importance of clear routes, kitchen equipment, decor near guests, prices, employee priorities, and restrooms; it is secondary evidence rather than an implementation authority.

The exact supplied post and developer notes were retrieved from Steam's public HTML event payload and public news API when the web reader could not render the pages.
The community guide's initial fetch contained a Steam content interstitial; the search index exposed the guide text.
The installed desktop game was directly exercised on 2026-10-17 as bounded below; public-source descriptions remain distinct from those observations.

## Installed-game study, 2026-10-17

The installed Steam build was 20401477. A new Fast Food scenario was studied at 2560 × 1440 from about 13:19 to 13:25 PDT through actual native controls, using the Computer Use skill. Load was disabled at startup; no existing save was opened. The visible game was necessary because the native control flow could not be exercised headlessly. No assets or code were extracted.

- The scenario selector displayed six cards, with later cards requiring 1, 4, 7, 10, and 15 accumulated stars. The first scenario began with an empty fenced grass plot, 3000 coins, no employees, and about 2.5 displayed reputation stars. Its three goals concerned monthly fries revenue, fries-and-nuggets revenue, and a wait-time/population target.
- The first tutorial taught WASD or screen-edge camera panning. A W keypress visibly panned the camera. The pause and play icons changed the active speed and displayed pause feedback; the calendar advanced while running. Zoom, orbit, and floor switching were not exercised.
- Construction used an isometric grid. A drag created an axis-aligned wall run at 12 coins per segment; each observed three-segment run deducted 36 coins. Closing four wall runs automatically filled the enclosed room with a peach wood floor. Door selection became available after enclosure; placing an entry door made the other management and furnishing icons available. The first selected door produced no visible cash deduction.
- Tables and chairs were separate purchases and placements. The first table cost 50 coins and the first chair cost 25; both deductions were observed. Placement showed footstep access hints. The table catalog displayed four columns with many styles and prices, while some object cards included a color swatch.
- The kitchen category displayed 14 equipment cards, including counters, shelves, a refrigerator, a cutting board, fryers, mixers, a coffee unit, an oven, and a cooker. No appliance was placed in this bounded study.
- The menu was a scrollable dish dependency tree. Selecting Fries showed a one-star dish, price 15, minus/plus price controls, and an unavailable Add to menu button. Missing requirements had red borders: a fryer, cutting board, potato ingredient crate, and plate. This directly confirms visible equipment, ingredient, and tableware dependencies; it does not establish how their inventories deplete or replenish.
- The tableware panel displayed six types with minus/plus order controls, each priced at 15 coins, and a Delivery button below. Clicking the plate plus control with no storage placed did not complete a purchase or show a cash deduction; the reason was not independently verified.
- Hiring displayed three candidates with monthly wages, portraits, and bars for Clumsiness, Cooking, and Speed. Hiring a candidate entered a placement state; placing the employee inside the restaurant completed that step. The management panel then listed Serving, Cooking, Dishwashing, and Cleaning. One click changed Serving from a blank square to an upward triangle. The settings tab showed the hired employee's skills and wage. No firing or clothing control was exercised.
- The live room used tall maroon brick walls, substantial dark caps and skirting, warm peach floorboards, and soft directional shadows. The interface used thin near-black full-width top and bottom strips, serif labels, pale gray panels, charcoal category tabs, and rendered object previews. The construction panel occupied about one quarter of the screen width and left the rest of the room visible.

The study stopped after two desktop-input interruptions, including a fresh window-selection recovery, rather than competing with the user's foreground input. The task-owned game process was closed by an exact-PID cleanup guard, and a follow-up process check found neither that process nor its children. The game directory exposed only its runtime log and Unity analytics files, with no save file observed. The shared Steam client was left running.

### Retained local visual evidence

The nine native screenshots below were inspected as returned by the capture tool and retained only in the ignored informational gallery. These SHA-256 values bind the observations to the inspected bytes. Native screenshots are 2560 × 1440; they are not tracked assets.

| Local gallery file | SHA-256 |
| --- | --- |
| `reference-live-01-scenario.png` | `fd18e932701cecbd5993c502f6a84f5de4a1985c9b788f3a5479d1a48eded26f` |
| `reference-live-02-construction.png` | `1c9f5e8d79be2e00d7f79ead9e9046bec60129a5877077956431998b1897c6f9` |
| `reference-live-03-enclosed-room.png` | `37a1426367272c5f1a59ee5028ac1d903c96408b779142b909e2cfba1f97439a` |
| `reference-live-04-tables.png` | `916e665929f0fc478fc0b09260eb27f9a25199f3fab4185b65f45971af94dc96` |
| `reference-live-05-kitchen.png` | `2eb3bc702a03f41e6fdd7c7e003dfb881d7d447d56c14960e7956ab10d3eaabb` |
| `reference-live-06-dish-requirements.png` | `444041829fcdb61b80677823f65110df4b3a83b551fe34f307437f453ef50a80` |
| `reference-live-07-tableware.png` | `3b61d254d53c0c6a60a2e34a078215d123109689bf4f027faefea50de67275b5` |
| `reference-live-08-hiring.png` | `68403c68658718c2f5c4570a89ae961c6e5a933837f00dc9f5eaa028c04b3db9` |
| `reference-live-09-priorities.png` | `4283a94a8c93970e538b6e95c90b4534e091677bae81ff8dc2f4d79050cdab3b` |

The inspected browser screenshot `output/playwright/current-room.png` had SHA-256 `c91f22294108cba3907708b00a17a47f828b39e008a33f3af5fc1ab1714af56b`. Its warm olive environment, isometric room, wood floor, and dark wall caps follow the researched direction. It differs visibly in lower cream walls, a more open front cutaway, finer floor texture, limited seating variants, a large light branding header, and editorial text at the right of the room. Both products place tables and chairs independently. The native game emphasizes tall saturated brick walls, compact dark bars, and a larger furnishing catalog. These are qualitative comparisons across different maps and scales, not a pixel-match score.

The native cooking, serving, payment, dirty-dish, restroom, cleaning, delivery, and long-term economy loops were not exercised to completion. Corner Table's tests and browser checks therefore establish its own behavior only; complete gameplay or visual parity is not verified.

## Direction implemented

Corner Table uses its own title, six challenge briefs, object geometry, catalog, illustrations, and interface copy.
It takes the warm low-poly room, visible kitchen work, soft light, tile construction, compact gray menus, and clear prices as its visual starting points.
The furnished bistro starts service immediately, while an empty-plot option supports building from scratch.
Original paintings, a wall clock, flower boxes, and lights carry the user's emphasis on the later decoration update.
The interface surfaces time, cash, rating, hygiene, building, food, staff priorities, finances, objectives, pause, save/load, and a short help dialog.

## Scope and remaining distinctions

This increment has a single build level, a finite original catalog, a simplified menu and employee priority system, and deterministic restaurant simulation rules.
It does not reproduce the complete reference catalog, original scenario maps or exact balancing, multi-floor building, room zoning, per-table menus, individual ingredient and tableware inventory, research-tree progression, item recoloring, configurable restroom cleaning frequency, employee clothing, achievements, translations, audio, or every guest review detail.
The art is authored procedural geometry and SVG rather than extracted assets.
Behavioral and visual checks of Corner Table establish that this game's controls and systems work within the tested bounds; the bounded installed-game study above does not establish complete parity.

## Toolchain sources

Pinned versions were checked against npm registry metadata on 2026-10-17: Vite 8.3.4, Three.js 0.186.1.
The local runtime is Node.js 24.12.0, pinned in `.nvmrc`.
[Vite documentation](https://vite.dev/guide/) and [Three.js documentation](https://threejs.org/docs/) are the primary technical references.
