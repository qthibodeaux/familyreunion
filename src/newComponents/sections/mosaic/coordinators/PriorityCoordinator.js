import { buildWeightedQueue } from "../engine/buildWeightedQueue";
import { canFit } from "../engine/canFit";
import { pickPalette } from "../engine/palette";
import { executeZone } from "../engine/ZoneExecutor";
import DefaultAvatar from "../../../../assets/root.png";

const randomBetween = (min, max) => min + Math.random() * (max - min);
const pick = (items = []) => items[Math.floor(Math.random() * items.length)];

class PriorityCoordinator {
  constructor({ themes, getTileMap, getMosaicData, allocate, release, updateTile, registerTimer }) {
    this.themes = themes;
    this.getTileMap = getTileMap;
    this.getMosaicData = getMosaicData;
    this.allocate = allocate;
    this.release = release;
    this.updateTile = updateTile;
    this.registerTimer = registerTimer;
    this.queue = buildWeightedQueue(themes);
    this.running = false;
    this.zoneIdCounter = 0;
    this.lastBoardWideEventTime = Date.now();
  }

  start() {
    this.running = true;
    this.schedule(800);
  }

  stop() {
    this.running = false;
  }

  schedule(delay = randomBetween(3000, 5000)) {
    if (!this.running) return;
    const timer = setTimeout(() => this.tick(), delay);
    this.registerTimer(timer);
  }

  triggerBoardWideEvent() {
    try {
      this.lastBoardWideEventTime = Date.now();

      // 1. Force release all active zones to reclaim the entire board
      const currentMap = this.getTileMap();
      const activeZoneIds = [...new Set(currentMap.map((t) => t.zoneId).filter(Boolean))];
      activeZoneIds.forEach((zoneId) => this.release(zoneId));

      // 2. Select event mode type: founder silhouette photo slice OR typography reunion banner
      const eventType = Math.random() > 0.5 ? "founders-merge" : "reunion-banner";
      const zoneId = `board-wide-${Date.now()}`;
      const allTileIds = currentMap.map((t) => t.id);

      // Re-allocate all 28 tiles
      const allocated = this.allocate(allTileIds, zoneId, "priority");
      if (!allocated) {
        this.schedule(1000);
        return;
      }

      const instructions = [];
      if (eventType === "founders-merge") {
        // Slice the DefaultAvatar (founders) across the entire 4x7 grid
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 4; c++) {
            instructions.push({
              type: "slice",
              photoUrl: DefaultAvatar,
              name: "John Henry & Birdie Mae",
              cropLayout: { w: 4, h: 7, x: c, y: r },
              mode: "silhouette",
            });
          }
        }
      } else {
        // Reunion Typography Banner: row-by-row poster styling
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 4; c++) {
            if (r === 0) {
              instructions.push({ type: "icon", icon: "tree", bg: "#30041e" });
            } else if (r === 1) {
              instructions.push({ type: "label", text: c === 0 ? "Est." : c === 1 ? "1885" : c === 2 ? "&" : "1909", bg: "#5b1f40" });
            } else if (r === 2) {
              instructions.push({ type: "label", text: c === 0 ? "John" : c === 1 ? "Henry" : c === 2 ? "Legacy" : "Roots", bg: "#873d62" });
            } else if (r === 3) {
              instructions.push({ type: "label", text: c === 0 ? "Birdie" : c === 1 ? "Mae" : c === 2 ? "Smith" : "Family", bg: "#5b1f40" });
            } else if (r === 4) {
              instructions.push({ type: "label", text: c === 0 ? "Love" : c === 1 ? "Unity" : c === 2 ? "Strength" : "Hope", bg: "#873d62" });
            } else if (r === 5) {
              instructions.push({ type: "label", text: c === 0 ? "Reunion" : c === 1 ? "Portal" : c === 2 ? "Year" : "2026", bg: "#5b1f40" });
            } else {
              instructions.push({ type: "icon", icon: "star", bg: "#30041e" });
            }
          }
        }
      }

      const effect = pick(["spiral", "diagonal-wave", "ripple", "random-stagger"]);
      const transition = pick(["flip", "slide", "fade", "scale"]);

      executeZone({
        zoneId,
        tiles: currentMap,
        instructions,
        effect,
        transition,
        holdDuration: 4000, // hold board-wide event for 4 seconds
        onRelease: () => this.release(zoneId),
        updateTile: this.updateTile,
        registerTimer: this.registerTimer,
      });

      // Pause next scheduling slightly longer to let users appreciate the hero moment
      this.schedule(7000);
    } catch (error) {
      console.error("Error in PriorityCoordinator triggerBoardWideEvent:", error);
      this.schedule(1000);
    }
  }

  tick() {
    if (!this.running) return;

    try {
      // Trigger board-wide special event mode every 30 to 60 seconds
      const timeSinceLast = Date.now() - this.lastBoardWideEventTime;
      if (timeSinceLast > randomBetween(30000, 60000)) {
        this.triggerBoardWideEvent();
        return;
      }

      if (this.queue.length === 0) {
        this.queue = buildWeightedQueue(this.themes);
      }

      const theme = this.queue[0];
      const data = this.getMosaicData();
      const profiles = theme.dataFilter?.(data) || data.profiles || [];

      if (profiles.length < theme.minProfiles) {
        this.queue.push(this.queue.shift());
        this.schedule();
        return;
      }

      const tileMap = this.getTileMap();
      let tiles = null;
      let geometry = null;

      for (const candidateGeometry of theme.geometryPreferences) {
        const candidateTiles = canFit(candidateGeometry, tileMap);
        if (candidateTiles) {
          tiles = candidateTiles;
          geometry = candidateGeometry;
          break;
        }
      }

      if (!tiles) {
        this.schedule(500);
        return;
      }

      this.queue.shift();
      const zoneId = `priority-${this.zoneIdCounter}`;
      this.zoneIdCounter += 1;

      const palette = pickPalette(theme.palette);
      const instructions = theme.buildLayout(profiles, geometry, palette).slice(0, tiles.length);
      while (instructions.length < tiles.length) {
        instructions.push({ type: "color", bg: palette.accent });
      }

      const allocated = this.allocate(
        tiles.map((tile) => tile.id),
        zoneId,
        "priority"
      );

      if (!allocated) {
        this.schedule(500);
        return;
      }

      executeZone({
        zoneId,
        tiles,
        instructions,
        effect: pick(theme.effectPreferences) || "sync",
        transition: pick(theme.transitionPreferences) || "flip",
        holdDuration: theme.holdDuration || 1000,
        onRelease: () => this.release(zoneId),
        updateTile: this.updateTile,
        registerTimer: this.registerTimer,
      });

      this.schedule();
    } catch (error) {
      console.error("Error in PriorityCoordinator tick:", error);
      this.schedule(1000);
    }
  }
}

export default PriorityCoordinator;
