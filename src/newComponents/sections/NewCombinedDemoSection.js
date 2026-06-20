import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightOutlined,
  TeamOutlined,
  UserOutlined,
  HistoryOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  SmileOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { supabase } from "../../supabaseClient";
import AuthConsumer from "../../useSession";
import "./NewCombinedDemoSection.css";

// Import asset photos for first generation mapping
import Alma from "../../assets/alma.jpg";
import Ben from "../../assets/ben.jpg";
import Bobbie from "../../assets/bobbie.jpg";
import Hazel from "../../assets/hazel.jpg";
import James from "../../assets/james.jpg";
import John from "../../assets/john.jpg";
import Joyce from "../../assets/joyce.jpg";
import Lorene from "../../assets/lorene.jpg";
import Loretta from "../../assets/loretta.jpg";
import Mary from "../../assets/mary.jpg";
import Sylvester from "../../assets/sylvester.jpg";
import RootsAvatar from "../../assets/root.png";

const IMAGE_MAP = {
  alma: Alma, ben: Ben, bobbie: Bobbie, hazel: Hazel,
  james: James, john: John, joyce: Joyce, lorene: Lorene,
  loretta: Loretta, mary: Mary, sylvester: Sylvester
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const getAncestorPhoto = (name) => {
  if (!name) return RootsAvatar;
  const firstWord = name.trim().split(/\s+/)[0].toLowerCase();
  return IMAGE_MAP[firstWord] || RootsAvatar;
};

const getAvatarSrc = (profile) => {
  if (!profile) return null;
  const firstWord = (profile.firstname || "").trim().split(/\s+/)[0].toLowerCase();
  if (IMAGE_MAP[firstWord]) {
    return IMAGE_MAP[firstWord];
  }
  if (profile.avatar_url) {
    const cleanUrl = profile.avatar_url.replace(".jpg", "").toLowerCase();
    if (IMAGE_MAP[cleanUrl]) {
      return IMAGE_MAP[cleanUrl];
    }
    if (profile.avatar_url.startsWith("http")) {
      return profile.avatar_url;
    }
    return `${supabase.supabaseUrl}/storage/v1/object/public/avatars/${profile.avatar_url}`;
  }
  return null;
};

const getInitials = (first, last) => {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase();
};

// Static macro stats (from NewStatsSection)
const MACRO_STATS = [
  {
    value: "42+ Descendants",
    label: "Registered on the family portal",
    icon: <TeamOutlined className="ncd-icon-svg" />,
  },
  {
    value: "11 Main Branches",
    label: "John Henry & Birdie Mae's children",
    icon: <UserOutlined className="ncd-icon-svg" />,
  },
  {
    value: "92 Years",
    label: "Of living history and heritage",
    icon: <HistoryOutlined className="ncd-icon-svg" />,
  },
];

const NewCombinedDemoSection = () => {
  const { session, profile } = AuthConsumer();
  const [ancestor, setAncestor] = useState(null);
  const [parent, setParent] = useState(null);
  const [branchCount, setBranchCount] = useState(0);
  const [siblingCount, setSiblingCount] = useState(0);
  const [stateData, setStateData] = useState(null);
  const [birthMonthMatches, setBirthMonthMatches] = useState(0);
  const [birthMonthName, setBirthMonthName] = useState("");

  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchLineageData = useCallback(async () => {
    if (!session || !profile || !profile.ancestor) return;

    try {
      const ancestorPromise = supabase
        .from("profile")
        .select("id, firstname, lastname, sunrise, sunset")
        .eq("id", profile.ancestor)
        .single();

      const parentPromise = profile.parent
        ? supabase
            .from("profile")
            .select("id, firstname, lastname")
            .eq("id", profile.parent)
            .single()
        : Promise.resolve({ data: null });

      const branchCountPromise = supabase
        .from("profile")
        .select("id", { count: "exact", head: true })
        .eq("ancestor", profile.ancestor);

      const siblingPromise = supabase
        .from("profile")
        .select("id", { count: "exact", head: true })
        .eq("ancestor", profile.ancestor)
        .eq("parent", profile.parent || profile.ancestor)
        .neq("id", profile.id);

      const statePromise = supabase
        .from("profilestate")
        .select("state_id, city, state(state_name)")
        .eq("profile_id", profile.id)
        .maybeSingle();

      const birthdaysPromise = supabase
        .from("profile")
        .select("sunrise")
        .not("sunrise", "is", null);

      const [
        { data: ancData },
        { data: parentData },
        { count: bCount },
        { count: sCount },
        { data: stateRow },
        { data: birthdaysData }
      ] = await Promise.all([
        ancestorPromise,
        parentPromise,
        branchCountPromise,
        siblingPromise,
        statePromise,
        birthdaysPromise
      ]);

      if (ancData) setAncestor(ancData);
      if (parentData) setParent(parentData);
      setBranchCount(bCount || 0);
      setSiblingCount(sCount || 0);

      if (stateRow) {
        const stateName = stateRow.state?.state_name;
        let stateCount = 0;
        if (stateRow.state_id) {
          const { count } = await supabase
            .from("profilestate")
            .select("profile_id", { count: "exact", head: true })
            .eq("state_id", stateRow.state_id)
            .neq("profile_id", profile.id);
          stateCount = count || 0;
        }
        setStateData({
          city: stateRow.city,
          stateName,
          count: stateCount
        });
      }

      if (profile.sunrise && birthdaysData) {
        const birthDate = new Date(profile.sunrise);
        const birthMonth = birthDate.getUTCMonth();
        setBirthMonthName(MONTH_NAMES[birthMonth]);
        const matches = birthdaysData.filter((b) => {
          return new Date(b.sunrise).getUTCMonth() === birthMonth;
        }).length - 1;
        setBirthMonthMatches(Math.max(0, matches));
      }
    } catch (err) {
      console.error("Error fetching combined demo data:", err);
    }
  }, [session, profile]);

  useEffect(() => {
    fetchLineageData();
  }, [fetchLineageData]);

  // ─── Determine User State ───
  const isGuest = !session;
  const isLoggedInNoProfile = session && !profile?.firstname;
  const isLoggedInNoTree = session && profile?.firstname && !profile?.ancestor;
  const isConnected = session && profile?.ancestor;

  const userFirst = profile?.firstname || "Cousin";
  const userLast = profile?.lastname || "";
  const ancestorFirst = ancestor?.firstname || "First Gen";
  const parentFirst = parent?.firstname || "";
  const userGen = profile?.branch !== undefined && profile?.branch !== null
    ? getOrdinal(profile.branch + 1)
    : "?";

  const userAvatar = getAvatarSrc(profile);

  // ─── Build Personalized Stat Cards (only when connected) ───
  const personalStatCards = [];
  if (isConnected) {
    personalStatCards.push({
      icon: <TeamOutlined className="ncd-card-icon-svg" />,
      value: `${branchCount} Members`,
      label: `Registered in the ${ancestorFirst} branch`
    });
    personalStatCards.push({
      icon: <HistoryOutlined className="ncd-card-icon-svg" />,
      value: `${userGen} Gen`,
      label: "Your lineage generation level"
    });
    if (stateData?.stateName) {
      personalStatCards.push({
        icon: <EnvironmentOutlined className="ncd-card-icon-svg" />,
        value: `${stateData.count} Relatives`,
        label: `Also live in ${stateData.stateName}`
      });
    }
    if (birthMonthMatches > 0 && birthMonthName) {
      personalStatCards.push({
        icon: <CalendarOutlined className="ncd-card-icon-svg" />,
        value: `${birthMonthMatches} ${birthMonthName} Babies`,
        label: "Relatives share your birth month"
      });
    }
    if (siblingCount > 0) {
      personalStatCards.push({
        icon: <SmileOutlined className="ncd-card-icon-svg" />,
        value: `${siblingCount} Sibling${siblingCount !== 1 ? "s" : ""}`,
        label: "In your direct branch line"
      });
    }
  }

  // ─── Build Lineage Chain Nodes ───
  const chainNodes = [];
  chainNodes.push({
    key: "roots",
    photo: RootsAvatar,
    label: "John & Birdie",
    role: "Roots",
    onClick: null
  });

  if (isConnected) {
    // Ancestor
    chainNodes.push({
      key: "ancestor",
      photo: getAncestorPhoto(ancestorFirst),
      label: ancestorFirst,
      role: "Ancestor",
      onClick: ancestor?.id ? () => navigate(`/profile/${ancestor.id}`) : null
    });
    // Parent (if exists and different from ancestor)
    if (parent && parent.id !== profile?.ancestor) {
      chainNodes.push({
        key: "parent",
        photo: getAncestorPhoto(parentFirst),
        label: parentFirst,
        role: "Parent",
        onClick: () => navigate(`/profile/${parent.id}`)
      });
    }
  } else if (isLoggedInNoTree) {
    // User has profile but no tree connection — show placeholder ancestor
    chainNodes.push({
      key: "ancestor",
      photo: null,
      label: "?",
      role: "Ancestor",
      onClick: null,
      isPlaceholder: true
    });
  } else {
    // Guest or no profile — show dimmed placeholder chain
    chainNodes.push({
      key: "ancestor",
      photo: null,
      label: "?",
      role: "Ancestor",
      onClick: null,
      isPlaceholder: true
    });
  }

  // User node
  chainNodes.push({
    key: "user",
    photo: userAvatar,
    label: isGuest ? "You" : userFirst,
    role: isGuest ? "Guest" : isLoggedInNoProfile ? "Member" : isLoggedInNoTree ? "Member" : "You",
    onClick: session ? () => navigate(`/profile/${session.user.id}`) : null,
    isUser: true
  });

  // ─── Render: Guest State ───
  if (isGuest) {
    return (
      <div className={`ncd-container guest-state ${mounted ? "mounted" : ""}`}>
        <div className="ncd-plaque">
          <div className="ncd-header">
            <h2 className="ncd-title">Family Heritage</h2>
            <p className="ncd-subtitle">Discover your place in our family tree</p>
          </div>

          <div className="ncd-tree-ornament">
            <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M60 35 C60 35 55 25 45 20 C35 15 20 18 15 22" stroke="#eabea9" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              <path d="M60 35 C60 35 65 25 75 20 C85 15 100 18 105 22" stroke="#eabea9" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              <path d="M60 35 L60 15" stroke="#eabea9" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              <circle cx="60" cy="12" r="4" fill="#f7dc92" opacity="0.3"/>
              <circle cx="45" cy="20" r="3" fill="#f7dc92" opacity="0.25"/>
              <circle cx="75" cy="20" r="3" fill="#f7dc92" opacity="0.25"/>
              <circle cx="15" cy="22" r="2.5" fill="#f7dc92" opacity="0.2"/>
              <circle cx="105" cy="22" r="2.5" fill="#f7dc92" opacity="0.2"/>
            </svg>
          </div>

          {/* Preview chain — dimmed */}
          <div className="ncd-chain preview-chain">
            <div className="ncd-node dimmed">
              <div className="ncd-node-photo-wrap">
                <img src={RootsAvatar} alt="Roots" className="ncd-node-photo" />
              </div>
              <span className="ncd-node-label">John & Birdie</span>
              <span className="ncd-node-role">Roots</span>
            </div>
            <div className="ncd-chain-connector dimmed"><ArrowRightOutlined /></div>
            <div className="ncd-node dimmed">
              <div className="ncd-node-photo-wrap">
                <QuestionCircleOutlined className="ncd-node-placeholder-icon" />
              </div>
              <span className="ncd-node-label">Ancestor</span>
              <span className="ncd-node-role">Unknown</span>
            </div>
            <div className="ncd-chain-connector dimmed"><ArrowRightOutlined /></div>
            <div className="ncd-node dimmed">
              <div className="ncd-node-photo-wrap">
                <span className="ncd-user-initials">?</span>
              </div>
              <span className="ncd-node-label">You</span>
              <span className="ncd-node-role">Guest</span>
            </div>
          </div>

          {/* Guest macro stats */}
          <div className="ncd-macro-stats">
            {MACRO_STATS.map((stat, i) => (
              <div key={i} className="ncd-macro-stat-row">
                <div className="ncd-macro-icon-wrap">{stat.icon}</div>
                <div className="ncd-macro-content">
                  <span className="ncd-macro-value">{stat.value}</span>
                  <span className="ncd-macro-label">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="ncd-onboarding-message">
            Every cousin represents a unique leaf on our tree. Sign in or join us to unlock your personalized branch, trace your direct ancestors, and see nearby relatives.
          </div>

          <div className="ncd-cta-group">
            <button
              className="ncd-btn ncd-btn-primary gold-pulse"
              onClick={() => navigate("/register")}
            >
              Sign In / Join Us
            </button>
            <button
              className="ncd-btn ncd-btn-secondary"
              onClick={() => navigate("/scrolltree")}
            >
              Explore Public Tree
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Logged In, No Profile Info ───
  if (isLoggedInNoProfile) {
    return (
      <div className={`ncd-container no-profile-state ${mounted ? "mounted" : ""}`}>
        <div className="ncd-plaque">
          <div className="ncd-header">
            <h2 className="ncd-title">Welcome!</h2>
            <p className="ncd-subtitle">Let's get you connected to the family</p>
          </div>

          <div className="ncd-tree-ornament">
            <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M60 35 C60 35 55 25 45 20 C35 15 20 18 15 22" stroke="#eabea9" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              <path d="M60 35 C60 35 65 25 75 20 C85 15 100 18 105 22" stroke="#eabea9" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              <path d="M60 35 L60 15" stroke="#eabea9" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              <circle cx="60" cy="12" r="4" fill="#f7dc92" opacity="0.3"/>
              <circle cx="45" cy="20" r="3" fill="#f7dc92" opacity="0.25"/>
              <circle cx="75" cy="20" r="3" fill="#f7dc92" opacity="0.25"/>
              <circle cx="15" cy="22" r="2.5" fill="#f7dc92" opacity="0.2"/>
              <circle cx="105" cy="22" r="2.5" fill="#f7dc92" opacity="0.2"/>
            </svg>
          </div>

          <div className="ncd-onboarding-message" style={{ textAlign: "center", fontSize: "1rem", margin: "0.5rem 0" }}>
            Thank you for creating an account! Add your name and family ties to see your personalized family line.
          </div>

          <div className="ncd-macro-stats">
            {MACRO_STATS.map((stat, i) => (
              <div key={i} className="ncd-macro-stat-row">
                <div className="ncd-macro-icon-wrap">{stat.icon}</div>
                <div className="ncd-macro-content">
                  <span className="ncd-macro-value">{stat.value}</span>
                  <span className="ncd-macro-label">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="ncd-cta-group">
            <button
              className="ncd-btn ncd-btn-primary gold-pulse"
              onClick={() => navigate("/profileForm/self")}
            >
              Add Your Info
            </button>
            <button
              className="ncd-btn ncd-btn-secondary"
              onClick={() => navigate("/scrolltree")}
            >
              Explore Family Tree
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Logged In, Profile Set, But Not Connected to Tree ───
  if (isLoggedInNoTree) {
    return (
      <div className={`ncd-container no-tree-state ${mounted ? "mounted" : ""}`}>
        <div className="ncd-plaque">
          <div className="ncd-header">
            <h2 className="ncd-title">{userFirst}'s Heritage</h2>
            <p className="ncd-subtitle">You're almost connected — find your branch!</p>
          </div>

          <div className="ncd-tree-ornament">
            <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M60 35 C60 35 55 25 45 20 C35 15 20 18 15 22" stroke="#eabea9" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              <path d="M60 35 C60 35 65 25 75 20 C85 15 100 18 105 22" stroke="#eabea9" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              <path d="M60 35 L60 15" stroke="#eabea9" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
              <circle cx="60" cy="12" r="4" fill="#f7dc92" opacity="0.3"/>
              <circle cx="45" cy="20" r="3" fill="#f7dc92" opacity="0.25"/>
              <circle cx="75" cy="20" r="3" fill="#f7dc92" opacity="0.25"/>
              <circle cx="15" cy="22" r="2.5" fill="#f7dc92" opacity="0.2"/>
              <circle cx="105" cy="22" r="2.5" fill="#f7dc92" opacity="0.2"/>
            </svg>
          </div>

          {/* Chain with placeholder ancestor */}
          <div className="ncd-chain">
            <div className="ncd-node">
              <div className="ncd-node-photo-wrap">
                <img src={RootsAvatar} alt="Roots" className="ncd-node-photo" />
              </div>
              <span className="ncd-node-label">John & Birdie</span>
              <span className="ncd-node-role">Roots</span>
            </div>
            <div className="ncd-chain-connector"><ArrowRightOutlined /></div>
            <div className="ncd-node">
              <div className="ncd-node-photo-wrap ncd-placeholder-wrap">
                <QuestionCircleOutlined className="ncd-node-placeholder-icon" />
              </div>
              <span className="ncd-node-label">Ancestor</span>
              <span className="ncd-node-role">Not set</span>
            </div>
            <div className="ncd-chain-connector"><ArrowRightOutlined /></div>
            <div
              className={`ncd-node ncd-node-user ${session ? "clickable" : ""}`}
              onClick={session ? () => navigate(`/profile/${session.user.id}`) : null}
            >
              <div className="ncd-node-photo-wrap user-avatar-border">
                {userAvatar ? (
                  <img src={userAvatar} alt={userFirst} className="ncd-node-photo" />
                ) : (
                  <div className="ncd-user-initials">{getInitials(userFirst, userLast)}</div>
                )}
              </div>
              <span className="ncd-node-label">{userFirst}</span>
              <span className="ncd-node-role highlight-user">You</span>
            </div>
          </div>

          <div className="ncd-connect-prompt">
            <PlusOutlined className="ncd-connect-icon" />
            <span>Connect your Smith-side parent to see your branch stats</span>
          </div>

          <div className="ncd-macro-stats">
            {MACRO_STATS.map((stat, i) => (
              <div key={i} className="ncd-macro-stat-row">
                <div className="ncd-macro-icon-wrap">{stat.icon}</div>
                <div className="ncd-macro-content">
                  <span className="ncd-macro-value">{stat.value}</span>
                  <span className="ncd-macro-label">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="ncd-cta-group">
            <button
              className="ncd-btn ncd-btn-primary gold-pulse"
              onClick={() => navigate(`/profile/${session.user.id}`)}
            >
              Connect to Tree
            </button>
            <button
              className="ncd-btn ncd-btn-secondary"
              onClick={() => navigate("/scrolltree")}
            >
              Explore Family Tree
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Fully Connected (The Happy Path) ───
  return (
    <div className={`ncd-container auth-state ${mounted ? "mounted" : ""}`}>
      <div className="ncd-plaque">

        <div className="ncd-header">
          <h2 className="ncd-title">{userFirst}'s Heritage</h2>
          <p className="ncd-subtitle">Your family line and personal stats</p>
        </div>

        <div className="ncd-tree-ornament">
          <svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M60 35 C60 35 55 25 45 20 C35 15 20 18 15 22" stroke="#eabea9" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
            <path d="M60 35 C60 35 65 25 75 20 C85 15 100 18 105 22" stroke="#eabea9" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
            <path d="M60 35 L60 15" stroke="#eabea9" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
            <circle cx="60" cy="12" r="4" fill="#f7dc92" opacity="0.3"/>
            <circle cx="45" cy="20" r="3" fill="#f7dc92" opacity="0.25"/>
            <circle cx="75" cy="20" r="3" fill="#f7dc92" opacity="0.25"/>
            <circle cx="15" cy="22" r="2.5" fill="#f7dc92" opacity="0.2"/>
            <circle cx="105" cy="22" r="2.5" fill="#f7dc92" opacity="0.2"/>
          </svg>
        </div>

        {/* Dynamic Lineage Chain */}
        <div className="ncd-chain">
          {chainNodes.map((node, index) => (
            <React.Fragment key={node.key}>
              {index > 0 && (
                <div className="ncd-chain-connector">
                  <ArrowRightOutlined />
                </div>
              )}
              <div
                className={`ncd-node ${node.isUser ? "ncd-node-user" : ""} ${node.onClick ? "clickable" : ""}`}
                onClick={node.onClick}
                role={node.onClick ? "button" : undefined}
                tabIndex={node.onClick ? 0 : undefined}
              >
                <div className={`ncd-node-photo-wrap ${node.isUser ? "user-avatar-border" : ""}`}>
                  {node.photo ? (
                    <img src={node.photo} alt={node.label} className="ncd-node-photo" />
                  ) : (
                    <div className="ncd-user-initials">
                      {node.isUser ? getInitials(userFirst, userLast) : getInitials(node.label, "")}
                    </div>
                  )}
                </div>
                <span className="ncd-node-label">{node.label}</span>
                <span className={`ncd-node-role ${node.isUser ? "highlight-user" : ""}`}>{node.role}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Macro Heritage Stats */}
        <div className="ncd-macro-stats">
          {MACRO_STATS.map((stat, i) => (
            <div key={i} className="ncd-macro-stat-row">
              <div className="ncd-macro-icon-wrap">{stat.icon}</div>
              <div className="ncd-macro-content">
                <span className="ncd-macro-value">{stat.value}</span>
                <span className="ncd-macro-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Personalized Mini Stats */}
        {personalStatCards.length > 0 && (
          <div className="ncd-personal-stats">
            {personalStatCards.slice(0, 2).map((card, i) => (
              <div key={i} className="ncd-personal-stat-card">
                <div className="ncd-personal-icon-wrap">{card.icon}</div>
                <div className="ncd-personal-content">
                  <span className="ncd-personal-value">{card.value}</span>
                  <span className="ncd-personal-label">{card.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="ncd-footer-cta">
          <button
            className="ncd-explore-btn gold-pulse"
            onClick={() => navigate("/scrolltree")}
          >
            Explore Interactive Family Tree
          </button>
        </div>

      </div>
    </div>
  );
};

export default NewCombinedDemoSection;
