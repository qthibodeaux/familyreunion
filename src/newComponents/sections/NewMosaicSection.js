import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import MosaicTile from "./MosaicTile";
import PriorityCoordinator from "./mosaic/coordinators/PriorityCoordinator";
import OpportunityCoordinator from "./mosaic/coordinators/OpportunityCoordinator";
import { fetchMosaicData, buildInitialTileMap } from "./mosaic/data/fetchMosaicData";
import { PRIORITY_THEMES } from "./mosaic/themes";
import "./NewMosaicSection.css";

const emptyMosaicData = {
  profiles: [],
  birthdays: {},
  deceased: [],
  branches: {},
  recentAdditions: [],
};

const NewMosaicSection = () => {
  const [tileMap, setTileMap] = useState(() => buildInitialTileMap());
  const [mosaicData, setMosaicData] = useState(emptyMosaicData);
  const tileMapRef = useRef(tileMap);
  const mosaicDataRef = useRef(mosaicData);
  const timersRef = useRef(new Set());
  const priorityRef = useRef(null);
  const opportunityRef = useRef(null);
  const coordinatorsStartedRef = useRef(false);

  useEffect(() => {
    tileMapRef.current = tileMap;
  }, [tileMap]);

  useEffect(() => {
    mosaicDataRef.current = mosaicData;
  }, [mosaicData]);

  const registerTimer = useCallback((timer) => {
    timersRef.current.add(timer);
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const allocate = useCallback((tileIds, zoneId, state) => {
    const tileIdSet = new Set(tileIds);
    const current = tileMapRef.current;
    const canAllocate = current
      .filter((tile) => tileIdSet.has(tile.id))
      .every((tile) => tile.state === "idle");

    if (!canAllocate) return false;

    const next = current.map((tile) =>
        tileIdSet.has(tile.id) && tile.state === "idle"
          ? {
              ...tile,
              state,
              zoneId,
            }
          : tile
    );
    tileMapRef.current = next;
    setTileMap(next);
    return true;
  }, []);

  const release = useCallback((zoneId) => {
    const next = tileMapRef.current.map((tile) =>
        tile.zoneId === zoneId
          ? {
              ...tile,
              state: "idle",
              zoneId: null,
            }
          : tile
    );
    tileMapRef.current = next;
    setTileMap(next);
  }, []);

  const updateTile = useCallback((tileId, instruction, transition) => {
    const next = tileMapRef.current.map((tile) => {
        if (tile.id !== tileId) return tile;

        return {
          ...tile,
          content: instruction,
          transition,
          cropLayout: instruction.cropLayout || null,
          cropRegion: instruction.cropRegion || "full",
        };
      });
    tileMapRef.current = next;
    setTileMap(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const data = await fetchMosaicData(supabase);
      if (cancelled) return;

      mosaicDataRef.current = data;
      setMosaicData((prev) => {
        if (prev.profiles.length === 0) {
          const initialTileMap = buildInitialTileMap(data.profiles);
          tileMapRef.current = initialTileMap;
          setTileMap(initialTileMap);
        }
        return data;
      });
    };

    load();

    const interval = setInterval(load, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (mosaicData.profiles.length === 0) return undefined;
    if (coordinatorsStartedRef.current) return undefined;

    coordinatorsStartedRef.current = true;

    const shared = {
      getTileMap: () => tileMapRef.current,
      getMosaicData: () => mosaicDataRef.current,
      allocate,
      release,
      updateTile,
      registerTimer,
    };

    priorityRef.current = new PriorityCoordinator({
      ...shared,
      themes: PRIORITY_THEMES,
    });
    opportunityRef.current = new OpportunityCoordinator(shared);

    priorityRef.current.start();
    opportunityRef.current.start();

    return () => {
      priorityRef.current?.stop();
      opportunityRef.current?.stop();
      priorityRef.current = null;
      opportunityRef.current = null;
      clearAllTimers();
      coordinatorsStartedRef.current = false;
    };
  }, [mosaicData.profiles.length, allocate, release, updateTile, registerTimer, clearAllTimers]);

  return (
    <div className="new-mosaic-container">
      <div className="new-mosaic-grid">
        {tileMap.map((tile) => (
          <MosaicTile key={tile.id} tile={tile} />
        ))}
      </div>
    </div>
  );
};

export default NewMosaicSection;
