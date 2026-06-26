import React, { createContext, useContext, useState } from "react";

const HomeCacheContext = createContext(null);

export const HomeCacheProvider = ({ children }) => {
  const [branchLeaders, setBranchLeaders] = useState(null);
  const [globalProfiles, setGlobalProfiles] = useState(null);
  const [lineageData, setLineageData] = useState(null);
  const [bulletinFeed, setBulletinFeed] = useState(null);
  const [mosaicProfiles, setMosaicProfiles] = useState(null);
  const [finderInitial, setFinderInitial] = useState(null);

  const value = {
    branchLeaders,
    setBranchLeaders,
    globalProfiles,
    setGlobalProfiles,
    lineageData,
    setLineageData,
    bulletinFeed,
    setBulletinFeed,
    mosaicProfiles,
    setMosaicProfiles,
    finderInitial,
    setFinderInitial,
  };

  return (
    <HomeCacheContext.Provider value={value}>
      {children}
    </HomeCacheContext.Provider>
  );
};

export const useHomeCache = () => {
  const context = useContext(HomeCacheContext);
  if (!context) {
    throw new Error("useHomeCache must be used within a HomeCacheProvider");
  }
  return context;
};
