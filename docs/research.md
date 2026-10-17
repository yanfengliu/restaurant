# Design research

Research accessed 2026-10-17 for Corner Table, an original browser restaurant management game.
The sources below inform the visual direction and management loop; they are not specifications for complete behavioral parity.

## Sources and observations

- [TasteMaker official Steam page](https://store.steampowered.com/app/1289340/TasteMaker/) describes a small plot that expands through profit, construction and decoration, employee priorities, menu composition and prices, hygiene, restrooms, customer satisfaction, and six scenarios.
- [Small Update, 27 May 2024](https://store.steampowered.com/news/app/1289340/view/4150708808482745314?l=english), supplied by the user, adds three painting frames, a wall clock, and three flower boxes.
- The supplied post's [body image](https://clan.akamai.steamstatic.com/images/37954720/b9466df4a643fb6a160cd73f79fa9cb46291ff23.png) shows peach vertical wall panels with dark caps and skirting, rectangular and oval frames, a cream clock, and slatted wood boxes holding yellow, red, or white flowers.
- The same post's [header image](https://clan.akamai.steamstatic.com/images/37954720/526369413e1bc88dd21f4e46df01e9a5828aa443.png) shows warm wood square tables, ivory chairs, red table flowers, patterned red floor tiles, and soft isometric lighting.
- [Devblog 40, 3 March 2023](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/5070528176566335005) explains contextual teaching, independent restroom need, cleaning frequency, concise object tiles, tooltips, stronger early profits, and customer arrivals affected by reviews.
- Its [interface screenshot](https://clan.akamai.steamstatic.com/images/37954720/1509601b504a5a0d36ef50eee922fc4671d33758.jpg) was inspected at native resolution: a compact black title bar and close control, charcoal category strip, pale gray panel, four columns of gray object tiles with rendered item previews and prices, hover details, and an otherwise unobstructed 3D room.
- [Devblog 30, 20 October 2022](https://steamcommunity.com/games/1289340/announcements/detail/3555054653455218436) explains one employee class with task priorities, configurable clothes, and three statistics: cooking, speed, and clumsiness.
- [Devblog 22, 26 May 2022](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/4437747060827370725) explains employee room zoning, table-specific dishes, and visible storage inventories.
- [The full-release post, 21 April 2023](https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/5133583099799216886) explains selecting item colors before placement, dynamically generated item icons, floor and wall colors, and continued decoration work.
- The [official announcement index](https://steamcommunity.com/app/1289340/allnews/) provides the chronology and further developer context.
- A [community strategy guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3296695712) corroborates the importance of clear routes, kitchen equipment, decor near guests, prices, employee priorities, and restrooms; it is secondary evidence rather than an implementation authority.

The exact supplied post and developer notes were retrieved from Steam's public HTML event payload and public news API when the web reader could not render the pages.
The community guide's initial fetch contained a Steam content interstitial; the search index exposed the guide text.
The original desktop game has not been played in this task; no installed-game behavior is claimed as observed.

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
Behavioral and visual checks of Corner Table establish that this game's controls and systems work within the tested bounds; they cannot establish exact parity with a game that was not directly exercised.

## Toolchain sources

Pinned versions were checked against npm registry metadata on 2026-10-17: Vite 8.3.4, Three.js 0.186.1.
The local runtime is Node.js 24.12.0, pinned in `.nvmrc`.
[Vite documentation](https://vite.dev/guide/) and [Three.js documentation](https://threejs.org/docs/) are the primary technical references.
