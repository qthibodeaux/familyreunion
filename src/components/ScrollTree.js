import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Input, Button, Drawer, Spin } from "antd";
import {
  CalendarOutlined,
  EnvironmentOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  ApartmentOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { supabase } from "../supabaseClient";
import AuthConsumer from "../useSession";
import "../theme/components/ScrollTree.css";

function ScrollTree() {
  const { session } = AuthConsumer();
  const currentUserId = session?.user?.id;
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Expanded/Collapsed node mapping: { [memberId]: boolean }
  const [expandedNodes, setExpandedNodes] = useState({});
  // Current focused/clicked profile ID for breadcrumbs and highlight
  const [focusedCardId, setFocusedCardId] = useState(null);
  // Profile shown in the details bottom drawer
  const [selectedMember, setSelectedMember] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Fetch profiles and connections once on mount
  useEffect(() => {
    const loadTreeData = async () => {
      try {
        setLoading(true);
        const [
          { data: profilesData, error: profilesErr },
          { data: connectionsData, error: connsErr },
        ] = await Promise.all([
          supabase.from("profile").select("*").order("sunrise", { ascending: true }),
          supabase.from("connection").select("*").eq("status", "active"),
        ]);

        if (profilesErr) throw profilesErr;
        if (connsErr) throw connsErr;

        setProfiles(profilesData || []);
        setConnections(connectionsData || []);
      } catch (err) {
        console.error("Error loading tree data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadTreeData();
  }, []);

  // Compute multi-branch colors
  const getBranchColor = (branch) => {
    if (branch === undefined || branch === null) return "#b27db2";
    let b = branch;
    if (typeof branch === "string") {
      const match = branch.match(/\d+/);
      b = match ? parseInt(match[0], 10) : 0;
    }
    // Set up a palette of 10 modern colors for family branches
    const colors = [
      "#f3e7b1", // Founders: Warm Gold
      "#eabea9", // Branch 1: Rose Gold
      "#d4a5ff", // Branch 2: Soft Lavender
      "#873d62", // Branch 3: Deep Plum
      "#b27db2", // Branch 4: Orchid
      "#a6d8d4", // Branch 5: Soft Teal
      "#fbc8bd", // Branch 6: Pastel Coral
      "#cde6a5", // Branch 7: Sage Green
      "#ffdeb3", // Branch 8: Cream Yellow
      "#f6a7c1", // Branch 9: Soft Pink
    ];
    return colors[b % colors.length];
  };

  const getBranchLabel = (branch) => {
    if (branch === 0 || branch === "0" || branch === "Branch 0") return "Roots / Founders";
    return typeof branch === "string" && branch.startsWith("Branch") ? branch : `Branch ${branch}`;
  };

  // Compile hierarchical relationships in-memory using useMemo
  const { spouseMap, parentsOf, childrenOf, rootTrees, nodeMap } = useMemo(() => {
    if (profiles.length === 0) {
      return { spouseMap: {}, parentsOf: {}, childrenOf: {}, rootTrees: [], nodeMap: {} };
    }

    // 1. Spouses Map from connections
    const spouseMap = {};
    connections.forEach((conn) => {
      if (conn.connection_type === "spouse") {
        spouseMap[conn.profile_1] = conn.profile_2;
        spouseMap[conn.profile_2] = conn.profile_1;
      }
    });

    // 2. Parents Map
    const parentsOf = {};
    profiles.forEach((p) => {
      parentsOf[p.id] = [];
    });

    profiles.forEach((p) => {
      if (p.parent) {
        parentsOf[p.id].push(p.parent);
      }
      // Seed profiles use 'ancestor' column for their parent profile ID
      if (!p.parent && p.ancestor) {
        parentsOf[p.id].push(p.ancestor);
      }
    });

    connections.forEach((conn) => {
      if (conn.connection_type === "child") {
        parentsOf[conn.profile_2].push(conn.profile_1);
      } else if (conn.connection_type === "parent") {
        parentsOf[conn.profile_1].push(conn.profile_2);
      }
    });

    // Deduplicate
    Object.keys(parentsOf).forEach((cId) => {
      parentsOf[cId] = Array.from(new Set(parentsOf[cId]));
    });

    // Deduce spouse connections from shared children
    Object.entries(parentsOf).forEach(([childId, parents]) => {
      if (parents.length >= 2) {
        const p1 = parents[0];
        const p2 = parents[1];
        if (!spouseMap[p1] && !spouseMap[p2]) {
          spouseMap[p1] = p2;
          spouseMap[p2] = p1;
        }
      }
    });

    // 3. Children Map
    const childrenOf = {};
    profiles.forEach((p) => {
      childrenOf[p.id] = [];
    });

    profiles.forEach((c) => {
      const parents = parentsOf[c.id] || [];
      parents.forEach((pId) => {
        if (childrenOf[pId] && !childrenOf[pId].some((existing) => existing.id === c.id)) {
          childrenOf[pId].push(c);
        }
        const spouseId = spouseMap[pId];
        if (spouseId && childrenOf[spouseId] && !childrenOf[spouseId].some((existing) => existing.id === c.id)) {
          childrenOf[spouseId].push(c);
        }
      });
    });

    // 4. Resolve Roots Candidates (profiles with no parents in database)
    const rootCandidates = profiles.filter((p) => (parentsOf[p.id] || []).length === 0);
    const visitedRoots = new Set();
    const roots = [];

    rootCandidates.forEach((p) => {
      if (visitedRoots.has(p.id)) return;
      const spouseId = spouseMap[p.id];
      if (spouseId) visitedRoots.add(spouseId);
      visitedRoots.add(p.id);
      roots.push(p);
    });

    // Sort roots by sunrise or branch priority
    roots.sort((a, b) => {
      const bA = typeof a.branch === "string" ? parseInt(a.branch.replace(/\D/g, ""), 10) || 0 : a.branch || 0;
      const bB = typeof b.branch === "string" ? parseInt(b.branch.replace(/\D/g, ""), 10) || 0 : b.branch || 0;
      return bA - bB;
    });

    // 5. Build Recursive Trees
    const nodeMap = {};
    const buildTreeNode = (profile, gen = 0, visited = new Set()) => {
      if (visited.has(profile.id)) return null;
      visited.add(profile.id);

      const spouseId = spouseMap[profile.id];
      const spouse = spouseId ? profiles.find((p) => p.id === spouseId) : null;
      if (spouseId) visited.add(spouseId);

      const childProfiles = [];
      const seenChildren = new Set();
      const addChildren = (pId) => {
        const list = childrenOf[pId] || [];
        list.forEach((k) => {
          if (!seenChildren.has(k.id)) {
            seenChildren.add(k.id);
            childProfiles.push(k);
          }
        });
      };

      addChildren(profile.id);
      if (spouseId) addChildren(spouseId);

      // Sort children by birth date
      childProfiles.sort((a, b) => {
        if (!a.sunrise) return 1;
        if (!b.sunrise) return -1;
        return new Date(a.sunrise) - new Date(b.sunrise);
      });

      const childrenNodes = childProfiles
        .map((child) => buildTreeNode(child, gen + 1, visited))
        .filter(Boolean);

      const node = {
        id: profile.id,
        member: profile,
        spouse: spouse,
        generation: gen,
        children: childrenNodes,
        descendantDepth: 0,
        totalDescendants: 0,
      };

      nodeMap[profile.id] = node;
      if (spouse) {
        nodeMap[spouse.id] = node;
      }

      return node;
    };

    const rootTrees = roots.map((r) => buildTreeNode(r, 0, new Set())).filter(Boolean);

    // 6. Precompute Descendant depths
    const computeTreeNodeDepths = (node) => {
      if (!node) return;
      if (node.children.length === 0) {
        node.descendantDepth = 0;
        node.totalDescendants = 0;
        return;
      }
      node.children.forEach(computeTreeNodeDepths);
      node.descendantDepth = 1 + Math.max(...node.children.map((c) => c.descendantDepth));
      node.totalDescendants = node.children.reduce((sum, c) => sum + 1 + c.totalDescendants, 0);
    };

    rootTrees.forEach(computeTreeNodeDepths);

    return { spouseMap, parentsOf, childrenOf, rootTrees, nodeMap };
  }, [profiles, connections]);

  // Recursively expand all parents of a profile
  const expandAncestors = (childId, newExpanded = {}) => {
    const parents = parentsOf[childId] || [];
    parents.forEach((pId) => {
      if (!newExpanded[pId]) {
        newExpanded[pId] = true;
        expandAncestors(pId, newExpanded);
      }
    });
    return newExpanded;
  };

  // Initialize focus member and expand their lineage trail on data load
  useEffect(() => {
    if (profiles.length > 0 && rootTrees.length > 0 && !focusedCardId) {
      const defaultId =
        currentUserId && profiles.some((p) => p.id === currentUserId)
          ? currentUserId
          : profiles.find((p) => p.branch === 0 || p.branch === "0" || p.branch === "Branch 0")?.id ||
            rootTrees[0]?.id;

      setFocusedCardId(defaultId);

      const initialExpanded = expandAncestors(defaultId, {});
      // Make sure the primary roots themselves are expanded by default
      rootTrees.forEach((root) => {
        initialExpanded[root.id] = true;
      });
      setExpandedNodes(initialExpanded);
    }
  }, [profiles, rootTrees, currentUserId, focusedCardId]);

  // Handle Search Queries
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = profiles.filter(
      (p) =>
        `${p.firstname} ${p.lastname}`.toLowerCase().includes(q) ||
        (p.nickname && p.nickname.toLowerCase().includes(q))
    );
    setSearchResults(matches.slice(0, 5));
  }, [searchQuery, profiles]);

  // Triggered when selecting a member from search dropdown or cousin peek
  const handleSelectAndScrollToNode = (memberId, auntUncleId = null) => {
    const updatedExpanded = expandAncestors(memberId, { ...expandedNodes });
    if (auntUncleId) {
      updatedExpanded[auntUncleId] = true;
    }
    setExpandedNodes(updatedExpanded);
    setFocusedCardId(memberId);
    setSearchQuery("");

    setTimeout(() => {
      const el = document.getElementById(`member-card-${memberId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("pulse-highlight");
        setTimeout(() => {
          el.classList.remove("pulse-highlight");
        }, 2200);
      }
    }, 120);
  };

  // Traverses up the lineage to build a breadcrumb trail to focused member
  const buildBreadcrumbs = (memberId) => {
    if (!memberId) return [];
    const path = [];
    let currentId = memberId;
    const visited = new Set();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const profile = profiles.find((p) => p.id === currentId);
      if (!profile) break;

      path.unshift(profile);

      const parents = parentsOf[currentId] || [];
      if (parents.length > 0) {
        // Prefer parents with matching branch to follow branch lineage naturally
        const sameBranchParent = parents.find((pId) => {
          const parentProfile = profiles.find((p) => p.id === pId);
          return parentProfile && parentProfile.branch === profile.branch;
        });
        currentId = sameBranchParent || parents[0];
      } else {
        currentId = null;
      }
    }
    return path;
  };

  const handleExpandAll = () => {
    const allIds = {};
    profiles.forEach((p) => {
      allIds[p.id] = true;
    });
    setExpandedNodes(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedNodes({});
  };

  const handleResetToRoots = () => {
    const defaultRoot = rootTrees[0]?.id;
    if (defaultRoot) {
      handleSelectAndScrollToNode(defaultRoot);
    }
  };

  // Helper getters for avatars
  const getAvatarSrc = (avatarUrl) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith("http") || avatarUrl.startsWith("/")) return avatarUrl;
    return `${supabase.supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`;
  };

  const getInitials = (first, last) => {
    return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
  };

  const getColorHash = (id) => {
    const colors = ["#873d62", "#b27db2", "#d4a5ff", "#eabea9", "#5b1f40", "#451830"];
    return colors[Math.abs(id.charCodeAt(0)) % colors.length];
  };

  // Find cousins in the same generation under other parents (aunt/uncle branches)
  const getCousinBranchesForNode = (parentMemberId) => {
    if (!parentMemberId) return [];
    const parents = parentsOf[parentMemberId] || [];
    if (parents.length === 0) return [];

    const cousinBranches = [];
    const seenAuntUncles = new Set();

    parents.forEach((gpId) => {
      const siblings = childrenOf[gpId] || [];
      siblings.forEach((sib) => {
        if (sib.id === parentMemberId) return;
        if (seenAuntUncles.has(sib.id)) return;
        seenAuntUncles.add(sib.id);

        const cousinKids = childrenOf[sib.id] || [];
        if (cousinKids.length > 0) {
          cousinBranches.push({
            parent: sib, // Aunt/Uncle
            count: cousinKids.length,
            firstCousinId: cousinKids[0].id,
          });
        }
      });
    });

    return cousinBranches;
  };

  // Renders a single Member Card (works for members and spouses)
  const renderMemberCard = (member, roleLabel) => {
    if (!member) return null;
    const isFocused = focusedCardId === member.id;
    const avatarBg = getColorHash(member.id);
    const initials = getInitials(member.firstname, member.lastname);
    const avatarSrc = getAvatarSrc(member.avatar_url);

    // Display total descendant count or end of line indicator
    const treeNode = nodeMap[member.id];
    const hasDescendants = treeNode && treeNode.totalDescendants > 0;
    const depthBadge = hasDescendants ? (
      <span className="member-badge-count">↓ {treeNode.totalDescendants}</span>
    ) : (
      <span className="member-badge-eol">🌱</span>
    );

    return (
      <div
        id={`member-card-${member.id}`}
        key={member.id}
        className={`tree-member-card branch-border-${member.branch || 0} ${
          isFocused ? "focus-active" : ""
        }`}
        onClick={(e) => {
          e.stopPropagation();
          setFocusedCardId(member.id);
          setSelectedMember(member);
        }}
      >
        <div className="card-avatar-container">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={member.firstname}
              className="card-avatar-img"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : null}
          <div className="card-avatar-initials" style={{ backgroundColor: avatarBg }}>
            {initials}
          </div>
          {member.is_deceased && <span className="deceased-halo">†</span>}
        </div>
        <div className="card-details">
          <span className="card-firstname">{member.firstname}</span>
          <span className="card-lastname">{member.lastname}</span>
          <div className="card-meta-row">
            {roleLabel && <span className="card-role-label">{roleLabel}</span>}
            {depthBadge}
          </div>
        </div>
      </div>
    );
  };

  // Recursively renders tree nodes vertically
  const renderTreeNode = (node) => {
    if (!node) return null;

    const hasChildren = node.children.length > 0;
    const isExpanded = !!expandedNodes[node.id];
    const hasSpouse = !!node.spouse;
    const cousinBranches = getCousinBranchesForNode(node.id);

    return (
      <div key={node.id} className="tree-node-wrapper">
        <div className="tree-node-row-wrapper">
          {/* Sibling connect horizontal line */}
          <div className="tree-node-row-connector-in"></div>

          <div className="tree-node-row">
            {/* Primary Member */}
            {renderMemberCard(node.member, null)}

            {/* Spouse node side-by-side */}
            {hasSpouse && (
              <>
                <div className="spouse-ring-divider">⚭</div>
                {renderMemberCard(node.spouse, "Spouse")}
              </>
            )}

            {/* Expand / Collapse Chevron */}
            {hasChildren && (
              <button
                className={`tree-chevron-toggle ${isExpanded ? "expanded" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedNodes((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
                }}
              >
                <span className="chevron-icon">▼</span>
                <span className="chevron-badge">{node.totalDescendants}</span>
              </button>
            )}
          </div>
        </div>

        {/* Children Generation Deck (nested with left indentation) */}
        {hasChildren && isExpanded && (
          <div className="tree-children-container">
            {/* Left vertical border path lineage line */}
            <div className="tree-lineage-line-vertical"></div>

            <div className="tree-children-list">
              {node.children.map((childNode) => renderTreeNode(childNode))}

              {/* Cousin Peeks Banner in the same generation */}
              {cousinBranches.length > 0 && (
                <div className="tree-cousin-peeks-banner">
                  <div className="cousin-banner-header">
                    👥 Cousins in Gen {node.generation + 2}:
                  </div>
                  <div className="cousin-chips-row">
                    {cousinBranches.map((br) => (
                      <button
                        key={br.parent.id}
                        className="cousin-peek-chip"
                        style={{ border: `1px solid ${getBranchColor(br.parent.branch)}` }}
                        onClick={() => handleSelectAndScrollToNode(br.firstCousinId, br.parent.id)}
                      >
                        {br.parent.firstname}'s line ({br.count}) ➔
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const breadcrumbs = buildBreadcrumbs(focusedCardId);

  if (loading) {
    return (
      <div className="scroll-tree-loading-wrap">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="scroll-tree-loading-wrap" style={{ flexDirection: "column", gap: "1rem" }}>
        <h3>Error loading family tree data</h3>
        <p style={{ color: "#eabea9" }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="scroll-tree-container">
      {/* Plaque Header: Search, Breadcrumbs, and Global Controls */}
      <div className="tree-header-plaque">
        <div className="tree-header-upper">
          <h2 className="tree-title">
            <ApartmentOutlined style={{ color: "#f3e7b1", marginRight: "6px" }} />
            Family Pedigree
          </h2>

          <div className="tree-global-actions">
            <Button
              className="tree-control-btn expand-btn"
              onClick={handleExpandAll}
              size="small"
            >
              Expand All
            </Button>
            <Button
              className="tree-control-btn collapse-btn"
              onClick={handleCollapseAll}
              size="small"
            >
              Collapse All
            </Button>
            <Button
              className="tree-control-btn reset-btn"
              icon={<ReloadOutlined />}
              onClick={handleResetToRoots}
              size="small"
            >
              Roots
            </Button>
          </div>
        </div>

        {/* Custom Search Selector */}
        <div className="tree-search-wrapper">
          <Input
            placeholder="Search relatives by name..."
            prefix={<SearchOutlined style={{ color: "#EABEA9" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tree-search-input"
          />
          {searchResults.length > 0 && (
            <div className="tree-search-dropdown">
              {searchResults.map((p) => (
                <div
                  key={p.id}
                  className="search-result-item"
                  onClick={() => handleSelectAndScrollToNode(p.id)}
                >
                  <Avatar
                    shape="square"
                    src={getAvatarSrc(p.avatar_url)}
                    icon={<UserOutlined />}
                    size={24}
                    style={{ border: "1px solid rgba(234,190,169,0.3)", borderRadius: "4px" }}
                  />
                  <span>
                    {p.firstname} {p.lastname}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Traversal Lineage Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div className="tree-breadcrumbs-wrapper">
            <span className="breadcrumbs-label">Lineage Trail:</span>
            <div className="breadcrumbs-trail">
              {breadcrumbs.map((crumb, idx) => (
                <span key={crumb.id} className="breadcrumb-node">
                  <span
                    className="crumb-link"
                    style={{ color: getBranchColor(crumb.branch) }}
                    onClick={() => handleSelectAndScrollToNode(crumb.id)}
                  >
                    {crumb.firstname}
                  </span>
                  {idx < breadcrumbs.length - 1 && <span className="crumb-divider">➔</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Generational Pedigree Canvas Viewport */}
      <div className="tree-viewport-canvas vertical-tree-scrollable">
        <div className="tree-vertical-viewport-content">
          {rootTrees.map((rootNode) => renderTreeNode(rootNode))}
        </div>
      </div>

      {/* Profile Details Bottom Drawer Sheet */}
      <Drawer
        placement="bottom"
        onClose={() => setSelectedMember(null)}
        open={!!selectedMember}
        className="tree-member-drawer"
        height="auto"
        closable={false}
      >
        {selectedMember && (
          <div className="drawer-inner-content">
            <div className="drawer-header-row">
              <Avatar
                shape="square"
                src={getAvatarSrc(selectedMember.avatar_url)}
                icon={<UserOutlined />}
                size={64}
                className="drawer-avatar"
                style={{
                  border: `2.5px solid ${getBranchColor(selectedMember.branch)}`,
                }}
              />
              <div className="drawer-title-block">
                <h3 className="drawer-name">
                  {selectedMember.firstname} {selectedMember.lastname}
                </h3>
                {selectedMember.nickname && (
                  <span className="drawer-nickname">"{selectedMember.nickname}"</span>
                )}
                <span
                  className="drawer-branch-badge"
                  style={{ color: getBranchColor(selectedMember.branch) }}
                >
                  {getBranchLabel(selectedMember.branch)}
                </span>
              </div>
            </div>

            <div className="drawer-stats-grid">
              <div className="stat-chip">
                <CalendarOutlined className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-lbl">LIFETIME</span>
                  <span className="stat-val">
                    {selectedMember.sunrise
                      ? new Date(selectedMember.sunrise).getFullYear()
                      : "????"}{" "}
                    –{" "}
                    {selectedMember.is_deceased
                      ? selectedMember.sunset
                        ? new Date(selectedMember.sunset).getFullYear()
                        : "Deceased"
                      : "Living"}
                  </span>
                </div>
              </div>

              <div className="stat-chip">
                <EnvironmentOutlined className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-lbl">RESIDENCE</span>
                  <span className="stat-val">
                    {selectedMember.city && selectedMember.state
                      ? `${selectedMember.city}, ${selectedMember.state}`
                      : selectedMember.location || "Location unknown"}
                  </span>
                </div>
              </div>

              <div className="stat-chip">
                <ApartmentOutlined className="stat-icon" />
                <div className="stat-info">
                  <span className="stat-lbl">DESCENDANTS</span>
                  <span className="stat-val">
                    {nodeMap[selectedMember.id]?.totalDescendants || 0} family members (
                    {nodeMap[selectedMember.id]?.descendantDepth || 0} generations deep)
                  </span>
                </div>
              </div>
            </div>

            <div className="drawer-action-row">
              <Button
                type="primary"
                icon={<ApartmentOutlined />}
                onClick={() => {
                  setSelectedMember(null);
                  handleSelectAndScrollToNode(selectedMember.id);
                }}
                className="drawer-btn focus-btn"
              >
                Focus In Tree
              </Button>
              <Button
                icon={<TeamOutlined />}
                onClick={() => navigate(`/profile/${selectedMember.id}`)}
                className="drawer-btn view-profile-btn"
              >
                View Profile
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default ScrollTree;
