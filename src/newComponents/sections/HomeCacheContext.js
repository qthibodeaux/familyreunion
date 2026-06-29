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

const noop = () => {};
const fallback = {
  branchLeaders: null, setBranchLeaders: noop,
  globalProfiles: null, setGlobalProfiles: noop,
  lineageData: null, setLineageData: noop,
  bulletinFeed: null, setBulletinFeed: noop,
  mosaicProfiles: null, setMosaicProfiles: noop,
  finderInitial: null, setFinderInitial: noop,
};

export const useHomeCache = () => {
  const context = useContext(HomeCacheContext);
  return context || fallback;
};
