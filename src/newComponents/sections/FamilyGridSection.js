import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "antd";
import { UserOutlined, UserAddOutlined, TeamOutlined } from "@ant-design/icons";
import { supabase } from "../../supabaseClient";
import AuthConsumer from "../../useSession";
import { getAvatarSrc } from "../../utils/avatarHelper";
import "./FamilyGridSection.css";

const TILE_COLORS = [
  { bg: "#30041e", text: "#f3e7b1" },
  { bg: "#5b1f40", text: "#f3e7b1" },
  { bg: "#873d62", text: "#fff" },
  { bg: "#1a3a2a", text: "#c8e6c9" },
  { bg: "#1b2838", text: "#90caf9" },
  { bg: "#3e2723", text: "#d7ccc8" },
  { bg: "#4a1942", text: "#e1bee7" },
  { bg: "#2c1810", text: "#eabea9" },
  { bg: "#0d2137", text: "#f3e7b1" },
];

const shuffleColors = () => {
  const shuffled = [...TILE_COLORS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 9);
};

const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const LiveTile = ({ faces, interval = 4000, colorScheme, onClick }) => {
  const [faceIdx, setFaceIdx] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (faces.length <= 1) return;
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setFaceIdx((prev) => (prev + 1) % faces.length);
        setAnimating(false);
      }, 400);
    }, interval);
    return () => clearInterval(timer);
  }, [faces.length, interval]);

  const face = faces[faceIdx];

  return (
    <div
      className={`fg-tile ${animating ? "fg-tile-flip" : ""}`}
      style={{ backgroundColor: colorScheme.bg, color: colorScheme.text }}
      onClick={onClick}
    >
      <div className="fg-tile-inner">
        {face}
      </div>
    </div>
  );
};

const AvatarFace = ({ profile, label, sublabel }) => (
  <div className="fg-face fg-face-avatar">
    <Avatar
      src={getAvatarSrc(profile)}
      icon={<UserOutlined />}
      className="fg-avatar"
    />
    <span className="fg-face-label">{label}</span>
    {sublabel && <span className="fg-face-sublabel">{sublabel}</span>}
  </div>
);

const StatFace = ({ value, label, icon }) => (
  <div className="fg-face fg-face-stat">
    {icon && <span className="fg-stat-icon">{icon}</span>}
    <span className="fg-stat-value">{value}</span>
    <span className="fg-stat-label">{label}</span>
  </div>
);

const CtaFace = ({ label, sublabel }) => (
  <div className="fg-face fg-face-cta">
    <UserAddOutlined className="fg-cta-icon" />
    <span className="fg-face-label">{label}</span>
    {sublabel && <span className="fg-face-sublabel">{sublabel}</span>}
  </div>
);

const CyclingAvatarFace = ({ profiles, label }) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (profiles.length <= 1) return;
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % profiles.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [profiles.length]);

  const current = profiles[idx];
  if (!current) return <StatFace value="0" label={label} />;

  return (
    <div className="fg-face fg-face-avatar">
      <Avatar
        src={getAvatarSrc(current)}
        icon={<UserOutlined />}
        className="fg-avatar"
      />
      <span className="fg-face-label">{current.firstname}</span>
      <span className="fg-face-sublabel">{label}</span>
    </div>
  );
};

