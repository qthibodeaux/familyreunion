import { executeZone } from "../engine/ZoneExecutor";
import { PALETTES } from "../engine/palette";

const randomBetween = (min, max) => min + Math.random() * (max - min);
const pick = (items = []) => items[Math.floor(Math.random() * items.length)];
const BRAND_COLORS = [
  PALETTES.rosewood.primary,
  PALETTES.rosewood.secondary,
  PALETTES.blush.accent,
  PALETTES.gold.accent,
  PALETTES.moss.secondary,
  PALETTES.indigo.secondary,
  PALETTES.ember.accent,
];

const neighborsOf = (tile, idleTiles) => {
  const idleByCoord = new Map(idleTiles.map((candidate) => [`${candidate.row}-${candidate.col}`, candidate]));
  return [
    idleByCoord.get(`${tile.row}-${tile.col + 1}`),
    idleByCoord.get(`${tile.row + 1}-${tile.col}`),
    idleByCoord.get(`${tile.row}-${tile.col - 1}`),
    idleByCoord.get(`${tile.row - 1}-${tile.col}`),
  ].filter(Boolean);
};

class OpportunityCoordinator {
  constructor({ getTileMap, getMosaicData, allocate, release, updateTile, registerTimer }) {
    this.getTileMap = getTileMap;
    this.getMosaicData = getMosaicData;
    this.allocate = allocate;
    this.release = release;
    this.updateTile = updateTile;
    this.registerTimer = registerTimer;
    this.running = false;
    this.zoneIdCounter = 0;
  }

  start() {
    this.running = true;
    this.schedule(1200);
  }

  stop() {
    this.running = false;
  }

  schedule(delay = randomBetween(2000, 5000)) {
    if (!this.running) return;
    const timer = setTimeout(() => this.tick(), delay);
    this.registerTimer(timer);
  }

  pickAdjacentTiles(idleTiles) {
    const start = pick(idleTiles);
    if (!start) return [];

    const targetCount = 1 + Math.floor(Math.random() * 3);
    const selected = [start];

    while (selected.length < targetCount) {
      const candidates = selected.flatMap((tile) => neighborsOf(tile, idleTiles));
      const next = pick(candidates.filter((tile) => !selected.some((selectedTile) => selectedTile.id === tile.id)));
      if (!next) break;
      selected.push(next);
    }

    return selected;
  }

  tick() {
    if (!this.running) return;

    try {
      const idleTiles = this.getTileMap().filter((tile) => tile.state === "idle");
      if (idleTiles.length === 0) {
        this.schedule();
        return;
      }

      const rand = Math.random();
      let tiles = [];
      let instructions = [];

      if (rand < 0.65) {
        tiles = this.pickAdjacentTiles(idleTiles);
        instructions = tiles.map(() => ({ type: "color", bg: pick(BRAND_COLORS) }));
      } else if (rand < 0.85) {
        tiles = [pick(idleTiles)];
        const profile = pick(this.getMosaicData().profiles || []);
        instructions = [
          {
            type: "profile",
            photoUrl: profile?.avatar_url || "",
            initials: profile?.initials || "",
            name: profile?.firstname || "",
            bg: pick(BRAND_COLORS),
          },
        ];
      } else {
        tiles = [pick(idleTiles)];
        const deceasedCount = this.getMosaicData().deceased?.length || 0;
        instructions = [
          deceasedCount > 0
            ? { type: "stat", number: deceasedCount, label: "Remembered", bg: PALETTES.indigo.primary }
            : { type: "icon", icon: "tree", bg: PALETTES.moss.primary },
        ];
      }

      if (tiles.length === 0) {
        this.schedule();
        return;
      }

      const zoneId = `opportunity-${this.zoneIdCounter}`;
      this.zoneIdCounter += 1;
      const allocated = this.allocate(
        tiles.map((tile) => tile.id),
        zoneId,
        "opportunity"
      );

      if (!allocated) {
        this.schedule();
        return;
      }

      const effect = pick(["sync", "random-stagger", "ripple", "diagonal-wave"]);
      const transition = pick(["fade", "flip", "slide", "scale"]);
      const holdDuration = randomBetween(1000, 3000);

      executeZone({
        zoneId,
        tiles,
        instructions,
        effect,
        transition,
        holdDuration,
        onRelease: () => this.release(zoneId),
        updateTile: this.updateTile,
        registerTimer: this.registerTimer,
      });

      this.schedule();
    } catch (error) {
      console.error("Error in OpportunityCoordinator tick:", error);
      this.schedule(1000);
    }
  }
}

export default OpportunityCoordinator;
