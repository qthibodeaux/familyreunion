import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SearchOutlined, ArrowLeftOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { supabase } from "../supabaseClient";
import "./FamilyFinder.css";

import DefaultAvatar from "../assets/root.png";
import { getAvatarSrc } from "../utils/avatarHelper";

const PRESET_BRANCH_COLORS = [
  { bg: "#5b1f40", accent: "#f7dc92" },
  { bg: "#873d62", accent: "#f3e7b1" },
  { bg: "#4a1835", accent: "#eabea9" },
  { bg: "#30041e", accent: "#f3e7b1" },
];

function getBranchColor(branchName) {
  if (!branchName) return PRESET_BRANCH_COLORS[0];
  let hash = 0;
  for (let i = 0; i < branchName.length; i++) {
    hash = branchName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_BRANCH_COLORS.length;
  return PRESET_BRANCH_COLORS[index];
}

const AVATAR_COLORS = ["#5b1f40", "#873d62", "#f3e7b1", "#eabea9", "#30041e", "#4a1835"];

const CATEGORIES = ["lastname", "branch", "location", "gen", "ageGroup", "birthMonth"];
const CATEGORY_LABELS = {
  lastname: "Last name",
  branch: "Branch",
  location: "Location",
  gen: "Gen",
  ageGroup: "Age group",
  birthMonth: "Birth month",
};

const AGE_ORDER = [
  "Elders (65+)",
  "Senior adults (45-65)",
  "Grown folks (30-45)",
  "Young adults (18-30)",
  "Teens (13-17)",
  "Kids (Under 12)"
];
const MONTH_ORDER = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// ─── Helper Functions ───
function getFilteredProfiles(allProfiles, activeFilters, excludeCategory) {
  return allProfiles.filter((profile) => {
    // Exclude deceased profiles (branch = 0)
    if (profile.rawBranch === 0) return false;

    return CATEGORIES.every((cat) => {
      if (cat === excludeCategory) return true;
      if (!activeFilters[cat]) return true;
      return profile[cat] === activeFilters[cat];
    });
  });
}

function getAvailableValues(allProfiles, activeFilters, category) {
  const pool = getFilteredProfiles(allProfiles, activeFilters, category);
  const values = [...new Set(pool.map((p) => p[category]))];

  if (category === "ageGroup") {
    return values.sort((a, b) => AGE_ORDER.indexOf(a) - AGE_ORDER.indexOf(b));
  }
  if (category === "birthMonth") {
    return values.sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
  }
  return values.sort();
}

function getVisibleProfiles(allProfiles, activeFilters, searchText) {
  let pool = getFilteredProfiles(allProfiles, activeFilters, null);
  if (searchText.trim()) {
    const q = searchText.trim().toLowerCase();
    pool = pool.filter((p) =>
      `${p.first} ${p.nick} ${p.last}`.toLowerCase().includes(q)
    );
  }
  // Final filter: exclude deceased profiles
  return pool.filter(p => p.rawBranch !== 0);
}

function resolvePhotoUrl(photoKey) {
  return photoKey || DefaultAvatar;
}

function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Sub-Components ───

const HeroCard = ({ profile, style }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const colors = getBranchColor(profile.branch);
  const photoUrl = resolvePhotoUrl(profile.photoKey);
  const fallbackColor = getAvatarColor(profile.first + profile.last);

  const nameLine = profile.nick
    ? `${profile.first} "${profile.nick}" ${profile.last}`
    : `${profile.first} ${profile.last}`;

  return (
    <div
      className="ff-hero-card"
      style={{
        "--card-bg": colors.bg,
        "--card-accent": colors.accent,
        cursor: "pointer",
        ...style,
      }}
      onClick={() => navigate(Number(profile.rawBranch) === 1 ? `/branch/${profile.id}` : `/profile/${profile.id}`)}
    >
      <div className="ff-hero-card-visual" style={{ background: fallbackColor }}>
        {!imgError && photoUrl ? (
          <img
            src={photoUrl}
            alt={nameLine}
            className="ff-hero-card-photo"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="ff-hero-card-initials">{profile.initials}</div>
        )}
      </div>
      <div className="ff-hero-card-body">
        <div className="ff-hero-card-name">{nameLine}</div>
        <div className="ff-hero-card-meta">
          {profile.branch} · {profile.location} · {profile.gen}
        </div>
        <button
          className="ff-hero-card-btn"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(Number(profile.rawBranch) === 1 ? `/branch/${profile.id}` : `/profile/${profile.id}`);
          }}
        >
          View profile
        </button>
      </div>
    </div>
  );
};