const FamilyGridSection = () => {
  const { session, profile } = AuthConsumer();
  const navigate = useNavigate();
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tileColors] = useState(() => shuffleColors());

  const myBranch = profile?.branch;
  const myAncestor = profile?.ancestor;
  const isConnected = session && profile?.ancestor && profile?.branch;

  const fetchGridData = useCallback(async () => {
    if (!isConnected) {
      setLoading(false);
      return;
    }

    try {
      const { data: allProfiles, error } = await supabase
        .from("profile")
        .select("id, firstname, lastname, avatar_url, branch, ancestor, parent");

      if (error) throw error;

      const myBranchProfiles = allProfiles.filter(
        (p) => p.ancestor === myAncestor && p.id !== profile.id
      );
      const otherBranchProfiles = allProfiles.filter(
        (p) => p.ancestor && p.ancestor !== myAncestor && p.branch > 1
      );

      // Direct ancestors (center top): walk up from parent
      const directAncestors = [];
      let currentParentId = profile.parent;
      const visited = new Set();
      while (currentParentId && !visited.has(currentParentId)) {
        visited.add(currentParentId);
        const parentProfile = allProfiles.find((p) => p.id === currentParentId);
        if (parentProfile) {
          directAncestors.push(parentProfile);
          currentParentId = parentProfile.parent;
        } else {
          break;
        }
      }

      // Direct children (center bottom): profiles whose parent is me
      const directChildren = allProfiles.filter((p) => p.parent === profile.id);

      // Descendants below children
      const getDescendants = (parentId, depth = 0) => {
        if (depth > 5) return [];
        const children = allProfiles.filter((p) => p.parent === parentId);
        let result = [...children];
        children.forEach((child) => {
          result = result.concat(getDescendants(child.id, depth + 1));
        });
        return result;
      };

      const allDirectDescendants = [];
      directChildren.forEach((child) => {
        allDirectDescendants.push(...getDescendants(child.id));
      });

      // Branch gen above (top left): same ancestor, generation < mine
      const branchGensAbove = myBranchProfiles.filter(
        (p) => p.branch < myBranch && !directAncestors.find((a) => a.id === p.id)
      );

      // Branch same gen (middle left): same ancestor, same generation
      const branchSameGen = myBranchProfiles.filter(
        (p) => p.branch === myBranch
      );

      // Branch gen below (bottom left): same ancestor, generation > mine
      const branchGensBelow = myBranchProfiles.filter(
        (p) => p.branch > myBranch && !directChildren.find((c) => c.id === p.id) && !allDirectDescendants.find((d) => d.id === p.id)
      );

      // Other branch gen above (top right)
      const otherGensAbove = otherBranchProfiles.filter(
        (p) => p.branch < myBranch
      );

      // Other branch same gen (middle right)
      const otherSameGen = otherBranchProfiles.filter(
        (p) => p.branch === myBranch
      );

      // Other branch gen below (bottom right)
      const otherGensBelow = otherBranchProfiles.filter(
        (p) => p.branch > myBranch
      );

      setGridData({
        directAncestors,
        directChildren,
        allDirectDescendants,
        branchGensAbove,
        branchSameGen,
        branchGensBelow,
        otherGensAbove,
        otherSameGen,
        otherGensBelow,
      });
    } catch (err) {
      console.error("Error fetching family grid data:", err);
    } finally {
      setLoading(false);
    }
  }, [isConnected, myAncestor, myBranch, profile]);

  useEffect(() => {
    fetchGridData();
  }, [fetchGridData]);

  const ancestorName = useMemo(() => {
    if (!gridData?.directAncestors?.length) return "";
    const root = gridData.directAncestors[gridData.directAncestors.length - 1];
    return root.firstname;
  }, [gridData]);

  const buildTileFaces = useCallback((key, profiles, label, emptyLabel) => {
    const faces = [];
    if (profiles.length === 0) {
      faces.push(<CtaFace label={emptyLabel || "None yet"} sublabel="Get connected" />);
      return faces;
    }

    // Stat face
    faces.push(<StatFace value={profiles.length} label={label} icon={<TeamOutlined />} />);

    // Avatar cycling face
    if (profiles.length > 0) {
      const sample = profiles.slice(0, 8);
      faces.push(<CyclingAvatarFace profiles={sample} label={label} />);
    }

    return faces;
  }, []);

  // Stagger tile intervals so they don't all flip at once
  const intervals = useMemo(() => [
    3800, 4200, 3600, 5000, 0, 4400, 3400, 4800, 3200
  ], []);

  if (!session) {
    return (
      <div className="fg-container">
        <div className="fg-header">
          <h2 className="fg-title">Your Family Grid</h2>
          <p className="fg-subtitle">Sign in to see your place in the family</p>
        </div>
        <div className="fg-grid fg-grid-empty">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="fg-tile fg-tile-placeholder"
              style={{ backgroundColor: tileColors[i].bg }}
              onClick={() => navigate("/register")}
            >
              <div className="fg-tile-inner">
                <CtaFace label="Sign In" sublabel="Join the family" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!profile?.firstname) {
    return (
      <div className="fg-container">
        <div className="fg-header">
          <h2 className="fg-title">Your Family Grid</h2>
          <p className="fg-subtitle">Complete your profile to unlock your grid</p>
        </div>
        <div className="fg-grid fg-grid-empty">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="fg-tile fg-tile-placeholder"
              style={{ backgroundColor: tileColors[i].bg }}
              onClick={() => navigate("/onboarding")}
            >
              <div className="fg-tile-inner">
                <CtaFace label="Set Up Profile" sublabel="Claim your spot" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="fg-container">
        <div className="fg-header">
          <h2 className="fg-title">Your Family Grid</h2>
          <p className="fg-subtitle">Connect to the family tree to fill your grid</p>
        </div>
        <div className="fg-grid fg-grid-empty">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className={`fg-tile fg-tile-placeholder ${i === 4 ? "fg-tile-you-empty" : ""}`}
              style={{ backgroundColor: tileColors[i].bg }}
            >
              <div className="fg-tile-inner">
                {i === 4 ? (
                  <AvatarFace profile={profile} label={profile.firstname} sublabel="Connect to unlock" />
                ) : (
                  <div className="fg-face fg-face-locked">
                    <span className="fg-locked-icon">?</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading || !gridData) {
    return (
      <div className="fg-container">
        <div className="fg-header">
          <h2 className="fg-title">Your Family Grid</h2>
          <p className="fg-subtitle">Loading your family connections...</p>
        </div>
        <div className="fg-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="fg-tile fg-tile-loading" style={{ backgroundColor: tileColors[i].bg }}>
              <div className="fg-tile-inner">
                <div className="fg-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const {
    directAncestors,
    directChildren,
    allDirectDescendants,
    branchGensAbove,
    branchSameGen,
    branchGensBelow,
    otherGensAbove,
    otherSameGen,
    otherGensBelow,
  } = gridData;

  // Build faces for each tile position
  // Top-left: branch gens above
  const topLeftFaces = buildTileFaces("tl", branchGensAbove, `${ancestorName} Line · Elders`, "No elders found");

  // Top-center: direct ancestors
  const topCenterFaces = [];
  if (directAncestors.length > 0) {
    directAncestors.forEach((anc) => {
      topCenterFaces.push(
        <AvatarFace profile={anc} label={anc.firstname} sublabel={`Gen ${anc.branch}`} />
      );
    });
    topCenterFaces.push(
      <StatFace value={directAncestors.length} label="Direct ancestors above you" icon={<TeamOutlined />} />
    );
  } else {
    topCenterFaces.push(<CtaFace label="Connect Parent" sublabel="Build your lineage" />);
  }

  // Top-right: other branch gens above
  const topRightFaces = buildTileFaces("tr", otherGensAbove, "Elders · Other Branches", "No connections yet");

  // Middle-left: branch same gen
  const midLeftFaces = buildTileFaces("ml", branchSameGen, `${ancestorName} Line · Your Gen`, "Invite cousins");

  // Middle-center: YOU
  const youFaces = [
    <AvatarFace profile={profile} label={profile.firstname} sublabel="You" />,
    <StatFace value={getOrdinal(myBranch + 1)} label="Generation" />,
    <StatFace value={`${ancestorName} Line`} label="Your branch" />,
  ];

  // Middle-right: other branch same gen
  const midRightFaces = buildTileFaces("mr", otherSameGen, "Your Gen · Other Branches", "Invite cousins");

  // Bottom-left: branch gens below
  const bottomLeftFaces = buildTileFaces("bl", branchGensBelow, `${ancestorName} Line · Next Gen`, "Growing...");

  // Bottom-center: direct children
  const bottomCenterFaces = [];
  if (directChildren.length > 0) {
    directChildren.forEach((child) => {
      bottomCenterFaces.push(
        <AvatarFace profile={child} label={child.firstname} sublabel="Your child" />
      );
    });
    if (allDirectDescendants.length > 0) {
      bottomCenterFaces.push(
        <StatFace value={directChildren.length + allDirectDescendants.length} label="Your descendants" icon={<TeamOutlined />} />
      );
    }
  } else {
    bottomCenterFaces.push(<CtaFace label="Add Children" sublabel="Grow your branch" />);
  }

  // Bottom-right: other branch gens below
  const bottomRightFaces = buildTileFaces("br", otherGensBelow, "Next Gen · Other Branches", "Growing...");

  const tiles = [
    { faces: topLeftFaces, color: tileColors[0] },
    { faces: topCenterFaces, color: tileColors[1] },
    { faces: topRightFaces, color: tileColors[2] },
    { faces: midLeftFaces, color: tileColors[3] },
    { faces: youFaces, color: tileColors[4] },
    { faces: midRightFaces, color: tileColors[5] },
    { faces: bottomLeftFaces, color: tileColors[6] },
    { faces: bottomCenterFaces, color: tileColors[7] },
    { faces: bottomRightFaces, color: tileColors[8] },
  ];

  return (
    <div className="fg-container">
      <div className="fg-header">
        <h2 className="fg-title">Your Family Grid</h2>
        <p className="fg-subtitle">Your place in the {ancestorName} Line</p>
      </div>
      <div className="fg-grid">
        {tiles.map((tile, i) => (
          <LiveTile
            key={i}
            faces={tile.faces}
            interval={intervals[i]}
            colorScheme={tile.color}
          />
        ))}
      </div>
      <div className="fg-legend">
        <div className="fg-legend-item">
          <span className="fg-legend-arrow">↑</span>
          <span>Older Generations</span>
        </div>
        <div className="fg-legend-item">
          <span className="fg-legend-arrow">←</span>
          <span>{ancestorName} Line</span>
        </div>
        <div className="fg-legend-item">
          <span className="fg-legend-arrow">→</span>
          <span>Other Branches</span>
        </div>
        <div className="fg-legend-item">
          <span className="fg-legend-arrow">↓</span>
          <span>Younger Generations</span>
        </div>
      </div>
    </div>
  );
};

export default FamilyGridSection;
