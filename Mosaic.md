# Mosaic Design & Functionality Document — v2

> **Status**: Fully Implemented & Decoupled
> **Last updated**: 2026-06-12
> **Context**: This document details the live architecture, themes, sequenced choreography, and transition behaviors implemented on the 4x7 (28-tile) interactive Family Reunion Mosaic grid.

---

## Decoupled Architecture

The Mosaic grid operates on a strict separation of concerns between **Logical Scheduling State** and **Visual Rendering State**.

### 1. Logical State (`assigned` vs. `unassigned`)
* Managed by [MosaicDirector.js](file:///c:/Users/qtiph/OneDrive/Desktop/Deploy/FamilyReunion/familyreunion/src/newComponents/sections/MosaicDirector.js) using the `zoneId` field on tiles.
* **Assigned**: Tile has a non-null `zoneId` (belongs to an active layout zone).
* **Unassigned**: Tile has `zoneId === null`. 
* **Targeted Overlap Cleanup**: When a new manual layout is triggered, the director checks for active zones that overlap with the targeted coordinates. It destroys and frees **only** those overlapping zones (setting their tiles to `zoneId = null`). Active zones that do not overlap remain completely active and untouched.
* **Decoupled Visuals**: Transitioning or freeing a zone does **not** trigger visual resets or crop wipes on the rest of the board. Visual state (image content, crop coordinates) remains frozen until a cell is actively overwritten by a new theme assignment.

### 2. Visual State (`content`, `cropLayout`, `transition`)
* Managed at the cell level in [MosaicTile.js](file:///c:/Users/qtiph/OneDrive/Desktop/Deploy/FamilyReunion/familyreunion/src/newComponents/sections/MosaicTile.js) and [MosaicTile.css](file:///c:/Users/qtiph/OneDrive/Desktop/Deploy/FamilyReunion/familyreunion/src/newComponents/sections/MosaicTile.css).
* Contains the actual image URL (`value`), initials (`label`), crop layout boundaries (`cropLayout`), and transition instructions.
* Changing a layout or assigning a theme only modifies the visual properties of targeted cells, leaving the rest of the board completely unaffected.

---

## Grid Layouts (Themes)

The grid allocates space dynamically for the following layouts based on unassigned tile availability:

| Layout ID | Size | Description | Coordinated Data Mapping |
| :--- | :--- | :--- | :--- |
| **`hero`** | `4x4` | Giant portrait merge | Slices a single person's avatar into 16 quadrants. |
| **`portrait`** | `3x3` | Medium portrait merge | Slices a single person's avatar into 9 quadrants. |
| **`mini`** | `2x2` | Small portrait merge | Slices a single person's avatar into 4 quadrants. |
| **`lineage`** | `1x5` | Vertical column stack | Vertical cascade of branch ancestors representing Branches 1 to 5. |
| **`memorial`** | `3x3` or `2x3` | Group highlight | Renders a center "In Loving Memory" Title Card, surrounded by deceased profile avatars and deep plum solid colors. |
| **`birthdays`** | `3x3` or `2x3` | Group highlight | Renders a center "[Month] Birthdays" Title Card, surrounded by birthdays in the current month and warm gold/rose colors. |
| **`branchHighlight`** | `3x3` or `2x3` | Group highlight | Renders a center "[Leader]'s Line" Title Card, surrounded by branch member avatars and branch-specific palette colors. |
| **`singleRefresh`** | `1x1` | Single cell refresh | Swaps a single random avatar with a new profile picture. |

---

## Sequenced Effects (Choreography)

Effects are stagger and timing functions implemented in [MosaicEffects.js](file:///c:/Users/qtiph/OneDrive/Desktop/Deploy/FamilyReunion/familyreunion/src/newComponents/sections/MosaicEffects.js) that coordinate when each tile inside a zone transitions.

* **`single-sheet`** (New):
  * **Unified Reveal**: Instantly assigns final image slice values to the underlying tiles, while rendering a single grid-aligned overlay on top that slides, fades, or zooms as one continuous sheet.
  * **Handoff**: Dissolves once the animation duration completes, revealing the static quadrants underneath.
* **`spiral`** (New):
  * **Winding Sweep**: Traverses the zone coordinates in a winding path starting from the outer corner, spiraling inward (70ms stagger per tile).
* **`diagonal-wave`** (New):
  * **Diagonal Sweep**: Groups tiles by their diagonal sum (`row + col` relative to top-left) so that diagonal lines of cells flip or slide in unison (120ms stagger per diagonal line).
* **`random-stagger`** (New):
  * **Puzzle Reveal**: Shuffles targeted tile coordinates randomly and triggers transitions in rapid succession (40ms stagger).
* **`repetition-to-unity`**:
  * **Merger Sequence**: Flipped first to show 16 identical full-sized avatars of the person, holds for 1.5 seconds, then ripple-flips to reveal the merged quadrants.
* **`lineage-cascade`**:
  * **Waterfall Flow**: Cascades transitions vertically down a 1x5 column from top to bottom (200ms stagger).
* **`ripple`**:
  * **Radial Sweep**: Calculates distance from the zone center and ripples outwards.
* **`wave`**:
  * **Linear Sweep**: Sweeps left-to-right column-by-column.
* **`domino`**:
  * **Chain Reaction**: Picks a random start cell and triggers adjacent unflipped cells in a winding branch.
* **`glitch` / `storm`**:
  * **Burst Flips**: SNappy, chaotic random color flips that settle to target assets.
* **`breath` / `echo`**:
  * **Opacity shifts**: Gentle opacity fades and pulses.
* **`hold`**:
  * **Static swap**: Changes cell content immediately without transition properties.

---

## Cell Transitions

The visual styles executed at the single cell card level:

* **`flip`**:
  * Individual Y-axis or X-axis 3D rotations (`rotateY`/`rotateX`) with clipping to prevent leakage.
* **`slide`**:
  * Translate slide-outs and slide-ins from top, bottom, left, or right (`translateX`/`translateY`).
* **`fade`**:
  * Clean opacity crossfades.
* **`scale`** (New):
  * Bouncy, premium scaling zoom-in (`scale(0.3) -> scale(1)`) utilizing bouncy bezier transitions (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
* **`none`**:
  * Instant visual swap.

---

## Testing Dashboard Functionality

A manual control selector dashboard panel is available at the bottom of the section in [NewMosaicSection.js](file:///c:/Users/qtiph/OneDrive/Desktop/Deploy/FamilyReunion/familyreunion/src/newComponents/sections/NewMosaicSection.js) to test layout, effect, and transition combinations in isolation:

1. **Selector Synchronization**: Selecting a Layout automatically filters and updates the compatible Effects, and selecting an Effect dynamically updates and validates the compatible Transitions on the fly.
2. **⚡ Run**: Triggers the selected custom sequence:
   * Finds space for the layout. If the grid is full, it defaults to the top-left `(0,0)` position.
   * Performs an intersection check, freeing and destroying **only** the zones that overlap with the new coordinates.
   * Sets the `zoneId` on only the targeted tiles, transitions them (or renders the single-sheet overlay), and leaves the rest of the board completely untouched.
3. **🔄 Reset**: Destroys all manual zones, resets tiles to the initial grid (populated with demo profiles), and clears active overlays.

## Mosaic v3

Mosaic Live Tile System — Architecture Spec

The Mental Model First

The grid is a living bulletin board. It is never fully controlled and never fully chaotic.
Two independent forces are always at work on it simultaneously:


A Priority Coordinator that plans and executes themed story zones (the interesting stuff)
An Opportunity Coordinator that quietly keeps idle tiles from going stale (the ambient filler)


They share one resource: the 28-tile grid. They communicate only through a shared Allocation Map — a flat record of which tiles are currently owned by whom. They never talk to each other directly.


1. The Grid

A 4-column × 7-row grid = 28 tiles. Each tile is identified by { row, col } (0-indexed).

Every tile has exactly one of these allocation states at any moment:

js{
  row: 2,
  col: 1,
  state: "idle" | "opportunity" | "priority",
  zoneId: null | "zone-abc123",
  content: { ... },   // whatever is currently rendered/frozen on this tile
}

state is the only thing the coordinators check before claiming tiles. If state !== "idle" — hands off.


2. The Allocation Map

A single source of truth. A flat array of 28 tile objects held in React state.

js// Singleton — lives in the top-level MosaicSection component
const [tileMap, setTileMap] = useState(
  Array.from({ length: 28 }, (_, i) => ({
    id: i,
    row: Math.floor(i / 4),
    col: i % 4,
    state: "idle",
    zoneId: null,
    content: null,
  }))
);

Two operations only:


allocate(tileIds, zoneId, state) — marks tiles as owned
release(zoneId) — sets all tiles with that zoneId back to state: "idle", zoneId: null


Both operations are atomic — they happen in a single setTileMap call. No tile is ever in a half-allocated state.


3. On-Load Data Fetch

Before either coordinator starts, the component fetches and caches:

jsconst mosaicData = {
  profiles: [],        // minimum 40 profiles with photo, name, branch, gen, birthdate
  birthdays: {},       // grouped by month: { "June": [...], "July": [...] }
  deceased: [],        // profiles where sunsetDate is set
  branches: {},        // grouped by branch name: { "Smith Side": [...] }
  recentAdditions: [], // profiles added in last 30 days
}

This cache is the only data source for both coordinators. No coordinator ever fetches from Supabase at execution time — that would introduce latency mid-animation. The cache is refreshed once on mount, optionally on a long interval (e.g. every 10 minutes) in the background.


4. Themes

A Theme is a blueprint. It defines what a zone wants to look like, but not where it lives or when it runs. The scheduler figures that out.

Theme Shape

js{
  id: "birthdays",
  label: "June Birthdays",           // dynamically generated at execution time
  coordinatorType: "priority",        // "priority" | "opportunity"
  weight: 2,                          // how often it enters the priority queue (1=rare, 3=common)

  // Geometry — ordered from most preferred to least preferred
  geometryPreferences: [
    { cols: 2, rows: 4 },            // try this first
    { cols: 2, rows: 3 },            // fall back to this
    { cols: 1, rows: 4 },            // then this
  ],

  // Data requirements
  minProfiles: 2,                     // theme won't fire if fewer than 2 profiles available
  dataKey: "birthdays",              // which key in mosaicData to pull from
  dataFilter: (data, now) =>         // optional filter fn — e.g. current month only
    data.birthdays[getCurrentMonth()],

  // Color palette — picked at execution time from this list
  palette: ["rosewood", "gold", "blush"],

  // Tile layout builder — given N profiles and a geometry, returns tile instructions
  buildLayout: (profiles, geometry, palette) => [ ...tileInstructions ],

  // Effect preferences — ordered most preferred to least
  effectPreferences: ["diagonal-wave", "ripple", "wave", "random-stagger"],

  // Transition preferences — ordered most preferred to least
  transitionPreferences: ["flip", "slide", "fade"],

  // How long the zone holds its final state before releasing (ms)
  holdDuration: 1000,
}

The buildLayout Function

This is the heart of a theme. It takes the available profiles and geometry, and returns an array of tile instructions — one per tile in the zone. This is where the mix of profiles, labels, colors, and icons is decided.

js// Example: birthdays theme with 4 profiles in a 2x3 zone = 6 tiles
buildLayout: (profiles, { cols, rows }, palette) => {
  const total = cols * rows;
  const instructions = [];

  // Tile 0: always the label tile
  instructions.push({
    type: "label",
    text: `${getCurrentMonth()} Birthdays`,
    icon: "ti-cake",
    bg: palette.primary,
  });

  // Tiles 1–N: profile tiles (one per available profile)
  profiles.slice(0, total - 1).forEach(p => {
    instructions.push({
      type: "profile",
      photoUrl: p.photoUrl,
      initials: p.initials,
      name: p.firstName,
      sub: formatDate(p.birthdate),
      bg: palette.secondary,
    });
  });

  // Fill remaining tiles with color blocks if profiles < total - 1
  while (instructions.length < total) {
    instructions.push({
      type: "color",
      bg: palette.accent,
    });
  }

  return instructions;
}

No theme knows about the grid, tile positions, or animations. It only knows about content.


5. Tile Instruction Types

Every tile in every zone gets one of these instruction types:

TypeWhat it rendersprofileAvatar photo or initials + optional name/sub labellabelLarge text + optional icon, themed backgroundcolorSolid brand color block, no contenticonLarge centered Tabler icon on themed backgroundstatA number + label (e.g. "12 members")initialLarge initials only, no photo


6. Priority Coordinator

Responsible for themed story zones. Runs on its own independent timer loop.

Behavior

every 3–5 seconds (randomized cooldown):
  1. Pop the next theme from the priority queue
  2. Run dataFilter — does this theme have enough data to fire? (minProfiles check)
     - If NO → skip this theme, re-enqueue it, wait for next cooldown
  3. Find available geometry:
     - Walk geometryPreferences in order
     - For each geometry, call canFit(geometry, tileMap) — does the grid have a
       contiguous free rectangle of that size?
     - If NONE fit → don't skip, hold this theme. Check every 0.5s until space opens.
  4. Once space is confirmed:
     - Pick a color palette at execution time from theme.palette (random from list)
     - Run theme.buildLayout() to get tile instructions
     - Pick effect from theme.effectPreferences (weighted random)
     - Pick transition from theme.transitionPreferences (weighted random)
     - Allocate the tiles (state: "priority", zoneId: new uuid)
     - Hand off to ZoneExecutor
  5. Reset cooldown timer for next theme

Priority Queue

Built on load from the themes list, weighted:

js// weight: 3 = appears 3x in the queue
const priorityQueue = buildWeightedQueue([
  { theme: "birthdays",       weight: 3 },
  { theme: "memorial",        weight: 2 },
  { theme: "branchHighlight", weight: 2 },
  { theme: "lineage",         weight: 2 },
  { theme: "mothersAndBabies",weight: 3 },
  { theme: "portrait",        weight: 2 },
  { theme: "panoramic",       weight: 3 },
  { theme: "tower",           weight: 3 },
  { theme: "hero",            weight: 1 },  // rare
]);
// Shuffle once, then rotate through indefinitely (re-shuffle when exhausted)


7. Opportunity Coordinator

Fills idle tiles with ambient color flips. Runs completely independently of the priority coordinator.

Behavior

every 2–5 seconds (randomized):
  1. Find all tiles where state === "idle"
  2. If none → skip this tick
  3. Pick a small zone from idle tiles:
     - 65% chance: pick 1–3 adjacent idle tiles → flip to brand color
     - 20% chance: pick 1 idle tile → flip to a profile avatar (random from cache)
     - 15% chance: pick 1 idle tile → flip to an icon or stat
  4. Allocate chosen tiles (state: "opportunity", zoneId: new uuid)
  5. Hand off to ZoneExecutor with a simple effect (fade or flip, no stagger needed)
  6. Zone auto-releases after animation completes + 1 second hold
     (no priority cooldown triggered — opportunity zones are invisible to priority coordinator)

Opportunity zones are intentionally cheap and fast. They never block the priority coordinator. They never reserve more than 3 tiles at once.


8. Zone Executor

A pure function (not a class). Called by either coordinator with a fully-resolved zone plan. Knows nothing about themes, coordinators, or scheduling.

jsfunction executeZone({
  zoneId,
  tiles,            // array of { row, col } — the allocated tiles in order
  instructions,     // array of tile instructions (one per tile, same order)
  effect,           // "diagonal-wave" | "ripple" | "flip" | etc.
  transition,       // "flip" | "slide" | "fade" | "scale"
  holdDuration,     // ms to hold final state before releasing
  onRelease,        // callback — called after hold, releases tiles back to idle
  updateTile,       // callback — updates a single tile's content in React state
}) {
  // 1. Build the stagger sequence (ordered list of tile indices with delays)
  const sequence = buildStaggerSequence(effect, tiles);

  // 2. Fire staggered updates
  sequence.forEach(({ tileIndex, delay }) => {
    setTimeout(() => {
      updateTile(tiles[tileIndex], instructions[tileIndex], transition);
    }, delay);
  });

  // 3. After all animations complete + hold duration, release
  const totalAnimationTime = sequence[sequence.length - 1].delay + TRANSITION_DURATION;
  setTimeout(onRelease, totalAnimationTime + holdDuration);
}


9. Stagger Sequences (Effects)

Each effect is a pure function: takes an array of { row, col } coords and returns them in a specific order with delay offsets.

js// All effects have this signature:
// (coords: {row, col}[]) => {tileIndex: number, delay: number}[]

const effects = {
  "diagonal-wave": (coords) => {
    // Group by (row + col), sort groups, assign 120ms between groups
    return groupByDiagonal(coords).flatMap((group, i) =>
      group.map(tileIndex => ({ tileIndex, delay: i * 120 }))
    );
  },
  "ripple": (coords) => {
    // Sort by distance from center coord, 100ms between each
    return sortByDistanceFromCenter(coords)
      .map((tileIndex, i) => ({ tileIndex, delay: i * 100 }));
  },
  "wave": (coords) => {
    // Group by col (left to right), 80ms between columns
    return groupByCol(coords).flatMap((group, i) =>
      group.map(tileIndex => ({ tileIndex, delay: i * 80 }))
    );
  },
  "domino": (coords) => {
    // Random walk from a random start, 200ms between steps
    return randomWalk(coords)
      .map((tileIndex, i) => ({ tileIndex, delay: i * 200 }));
  },
  "random-stagger": (coords) => {
    // Shuffle, 40ms between each
    return shuffle([...coords])
      .map((tileIndex, i) => ({ tileIndex, delay: i * 40 }));
  },
  "sync": (coords) => {
    // All at once
    return coords.map(tileIndex => ({ tileIndex, delay: 0 }));
  },
  "spiral": (coords) => {
    // Wind inward from outer edge, 70ms between each
    return spiralOrder(coords)
      .map((tileIndex, i) => ({ tileIndex, delay: i * 70 }));
  },
  "lineage-cascade": (coords) => {
    // Top to bottom within a column, 200ms between each
    return sortByRow(coords)
      .map((tileIndex, i) => ({ tileIndex, delay: i * 200 }));
  },
};


10. canFit — The Space Finder

The most important utility function. Called by the priority coordinator before claiming any tiles.

jsfunction canFit(geometry, tileMap) {
  const { cols, rows } = geometry;
  const grid = tileMap; // flat array of 28 tiles

  for (let startRow = 0; startRow <= 7 - rows; startRow++) {
    for (let startCol = 0; startCol <= 4 - cols; startCol++) {
      // Check if every tile in this rectangle is idle
      const candidates = [];
      let fits = true;

      for (let r = startRow; r < startRow + rows; r++) {
        for (let c = startCol; c < startCol + cols; c++) {
          const tile = getTile(grid, r, c);
          if (tile.state !== "idle") { fits = false; break; }
          candidates.push(tile);
        }
        if (!fits) break;
      }

      if (fits) return candidates; // returns the tile objects to claim
    }
  }

  return null; // no space found
}

Scans top-left to bottom-right, returns the first available rectangle. Simple, predictable, fast.


11. File Structure

/mosaic
  MosaicSection.jsx       ← React component: holds tileMap state, mounts coordinators
  MosaicTile.jsx          ← Individual tile renderer: receives content + transition, animates
  coordinators/
    PriorityCoordinator.js  ← Priority loop, queue management, space-waiting logic
    OpportunityCoordinator.js ← Opportunity loop, idle fill logic
  themes/
    index.js              ← Exports all theme definitions
    birthdays.js
    memorial.js
    branchHighlight.js
    lineage.js
    mothersAndBabies.js
    portrait.js           ← covers portrait, panoramic, tower, hero, mini
  engine/
    ZoneExecutor.js       ← Executes a resolved zone plan (stagger + animate + release)
    effects.js            ← All stagger sequence functions
    canFit.js             ← Rectangle space finder
    buildWeightedQueue.js ← Queue builder with weights
    palette.js            ← Curated brand color palettes, picker function
  data/
    fetchMosaicData.js    ← Single on-load fetch, returns mosaicData cache


12. What the Agent Got Wrong (and Why)

Agent's approachCorrect approachZones have fixed 12–18 second lifespansZone lifespan = animation time + 1s hold, nothing moreMosaicDirector is one class doing everythingTwo independent coordinators + one executor, strict separationThemes have fixed geometriesThemes have geometry preference lists, data-driven sizingCoordinators know about each otherCoordinators only share the tileMap — no direct couplingData fetched per-zone at execution timeAll data fetched once on mount, cached, drawn from locallyOpportunity tiles are complex themed layoutsOpportunity tiles are cheap, fast, mostly just color resetsZone lifespan timer starts on zone creationZone lifespan timer starts when last tile finishes animating


13. Summary Flow (One Priority Zone, Start to Finish)

1. PriorityCoordinator cooldown expires (3–5s)
2. Pop "birthdays" from weighted queue
3. dataFilter → 4 June birthdays found in cache ✓
4. Walk geometryPreferences:
   - Try 2×4 → canFit() → null (blocked)
   - Try 2×3 → canFit() → returns 6 tile objects ✓
5. Pick palette: "rosewood" (random from theme.palette)
6. buildLayout(4 profiles, {cols:2, rows:3}, palette) → 6 tile instructions
7. Pick effect: "diagonal-wave" (first in effectPreferences)
8. Pick transition: "flip" (first in transitionPreferences)
9. allocate(6 tiles, "zone-abc", "priority") → tileMap updated
10. executeZone({ tiles, instructions, effect, transition, holdDuration: 1000 })
11. ZoneExecutor builds diagonal-wave stagger sequence
12. Staggered setTimeouts fire → updateTile() called per tile → MosaicTile animates
13. Last tile finishes → wait 1000ms hold
14. onRelease() → release("zone-abc") → 6 tiles back to state: "idle"
15. PriorityCoordinator resets cooldown, pops next theme