const DeckCarousel = ({ profiles, loading }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [carouselWidth, setCarouselWidth] = useState(350);
  const carouselRef = useRef(null);

  const goToNext = useCallback(() => {
    if (isAnimating || activeIndex >= profiles.length - 1) return;
    setIsAnimating(true);
    setActiveIndex((prev) => prev + 1);
    setPullOffset(0);
    setTimeout(() => {
      setIsAnimating(false);
    }, 400);
  }, [activeIndex, profiles.length, isAnimating]);

  const goToPrev = useCallback(() => {
    if (isAnimating || activeIndex <= 0) return;
    setIsAnimating(true);
    setActiveIndex((prev) => prev - 1);
    setPullOffset(0);
    setTimeout(() => {
      setIsAnimating(false);
    }, 400);
  }, [activeIndex, isAnimating]);

  const goToIndex = useCallback((idx) => {
    if (isAnimating || idx === activeIndex) return;
    setIsAnimating(true);
    setActiveIndex(idx);
    setPullOffset(0);
    setTimeout(() => setIsAnimating(false), 400);
  }, [activeIndex, isAnimating]);

  // Reset activeIndex when the filtered profiles pool changes
  useEffect(() => {
    setActiveIndex(0);
    setPullOffset(0);
  }, [profiles]);

  // Track the carousel width for responsive touch drag translation
  useEffect(() => {
    const handleResize = () => {
      if (carouselRef.current) {
        setCarouselWidth(carouselRef.current.offsetWidth);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Touch handling with horizontal swipe physics and boundary propagation
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    let startY = 0;
    let startX = 0;
    let isMoveStarted = false;

    const onTouchStart = (e) => {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      isMoveStarted = false;
      setIsDragging(false);
      setPullOffset(0);
    };

    const onTouchMove = (e) => {
      if (isAnimating) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffX = startX - currentX;
      const diffY = startY - currentY;

      // Only handle if horizontal movement dominates and is significant
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        e.preventDefault(); // Stop snap-scrolling in parent shell
        isMoveStarted = true;
        setIsDragging(true);

        const width = el.offsetWidth || 350;
        const maxPull = width * 0.8;
        const clampedDiff = Math.max(-maxPull, Math.min(maxPull, diffX));
        setPullOffset(-clampedDiff);
      }
    };

    const onTouchEnd = (e) => {
      if (isAnimating) return;

      const currentX = e.changedTouches[0].clientX;
      const diffX = startX - currentX;
      const width = el.offsetWidth || 350;
      const threshold = width * 0.22;

      setIsDragging(false);

      if (isMoveStarted) {
        if (diffX > threshold && activeIndex < profiles.length - 1) {
          goToNext();
        } else if (diffX < -threshold && activeIndex > 0) {
          goToPrev();
        } else {
          setPullOffset(0);
        }
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isAnimating, goToNext, goToPrev, activeIndex, profiles.length]);

  // Horizontal wheel handling for desktop trackpads, while ignoring vertical wheel
  const handleWheel = useCallback((e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 5) {
      e.preventDefault();
      if (e.deltaX > 10) goToNext();
      else if (e.deltaX < -10) goToPrev();
    }
  }, [goToNext, goToPrev]);

  useEffect(() => {
    if (profiles.length <= 1) return;
    const timer = setInterval(() => {
      if (!isAnimating && !isDragging) goToNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [goToNext, isAnimating, isDragging, profiles.length]);

  if (loading) {
    return (
      <div className="ff-deck">
        <div className="ff-hero-skeleton">
          <div className="ff-hero-skeleton-visual" />
          <div className="ff-hero-skeleton-body">
            <div className="ff-hero-skeleton-line ff-hero-skeleton-line-short" />
            <div className="ff-hero-skeleton-line ff-hero-skeleton-line-long" />
            <div className="ff-hero-skeleton-btn" />
          </div>
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="ff-deck ff-deck-empty">
        <p>No one matches yet — try a different name or branch</p>
      </div>
    );
  }

  // Slice visible window of cards to maximize rendering speed (carousel uses profiles prop)
  const visibleCards = [];
  for (let offset = -1; offset <= 1; offset++) {
    const idx = activeIndex + offset;
    if (idx >= 0 && idx < profiles.length) {
      visibleCards.push({ profile: profiles[idx], index: idx });
    }
  }

  const transitionStyle = isDragging
    ? { transition: "none" }
    : { transition: "transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.4s ease" };

  return (
    <div
      className="ff-deck"
      ref={carouselRef}
      onWheel={handleWheel}
    >
      <div className="ff-deck-track">
        {visibleCards.map(({ profile, index }) => {
          // Compute layout offsets based on dragging fraction and index distance
          const dragFraction = pullOffset / (carouselWidth || 350);
          const dist = (index - activeIndex) + dragFraction;

          const positionOffset = dist * 84;
          const scale = 1 - Math.abs(dist) * 0.12;
          const opacity = Math.max(0, 1 - Math.abs(dist) * 0.65);
          const zIndex = 10 - Math.abs(index - activeIndex);

          return (
            <HeroCard
              key={profile.id}
              profile={profile}
              style={{
                position: "absolute",
                left: "12%",
                width: "76%",
                transform: `translateX(${positionOffset}%) scale(${scale})`,
                opacity,
                zIndex,
                pointerEvents: index === activeIndex ? "auto" : "none",
                ...transitionStyle,
              }}
            />
          );
        })}
      </div>

      <div className="ff-deck-dots">
        {profiles.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`ff-deck-dot ${i === activeIndex ? "ff-deck-dot-active" : ""}`}
            onClick={() => goToIndex(i)}
          />
        ))}
      </div>
    </div>
  );
};

const FilterZoneTop = ({ activeFilters, onCategoryClick, onSearchClick }) => {
  return (
    <div className="ff-filter-top">
      <div className="ff-pill-cloud">
        {CATEGORIES.map((cat, idx) => {
          const isActive = !!activeFilters[cat];
          const label = isActive ? activeFilters[cat] : CATEGORY_LABELS[cat];
          const offsetClass = idx % 2 === 1 ? "ff-pill-offset" : "";
          return (
            <button
              key={cat}
              type="button"
              className={`ff-pill ${isActive ? "ff-pill-active" : ""} ${offsetClass}`}
              onClick={() => onCategoryClick(cat)}
            >
              {label}
            </button>
          );
        })}
        <button
          type="button"
          className="ff-pill ff-pill-search"
          onClick={onSearchClick}
        >
          <SearchOutlined />
        </button>
      </div>
    </div>
  );
};

const FilterZoneDrilled = ({
  activeCategory,
  activeFilters,
  allProfiles,
  onBack,
  onToggleFilter,
  onExpandChip,
  expandedChip,
  onCollapseChip,
  onToggleCrossFilter,
}) => {
  const availableValues = useMemo(
    () => getAvailableValues(allProfiles, activeFilters, activeCategory),
    [allProfiles, activeFilters, activeCategory]
  );

  const otherCategories = CATEGORIES.filter((c) => c !== activeCategory);

  const crossFilterValues = useMemo(() => {
    if (!expandedChip) return [];
    return getAvailableValues(allProfiles, activeFilters, expandedChip);
  }, [allProfiles, activeFilters, expandedChip]);

  return (
    <div className="ff-filter-drilled">
      <div className="ff-drilled-row1">
        <button type="button" className="ff-back-btn" onClick={onBack}>
          <ArrowLeftOutlined />
        </button>
        <div className="ff-value-pills">
          {availableValues.map((val) => {
            const isActive = activeFilters[activeCategory] === val;
            return (
              <button
                key={val}
                type="button"
                className={`ff-pill ${isActive ? "ff-pill-active" : ""}`}
                onClick={() => onToggleFilter(activeCategory, val)}
              >
                {val}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ff-drilled-row2">
        {expandedChip === null ? (
          <div className="ff-chip-row">
            {otherCategories.map((cat) => {
              const isActive = !!activeFilters[cat];
              const label = isActive ? activeFilters[cat] : CATEGORY_LABELS[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  className={`ff-chip ${isActive ? "ff-chip-active" : ""}`}
                  onClick={() => onExpandChip(cat)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="ff-chip-row">
            <button
              type="button"
              className={`ff-chip ff-chip-pinned ${activeFilters[expandedChip] ? "ff-chip-active" : ""}`}
              onClick={onCollapseChip}
            >
              {activeFilters[expandedChip] || CATEGORY_LABELS[expandedChip]}
            </button>
            {crossFilterValues.map((val) => {
              const isActive = activeFilters[expandedChip] === val;
              return (
                <button
                  key={val}
                  type="button"
                  className={`ff-chip ${isActive ? "ff-chip-active" : ""}`}
                  onClick={() => onToggleCrossFilter(expandedChip, val)}
                >
                  {val}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const FilterZoneKeyboard = ({ searchText, onKeyPress, onBackspace, onSpace, onDone, onClear }) => {
  const [isShifted, setIsShifted] = useState(true);

  const handleKeyClick = (key) => {
    onKeyPress(key);
    if (isShifted) {
      setIsShifted(false);
    }
  };

  const KEYBOARD_ROWS = isShifted
    ? [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
      ["Z", "X", "C", "V", "B", "N", "M", "'", "-"],
    ]
    : [
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
      ["z", "x", "c", "v", "b", "n", "m", "'", "-"],
    ];

  return (
    <div className="ff-filter-keyboard">
      <div className="ff-keyboard-header-row">
        <button type="button" className="ff-keyboard-back-btn" onClick={onDone}>
          <ArrowLeftOutlined />
        </button>
        <div className="ff-keyboard-display">
          <SearchOutlined className="ff-keyboard-search-icon" />
          <span className="ff-keyboard-text">
            {searchText || <span className="ff-keyboard-placeholder">Search name...</span>}
          </span>
          <span className="ff-keyboard-cursor" />
          {searchText && (
            <button
              type="button"
              className="ff-keyboard-clear-btn"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            >
              <CloseCircleOutlined />
            </button>
          )}
        </div>
      </div>

      <div className="ff-keyboard-grid">
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} className="ff-keyboard-row">
            {row.map((key) => (
              <button
                key={key}
                type="button"
                className="ff-keyboard-key"
                onClick={() => handleKeyClick(key)}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
        <div className="ff-keyboard-row ff-keyboard-row-bottom">
          <button
            type="button"
            className={`ff-keyboard-key ff-keyboard-shift ${isShifted ? "ff-keyboard-key-active" : ""}`}
            onClick={() => setIsShifted((prev) => !prev)}
          >
            {isShifted ? "SHIFT" : "shift"}
          </button>
          <button type="button" className="ff-keyboard-key ff-keyboard-space" onClick={onSpace}>
            space
          </button>
          <button type="button" className="ff-keyboard-key ff-keyboard-delete" onClick={onBackspace}>
            delete
          </button>
          <button type="button" className="ff-keyboard-key ff-keyboard-done" onClick={onDone}>
            done
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───
const FamilyFinder = () => {
  const [profiles, setProfiles] = useState([]); // All profiles for filtering
  const [carouselProfiles, setCarouselProfiles] = useState([]); // 5 random for initial carousel
  const [loading, setLoading] = useState(true);
  const [filterZoneState, setFilterZoneState] = useState("top");
  const [activeCategory, setActiveCategory] = useState(null);
  const [expandedChip, setExpandedChip] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    lastname: null,
    branch: null,
    location: null,
    gen: null,
    ageGroup: null,
    birthMonth: null,
  });
  const [searchText, setSearchText] = useState("");
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    const fetchInitialProfiles = async () => {
      try {
        setLoading(true);

        // 1. Fetch only the IDs of living profiles (excluding branch 0)
        const { data: idData, error: idError } = await supabase
          .from("profile")
          .select("id")
          .or("branch.neq.0,branch.is.null");

        if (idError) throw idError;

        if (idData && idData.length > 0) {
          // 2. Pick up to 5 random IDs
          const randomIds = [];
          const N = idData.length;
          while (randomIds.length < Math.min(5, N)) {
            const randIdx = Math.floor(Math.random() * N);
            const selectedId = idData[randIdx].id;
            if (!randomIds.includes(selectedId)) {
              randomIds.push(selectedId);
            }
          }

          // 3. Fetch the full profiles for only these 5 random IDs
          const { data, error } = await supabase
            .from("profile")
            .select(`
              *,
              ancestor_profile:ancestor (
                id,
                firstname,
                lastname
              ),
              profilestate (
                city,
                state (
                  state_name
                )
              )
            `)
            .in("id", randomIds);

          if (error) throw error;

          const mapped = mapProfiles(data || []);
          setCarouselProfiles(mapped);
        }
      } catch (err) {
        console.error("Error fetching initial random profiles for FamilyFinder:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialProfiles();
  }, []);

  // Lazy-load the entire database from Supabase once when search/filter interface is opened or active
  useEffect(() => {
    const fetchAllProfilesForSearch = async () => {
      const shouldLoad = filterZoneState !== "top" || !!searchText || Object.values(activeFilters).some(v => v !== null);
      if (profiles.length > 0 || !shouldLoad) return;

      try {
        setLoading(true);
        console.log("Lazy loading entire profile database from Supabase for search...");

        const { data, error } = await supabase
          .from("profile")
          .select(`
            *,
            ancestor_profile:ancestor (
              id,
              firstname,
              lastname
            ),
            profilestate (
              city,
              state (
                state_name
              )
            )
          `)
          .order("firstname", { ascending: true })
          .limit(1000); // Fetch all profiles (no branch filter here so null branch profiles are included)

        if (error) throw error;

        const mapped = mapProfiles(data || []);
        setProfiles(mapped);
      } catch (err) {
        console.error("Error loading profiles for search:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchAllProfilesForSearch();
    }, 450); // Debounce buffer (lag filter) to absorb quick clicks/typing

    return () => clearTimeout(timer);
  }, [searchText, activeFilters, filterZoneState, profiles.length]);

  const mapProfiles = (data) => {
    return data.map((p) => {
      const first = p.firstname || "";
      const last = p.lastname || "";
      const nick = p.nickname || "";
      const initials = `${first[0] || ""}${last[0] || ""}`.toUpperCase();

      // Determine branch string representation
      let branchStr = "Roots";
      if (p.branch === 1) {
        branchStr = `${first}'s Branch`;
      } else if (p.branch > 1 && p.ancestor_profile) {
        branchStr = `${p.ancestor_profile.firstname}'s Branch`;
      } else if (p.branch > 1) {
        branchStr = "General Branch";
      }

      // Extract location from profilestate relationship
      const stateRow = p.profilestate?.[0];
      const locationStr = (p.branch === 0 || p.branch === 1) ? "Heaven" : (stateRow?.city || "Unknown");

      // generation calculations mapping
      let genStr = "Roots";
      if (p.branch === 1) genStr = "1st gen";
      else if (p.branch === 2) genStr = "2nd gen";
      else if (p.branch === 3) genStr = "3rd gen";
      else if (p.branch > 3) genStr = `${p.branch}th gen`;

      // Determine specific ageGroup based on user comments:
      // "Add a young adults(18-30, grown folks(30-45),senior adults(45-65)."
      let ageGroupStr = "Adults (18-64)";
      if (p.sunrise) {
        const birthDate = new Date(p.sunrise);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (age < 12) ageGroupStr = "Kids (Under 12)";
        else if (age >= 12 && age < 18) ageGroupStr = "Teens (13-17)";
        else if (age >= 18 && age <= 30) ageGroupStr = "Young adults (18-30)";
        else if (age > 30 && age <= 45) ageGroupStr = "Grown folks (30-45)";
        else if (age > 45 && age <= 65) ageGroupStr = "Senior adults (45-65)";
        else ageGroupStr = "Elders (65+)";
      }

      // birthMonth calculations mapping
      let birthMonthStr = "January";
      if (p.sunrise) {
        const months = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const monthIdx = new Date(p.sunrise).getMonth();
        birthMonthStr = months[monthIdx] || "January";
      }

      // Resolve avatar using centralized utility
      const photoUrl = getAvatarSrc(p);

      return {
        id: p.id,
        first,
        last,
        nick,
        lastname: last,
        branch: branchStr,
        rawBranch: p.branch,
        location: locationStr,
        gen: genStr,
        initials,
        photoKey: photoUrl,
        ageGroup: ageGroupStr,
        birthMonth: birthMonthStr,
      };
    });
  };

  const visibleProfiles = useMemo(
    () => getVisibleProfiles(profiles, activeFilters, searchText),
    [profiles, activeFilters, searchText]
  );

  const handleCategoryClick = useCallback((cat) => {
    setActiveCategory(cat);
    setExpandedChip(null);
    setFilterZoneState("drilled");
  }, []);

  const handleSearchClick = useCallback(() => {
    setFilterZoneState("keyboard");
  }, []);

  const handleBack = useCallback(() => {
    setFilterZoneState("top");
    setActiveCategory(null);
    setExpandedChip(null);
  }, []);

  const handleToggleFilter = useCallback((category, value) => {
    setIsThinking(true);
    setTimeout(() => {
      setActiveFilters((prev) => ({
        ...prev,
        [category]: prev[category] === value ? null : value,
      }));
      setIsThinking(false);
    }, 380); // 380ms thinking animation buffer
  }, []);

  const handleExpandChip = useCallback((cat) => {
    setExpandedChip(cat);
  }, []);

  const handleCollapseChip = useCallback(() => {
    setExpandedChip(null);
  }, []);

  const handleToggleCrossFilter = useCallback((category, value) => {
    setIsThinking(true);
    setTimeout(() => {
      setActiveFilters((prev) => ({
        ...prev,
        [category]: prev[category] === value ? null : value,
      }));
      setExpandedChip(null);
      setIsThinking(false);
    }, 380); // 380ms thinking animation buffer
  }, []);

  const handleKeyPress = useCallback((key) => {
    setSearchText((prev) => prev + key);
  }, []);

  const handleBackspace = useCallback(() => {
    setSearchText((prev) => prev.slice(0, -1));
  }, []);

  const handleSpace = useCallback(() => {
    setSearchText((prev) => prev + " ");
  }, []);

  const handleDone = useCallback(() => {
    setFilterZoneState("top");
  }, []);

  return (
    <div className="ff-container">
      <div className="ff-header">
        <span className="ff-header-label">Featured Family</span>
      </div>

      <div className="ff-carousel">
        {isThinking ? (
          <div className="ff-deck ff-deck-thinking">
            <div className="ff-thinking-card">
              <div className="ff-thinking-spinner" />
              <p className="ff-thinking-text">Exploring branches...</p>
            </div>
          </div>
        ) : (
          <DeckCarousel
            profiles={(searchText || Object.values(activeFilters).some(v => v !== null)) ? visibleProfiles : carouselProfiles}
            loading={loading}
          />
        )}
      </div>

      <div className="ff-filter-zone">
        {filterZoneState === "top" && (
          <FilterZoneTop
            activeFilters={activeFilters}
            onCategoryClick={handleCategoryClick}
            onSearchClick={handleSearchClick}
          />
        )}
        {filterZoneState === "drilled" && activeCategory && (
          <FilterZoneDrilled
            activeCategory={activeCategory}
            activeFilters={activeFilters}
            allProfiles={profiles}
            onBack={handleBack}
            onToggleFilter={handleToggleFilter}
            onExpandChip={handleExpandChip}
            expandedChip={expandedChip}
            onCollapseChip={handleCollapseChip}
            onToggleCrossFilter={handleToggleCrossFilter}
          />
        )}
        {filterZoneState === "keyboard" && (
          <FilterZoneKeyboard
            searchText={searchText}
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
            onSpace={handleSpace}
            onDone={handleDone}
            onClear={() => setSearchText("")}
          />
        )}
      </div>
    </div>
  );
};

export default FamilyFinder;
