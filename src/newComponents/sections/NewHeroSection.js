import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  DownOutlined, 
  CopyOutlined, 
  ArrowLeftOutlined, 
  UploadOutlined, 
  UserAddOutlined, 
  ShareAltOutlined, 
  BulbOutlined, 
  TrophyOutlined, 
  SmileOutlined, 
  CheckCircleOutlined,
  LoadingOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Avatar, Button, Spin, Drawer, message } from "antd";
import ancestorsImg from "../../assets/anc1.png";
import { supabase } from "../../supabaseClient";
import AuthConsumer from "../../useSession";
import { getAvatarSrc } from "../../utils/avatarHelper";
import { updateFamilyBranch, updateAncestorReference } from "../../utils/familyTree";
import "./NewHeroSection.css";

const tips = [
  "💡 Tip: Tap 'Interactive Tree' in the menu to visually view how you connect back to John Henry & Birdie Mae.",
  "💡 Tip: Scroll down to the 'Family Finder' to search for any cousin and view their milestones.",
  "💡 Tip: You can leave a quick message or tribute on your cousin's wall in the Guestbook.",
  "💡 Tip: Head to the Family Media page to upload historic photos and tag your relatives."
];

const NewHeroSection = ({ demoMode }) => {
  const { session: realSession, profile: realProfile, setProfile } = AuthConsumer();
  const navigate = useNavigate();

  const isDemo = !!demoMode;
  const session = isDemo ? (demoMode === "guest" ? null : { user: { id: "demo-user-id" } }) : realSession;
  const profile = useMemo(() => {
    return isDemo ? (
      demoMode === "guest" ? null :
      demoMode === "unclaimed" ? null :
      demoMode === "unconnected" ? { id: "demo-user-id", firstname: "David", lastname: "Smith", parent: null, avatar_url: null, branch: null } :
      demoMode === "connected_no_photo" ? { id: "demo-user-id", firstname: "David", lastname: "Smith", parent: "mary-id", avatar_url: null, branch: 2 } :
      demoMode === "connected_no_family" ? { id: "demo-user-id", firstname: "David", lastname: "Smith", parent: "mary-id", avatar_url: "john.jpg", branch: 2 } :
      { id: "demo-user-id", firstname: "David", lastname: "Smith", parent: "mary-id", avatar_url: "john.jpg", branch: 2 }
    ) : realProfile;
  }, [isDemo, demoMode, realProfile]);

  // Step routing: 'welcome' (default dashboard for connected/guest) | 'branch' | 'relation' | 'select_grandparent' | 'select_parent' | 'confirm' | 'success'
  const [step, setStep] = useState("welcome");
  const [loadingData, setLoadingData] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Lineage Builder States
  const [branchLeaders, setBranchLeaders] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null); // First branch profile
  const [relationType, setRelationType] = useState(null); // 'parent' | 'grandparent' | 'great_grandparent'
  const [grandparentsList, setGrandparentsList] = useState([]);
  const [selectedGrandparent, setSelectedGrandparent] = useState(null);
  const [parentsList, setParentsList] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [connectedParentName, setConnectedParentName] = useState("");
  const [calculatedGeneration, setCalculatedGeneration] = useState(null);

  // Clipboard Copied State
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Interactive Tutorial States
  const [activeTipIdx, setActiveTipIdx] = useState(0);

  const [hasFamilyConnections, setHasFamilyConnections] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [lineageTrail, setLineageTrail] = useState(null);

  // Rotate tips every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTipIdx((prev) => (prev + 1) % tips.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Check if user has active family connections (spouse or child) to hide the action banner when complete
  useEffect(() => {
    if (isDemo) {
      if (demoMode === "connected_complete") {
        setHasFamilyConnections(true);
      } else {
        setHasFamilyConnections(false);
      }
      return;
    }

    if (!profile || !profile.id) {
      setHasFamilyConnections(false);
      return;
    }

    const checkFamilyConnections = async () => {
      try {
        // 1. Fetch active connections
        const { data: connData, error: connErr } = await supabase
          .from("connection")
          .select("connection_type, profile_1, profile_2")
          .or(`profile_1.eq.${profile.id},profile_2.eq.${profile.id}`)
          .eq("status", "active");

        if (connErr) throw connErr;

        const spouseConns = (connData || []).filter(c => c.connection_type === "spouse");
        const hasSpouse = spouseConns.length > 0;

        // 2. Fetch children counts in profile table
        const { count: childCount, error: childErr } = await supabase
          .from("profile")
          .select("id", { count: "exact", head: true })
          .eq("parent", profile.id);

        if (childErr) throw childErr;
        const hasChildren = childCount && childCount > 0;

        setHasFamilyConnections(!!(hasSpouse || hasChildren));

        // 3. Auto-populate ancestor/branch if they are a connected spouse but their own DB fields are null
        if (profile.parent === null && profile.ancestor === null && hasSpouse) {
          const spouseId = spouseConns[0].profile_1 === profile.id ? spouseConns[0].profile_2 : spouseConns[0].profile_1;
          const { data: spouseProfile, error: spouseProfErr } = await supabase
            .from("profile")
            .select("branch, ancestor")
            .eq("id", spouseId)
            .single();

          if (!spouseProfErr && spouseProfile && spouseProfile.ancestor) {
            const { error: updateErr } = await supabase
              .from("profile")
              .update({
                branch: spouseProfile.branch,
                ancestor: spouseProfile.ancestor
              })
              .eq("id", profile.id);

            if (!updateErr && setProfile) {
              setProfile({ ...profile, branch: spouseProfile.branch, ancestor: spouseProfile.ancestor });
            }
          }
        }
      } catch (err) {
        console.error("Error checking family connections:", err);
      }
    };

    checkFamilyConnections();
  }, [profile, isDemo, demoMode, setProfile]);

  // Load lineage trail names (ancestor, parent, me)
  useEffect(() => {
    if (isDemo) {
      if (demoMode && demoMode.startsWith("connected")) {
        setLineageTrail({
          ancestor: "Mary",
          parent: "Arthur",
          me: profile ? profile.firstname : "David"
        });
      } else {
        setLineageTrail(null);
      }
      return;
    }

    if (!profile || (!profile.parent && !profile.ancestor)) {
      setLineageTrail(null);
      return;
    }

    const fetchLineageTrail = async () => {
      try {
        const ids = [];
        if (profile.parent) ids.push(profile.parent);
        if (profile.ancestor) ids.push(profile.ancestor);

        if (ids.length === 0) return;

        const { data, error } = await supabase
          .from("profile")
          .select("id, firstname, nickname, lastname")
          .in("id", ids);

        if (!error && data) {
          const ancestorProfile = data.find(p => p.id === profile.ancestor);
          const parentProfile = data.find(p => p.id === profile.parent);

          setLineageTrail({
            ancestor: ancestorProfile ? (ancestorProfile.nickname || ancestorProfile.firstname) : null,
            parent: parentProfile ? parentProfile.firstname : null,
            me: profile.firstname
          });
        }
      } catch (err) {
        console.error("Error loading lineage trail:", err);
      }
    };

    fetchLineageTrail();
  }, [profile, isDemo, demoMode]);

  // Fetch branch leaders and active leaderboard on mount
  useEffect(() => {
    if (isDemo) {
      const mockLeaders = [
        { id: "alma-id", firstname: "Alma", lastname: "Smith", branch: 1, avatar_url: "alma.jpg" },
        { id: "ben-id", firstname: "Ben", lastname: "Smith", branch: 1, avatar_url: "ben.jpg" },
        { id: "bobbie-id", firstname: "Bobbie Jean", lastname: "Smith", branch: 1, avatar_url: "bobbie.jpg" },
        { id: "hazel-id", firstname: "Hazel", lastname: "Williams", branch: 1, avatar_url: "hazel.jpg" },
        { id: "james-id", firstname: "James", lastname: "Smith", branch: 1, avatar_url: "james.jpg" },
        { id: "john-id", firstname: "John", lastname: "Smith", branch: 1, avatar_url: "john.jpg" },
        { id: "joyce-id", firstname: "Joyce", lastname: "Smith", branch: 1, avatar_url: "joyce.jpg" },
        { id: "lorene-id", firstname: "Lorene", lastname: "Smith", branch: 1, avatar_url: "lorene.jpg" },
        { id: "loretta-id", firstname: "Loretta", lastname: "Glover", branch: 1, avatar_url: "loretta.jpg" },
        { id: "mary-id", firstname: "Mary", lastname: "Thibodeaux", branch: 1, avatar_url: "mary.jpg" },
        { id: "sylvester-id", firstname: "Sylvester", lastname: "Smith", branch: 1, avatar_url: "sylvester.jpg" },
      ];
      setBranchLeaders(mockLeaders);
      setLeaderboard([
        { leader: mockLeaders[9], count: 12 }, // Mary Line
        { leader: mockLeaders[8], count: 8 },  // Loretta Line
        { leader: mockLeaders[3], count: 5 },  // Hazel Line
      ]);
      return;
    }

    const loadCoreData = async () => {
      setLoadingData(true);
      try {
        // 1. Fetch branch leaders (Branch 1 children)
        const { data: leaders, error: leadersErr } = await supabase
          .from("profile")
          .select("id, firstname, nickname, lastname, avatar_url, branch, sunrise, sunset")
          .eq("branch", 1)
          .order("sunrise", { ascending: true });

        if (leadersErr) throw leadersErr;

        // 2. Fetch all profiles to trace and count registered users
        const { data: allProfiles, error: profilesErr } = await supabase
          .from("profile")
          .select("id, parent, ancestor, branch, email, phone");

        if (profilesErr) throw profilesErr;

        const profileMap = {};
        allProfiles.forEach((p) => {
          profileMap[p.id] = p;
        });

        // 3. Count registered users per branch
        const countsMap = {};
        leaders.forEach((l) => {
          countsMap[l.id] = 0;
        });

        allProfiles.forEach((u) => {
          if (u.email || u.phone) {
            let ancestorId = u.ancestor;
            if (!ancestorId) {
              let curr = u;
              const visited = new Set();
              while (curr && curr.parent && !visited.has(curr.id)) {
                visited.add(curr.id);
                const parent = profileMap[curr.parent];
                if (!parent) break;
                if (parent.branch === 1) {
                  ancestorId = parent.id;
                  break;
                }
                curr = parent;
              }
            }

            if (ancestorId && countsMap[ancestorId] !== undefined) {
              countsMap[ancestorId]++;
            } else if (countsMap[u.id] !== undefined) {
              countsMap[u.id]++;
            }
          }
        });

        const leaderboardData = leaders
          .map((l) => ({
            leader: l,
            count: countsMap[l.id] || 0,
          }))
          .sort((a, b) => b.count - a.count);

        setBranchLeaders(leaders);
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error("Error loading lineage builder data:", err);
      } finally {
        setLoadingData(false);
      }
    };

    loadCoreData();
  }, [isDemo]);

  // Set builder back to selection grid
  const handleStartLineageBuilder = () => {
    setIsWizardOpen(true);
    setStep("branch");
    setSelectedBranch(null);
    setRelationType(null);
    setSelectedGrandparent(null);
    setSelectedParent(null);
  };

  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    setStep("welcome");
  };

  // Select Branch Leader (Step 1)
  const handleSelectBranch = (branch) => {
    setSelectedBranch(branch);
    setStep("relation");
  };

  // Conversational relation step: Is Mary your parent, grandparent, or great-grandparent?
  const handleSelectRelation = async (type) => {
    setRelationType(type);
    if (isDemo) {
      const mockChildren = [
        { id: "child-1", firstname: "Thomas", lastname: "Thibodeaux", branch: 2, sunset: true },
        { id: "child-2", firstname: "Susan", lastname: "Thibodeaux", branch: 2, email: "susan@demo.com" },
        { id: "child-3", firstname: "Robert", lastname: "Thibodeaux", branch: 2, email: null, phone: null }
      ];
      if (type === "parent") {
        setSelectedParent(selectedBranch);
        setStep("confirm");
      } else if (type === "grandparent") {
        setParentsList(mockChildren);
        setStep("select_parent");
      } else {
        setGrandparentsList(mockChildren);
        setStep("select_grandparent");
      }
      return;
    }
    setLoadingData(true);
    try {
      if (type === "parent") {
        // Mary is parent directly
        setSelectedParent(selectedBranch);
        setStep("confirm");
      } else {
        // Mary is grandparent or great-grandparent, fetch Mary's children
        const { data, error } = await supabase
          .from("profile")
          .select("id, firstname, nickname, lastname, avatar_url, branch, email, phone, sunset")
          .eq("parent", selectedBranch.id)
          .order("firstname", { ascending: true });

        if (error) throw error;

        if (type === "grandparent") {
          setParentsList(data || []);
          setStep("select_parent");
        } else {
          setGrandparentsList(data || []);
          setStep("select_grandparent");
        }
      }
    } catch (err) {
      console.error("Error fetching relation details:", err);
      message.error("Failed to load family line children");
    } finally {
      setLoadingData(false);
    }
  };

  // Grandparent chosen, load grandparent's children (user's parent generation)
  const handleSelectGrandparent = async (grandparent) => {
    setSelectedGrandparent(grandparent);
    if (isDemo) {
      const mockParents = [
        { id: "parent-1", firstname: "Arthur", lastname: "Thibodeaux", branch: 3, sunset: false, email: null },
        { id: "parent-2", firstname: "Helen", lastname: "Thibodeaux", branch: 3, sunset: true }
      ];
      setParentsList(mockParents);
      setStep("select_parent");
      return;
    }
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from("profile")
        .select("id, firstname, nickname, lastname, avatar_url, branch, email, phone, sunset")
        .eq("parent", grandparent.id)
        .order("firstname", { ascending: true });

      if (error) throw error;
      setParentsList(data || []);
      setStep("select_parent");
    } catch (err) {
      console.error("Error fetching grandparent's children:", err);
      message.error("Failed to load children");
    } finally {
      setLoadingData(false);
    }
  };

  // Parent chosen, go to confirmation step
  const handleSelectParent = (parent) => {
    setSelectedParent(parent);
    setStep("confirm");
  };

  // Final Connection Execution
  const handleConfirmConnection = async () => {
    if (!selectedParent || !profile) return;
    setLoadingAction(true);
    if (isDemo) {
      setTimeout(() => {
        setConnectedParentName(`${selectedParent.firstname} ${selectedParent.lastname}`);
        setCalculatedGeneration(selectedParent.branch !== null ? selectedParent.branch + 1 : 2);
        setStep("success");
        setLoadingAction(false);
      }, 1000);
      return;
    }
    try {
      const isClaimed = selectedParent.email || selectedParent.phone;
      const isDeceased = selectedParent.sunset;
      const isBranch1 = selectedParent.branch === 1;

      // Auto-connect if parent is unclaimed, or deceased, or is a branch leader (Mary, Loretta, etc.)
      const autoConnect = !isClaimed || isDeceased || isBranch1;

      if (!autoConnect) {
        // Send a pending connection request
        const { error: connErr } = await supabase
          .from("connection")
          .insert({
            profile_1: selectedParent.id,
            profile_2: profile.id,
            connection_type: "child",
            status: "pending",
            requested_by: profile.id,
          });

        if (connErr) throw connErr;

        // Create pending notification for parent
        await supabase.from("notification").insert({
          recipient_id: selectedParent.id,
          actor_id: profile.id,
          action_type: "new_guestbook_post", // Bypassing with supported check type in trigger
          target_id: selectedParent.id,
        });

        message.success("Connection request sent to your parent! Waiting for their approval.");
        setStep("welcome");
      } else {
        // Direct, active connection
        const parentBranch = selectedParent.branch;
        const newBranch = (parentBranch !== null && parentBranch !== undefined) ? parentBranch + 1 : 1;
        const newAncestor = selectedParent.ancestor || selectedParent.id;

        // 1. Update user profile branch lineage
        const { error: updateProfileErr } = await supabase
          .from("profile")
          .update({
            parent: selectedParent.id,
            branch: newBranch,
            ancestor: newAncestor,
          })
          .eq("id", profile.id);

        if (updateProfileErr) throw updateProfileErr;

        // Propagate branch and ancestor down to user's descendants
        await updateFamilyBranch(profile.id, newBranch);
        await updateAncestorReference(profile.id, newAncestor);

        // 2. Insert bidirectional connection rows
        const { error: connErr } = await supabase
          .from("connection")
          .insert([
            { profile_1: selectedParent.id, profile_2: profile.id, connection_type: "child", status: "active" },
            { profile_1: profile.id, profile_2: selectedParent.id, connection_type: "parent", status: "active" },
          ]);

        if (connErr) throw connErr;

        // 3. Update active profile state in session
        const { data: updatedProfile, error: fetchErr } = await supabase
          .from("profile")
          .select("*")
          .eq("id", profile.id)
          .single();

        if (!fetchErr && updatedProfile && setProfile) {
          setProfile(updatedProfile);
        }

        setConnectedParentName(`${selectedParent.firstname} ${selectedParent.lastname}`);
        setCalculatedGeneration(newBranch + 1);
        setStep("success");
      }
    } catch (err) {
      console.error("Error establishing parent connection:", err);
      message.error("Failed to connect parent: " + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Copy cousin invite link to clipboard
  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/#/register`;
    const shareText = `Hey! I just connected my profile to the Smith Family Reunion Portal. We need to get our branch connected to beat the other branches on the leaderboard! Join the family tree here: ${inviteUrl}`;
    
    navigator.clipboard.writeText(shareText)
      .then(() => {
        setCopiedInvite(true);
        message.success("Invite link copied to clipboard!");
        setTimeout(() => setCopiedInvite(false), 3000);
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
        message.error("Failed to copy link");
      });
  };

  // Smooth scroll handler to next snap section
  const handleChevronClick = () => {
    const container = document.querySelector(".new-home-container");
    if (container) {
      container.scrollTo({
        top: window.innerHeight,
        behavior: "smooth",
      });
    }
  };

  // Helper to format ordinal generation names
  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Computed connection status flags
  const showDashboard = !!(profile && (
    (profile.parent !== null && profile.ancestor !== null) ||
    (profile.parent === null && profile.ancestor !== null) ||
    (profile.parent === null && hasFamilyConnections)
  ));

  const showConnectLineagePrompt = !!(profile && profile.parent === null && profile.ancestor === null && !hasFamilyConnections);

  const showConnectParentPrompt = !!(profile && profile.parent !== null && profile.ancestor === null);

  // Render Stacked Rows
  return (
    <div className="new-hero-section">
      {/* Row 1: Heritage Title & Photo */}
      <div className="new-hero-row-top">
        <div className="new-hero-title-container">
          <h1 className="new-hero-title">
            <span>Smith</span>
            <span>Family</span>
          </h1>
        </div>

        <div className="new-hero-image-container">
          <img
            src={ancestorsImg}
            alt="Smith Family Ancestors"
            className="new-hero-image"
          />
        </div>
      </div>

      {/* Row 2: Context-Aware Connection Dashboard */}
      <div className="new-hero-row-bottom">
        <div className="hero-dashboard-card">
          
          {/* loading state */}
          {loadingData && (
            <div className="dashboard-loading">
              <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#f3e7b1' }} spin />} />
              <p style={{ marginTop: 12, color: '#EABEA9', fontSize: '0.9rem' }}>Searching database lines...</p>
            </div>
          )}

          {/* GUEST VIEW */}
          {!loadingData && !session && (
            <div className="guest-welcome-panel">
              <h2 className="panel-title">Explore Our Living Heritage</h2>
              <p className="panel-subtext">
                Welcome to our family portal. Join us in preserving our lineage, tracking milestones, and sharing historic memories across generations.
              </p>
              <div className="panel-actions-row">
                <Button 
                  type="primary" 
                  className="hero-primary-btn"
                  onClick={() => navigate("/register")}
                >
                  Sign In with Google
                </Button>
                <Button 
                  type="default" 
                  className="hero-secondary-btn"
                  onClick={() => navigate("/register")}
                >
                  Join / Claim Profile with Google
                </Button>
              </div>
            </div>
          )}

          {/* LOGGED IN & UNONBOARDED VIEW (Redirection fallback) */}
          {!loadingData && session && (!profile || !profile.firstname) && (
            <div className="guest-welcome-panel">
              <h2 className="panel-title">Let's set up your profile</h2>
              <p className="panel-subtext">
                Your account is logged in, but you haven't linked a family card yet. Let's find your place in the Smith family tree.
              </p>
              <Button 
                type="primary" 
                className="hero-primary-btn"
                onClick={() => navigate("/onboarding")}
              >
                Claim or Create Profile Card
              </Button>
            </div>
          )}
          {/* LOGGED IN & CONNECTED DASHBOARD */}
          {!loadingData && session && profile && profile.firstname && (
            <div className="user-dashboard-panel">
              
              {/* 1. UNCONNECTED LINEAGE PROMPT */}
              {showConnectLineagePrompt && (
                <div className="unconnected-intro-panel">
                  <h2 className="panel-title warning-style">Connect to the Family Tree 🌳</h2>
                  <p className="panel-subtext">
                    Lineage connects you to the entire tree, calculates your generation, and links you to the calendar, anniversaries, and milestones of all descendants. Let's find your line!
                  </p>
                  <Button 
                    type="primary" 
                    className="hero-primary-btn connect-trigger-btn"
                    onClick={handleStartLineageBuilder}
                  >
                    Find My Branch & Connect
                  </Button>
                </div>
              )}

              {/* 2. ORPHANED PARENT PROMPT */}
              {showConnectParentPrompt && (
                <div className="unconnected-intro-panel orphaned-parent">
                  <h2 className="panel-title warning-style">Link Your Parent to Tree 🌳</h2>
                  <p className="panel-subtext">
                    You've connected to your parent, but their branch is not yet connected to our first branch ancestors. Let's link them to connect you to the entire tree!
                  </p>
                  <Button 
                    type="primary" 
                    className="hero-primary-btn connect-trigger-btn"
                    onClick={() => navigate(`/parentform/smithparent/${profile.parent}`)}
                  >
                    Link Parent to Ancestor
                  </Button>
                </div>
              )}

              {/* 3. CONNECTED DASHBOARD */}
              {showDashboard && (
                <div className="connected-dashboard-content">
                  
                  {/* Row 1: Lineage Trail */}
                  {lineageTrail && (
                    <div className="lineage-trail-row">
                      {lineageTrail.ancestor && (
                        <>
                          <span className="trail-node ancestor">{lineageTrail.ancestor} Line</span>
                          <span className="trail-arrow">&rarr;</span>
                        </>
                      )}
                      {lineageTrail.parent && (
                        <>
                          <span className="trail-node parent">{lineageTrail.parent}</span>
                          <span className="trail-arrow">&rarr;</span>
                        </>
                      )}
                      <span className="trail-node me">
                        {lineageTrail.me}
                        {profile.parent === null && <span className="spouse-badge-text"> (Spouse)</span>}
                      </span>
                    </div>
                  )}

                  {/* Photo Prompt (Primary Focus 1) */}
                  {!profile.avatar_url && (
                    <div className="photo-prompt-banner">
                      <div className="photo-prompt-header-row">
                        <SmileOutlined className="photo-prompt-icon" />
                        <div className="photo-prompt-details">
                          <span className="banner-title">Add your photo! 📸</span>
                          <span className="banner-text">Help the family recognize you in the interactive tree by uploading a profile picture.</span>
                        </div>
                      </div>
                      <div className="banner-actions-row">
                        <Button 
                          type="primary" 
                          size="small" 
                          className="banner-action-btn"
                          onClick={() => navigate(`/antavatar/${profile.id}`)}
                        >
                          Upload Photo
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Secondary Dashboard Grid */}
                  <div className="dashboard-subgrid">
                    
                    {/* Leaderboard Card */}
                    <div className="dashboard-grid-card leaderboard">
                      <div className="card-header-icon">
                        <TrophyOutlined className="grid-card-icon" />
                        <span className="grid-card-title">Lineage Leaderboard</span>
                      </div>
                      <div className="leaderboard-scores-container">
                        {leaderboard.slice(0, 3).map((item, idx) => (
                          <div key={item.leader.id} className={`score-row rank-${idx + 1}`}>
                            <span className="rank-badge">{idx + 1}</span>
                            <span className="score-name">{item.leader.firstname} Line</span>
                            <span className="score-count">{item.count} active</span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Interactive competition alert */}
                      {leaderboard.length > 0 && (
                        <p className="leaderboard-commentary">
                          🏆 <strong>{leaderboard[0]?.leader?.firstname} Line</strong> is leading!
                        </p>
                      )}
                    </div>

                    {/* Invite Card */}
                    <div className="dashboard-grid-card invite">
                      <div className="card-header-icon">
                        <ShareAltOutlined className="grid-card-icon" />
                        <span className="grid-card-title">Link Sibling / Cousin</span>
                      </div>
                      <p className="invite-desc">
                        Text or message your siblings and cousins to get them connected to your line!
                      </p>
                      <Button 
                        type="primary" 
                        className={`invite-copy-btn ${copiedInvite ? "success" : ""}`}
                        icon={copiedInvite ? <CheckCircleOutlined /> : <CopyOutlined />}
                        onClick={handleCopyInviteLink}
                      >
                        {copiedInvite ? "Invite Copied!" : "Copy Invite Text"}
                      </Button>
                    </div>
                  </div>

                  {/* Tutorial Tips Box */}
                  <div className="dashboard-tips-box">
                    <BulbOutlined className="tip-icon" />
                    <div className="tip-text-carousel">
                      <span className="tip-text-item animate-fade">{tips[activeTipIdx]}</span>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Lineage Builder Drawer */}
      <Drawer
        title={<span style={{ color: "#f3e7b1", fontFamily: "Titillium Web, sans-serif", fontWeight: 700 }}>Connect Your Lineage</span>}
        placement="bottom"
        height="85%"
        open={isWizardOpen}
        onClose={handleCloseWizard}
        destroyOnClose
        styles={{
          body: {
            padding: "16px",
            background: "linear-gradient(to bottom, #4e1237, #3c0c29)",
            color: "#fff",
            overflowY: "auto",
          },
          header: {
            background: "#3c0c29",
            borderBottom: "1px solid rgba(234, 190, 169, 0.15)",
          }
        }}
      >
        <div className="lineage-builder-wizard modal-version" style={{ padding: "8px 0" }}>
          
          {/* Step 1: Select Branch leader */}
          {step === "branch" && (
            <div className="wizard-step-container">
              <div className="step-header-with-back">
                <button className="wizard-back-arrow-btn" onClick={handleCloseWizard}>
                  <ArrowLeftOutlined /> Cancel
                </button>
                <h2 className="panel-title small" style={{ color: "#f3e7b1" }}>Select Your Branch Leader</h2>
              </div>
              <p className="wizard-instruction" style={{ color: "#EABEA9" }}>
                Select which of John & Birdie Mae's children is your ancestor:
              </p>
              <div className="branch-grid text-only">
                {branchLeaders.map((leader) => (
                  <button 
                    key={leader.id} 
                    className="branch-choice-btn-text"
                    onClick={() => handleSelectBranch(leader)}
                  >
                    {leader.firstname} Line
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Establish Relation Choice */}
          {step === "relation" && selectedBranch && (
            <div className="wizard-step-container">
              <div className="step-header-with-back">
                <button className="wizard-back-arrow-btn" onClick={handleStartLineageBuilder}>
                  <ArrowLeftOutlined /> Branches
                </button>
                <h2 className="panel-title small" style={{ color: "#f3e7b1" }}>{selectedBranch.firstname} Line</h2>
              </div>
              <p className="wizard-instruction" style={{ color: "#EABEA9" }}>
                How is <strong>{selectedBranch.firstname} Smith</strong> related to you?
              </p>
              <div className="relation-choices-column">
                <button className="relation-choice-btn" onClick={() => handleSelectRelation("parent")}>
                  {selectedBranch.firstname} is my Parent
                </button>
                <button className="relation-choice-btn" onClick={() => handleSelectRelation("grandparent")}>
                  {selectedBranch.firstname} is my Grandparent
                </button>
                <button className="relation-choice-btn" onClick={() => handleSelectRelation("great_grandparent")}>
                  {selectedBranch.firstname} is my Great-Grandparent
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Select Grandparent */}
          {step === "select_grandparent" && selectedBranch && (
            <div className="wizard-step-container">
              <div className="step-header-with-back">
                <button className="wizard-back-arrow-btn" onClick={() => setStep("relation")}>
                  <ArrowLeftOutlined /> Back
                </button>
                <h2 className="panel-title small" style={{ color: "#f3e7b1" }}>Select Grandparent</h2>
              </div>
              <p className="wizard-instruction" style={{ color: "#EABEA9" }}>
                Select your grandparent from {selectedBranch.firstname}'s line:
              </p>
              {grandparentsList.length === 0 ? (
                <div className="empty-branch-placeholder" style={{ color: "#EABEA9", padding: "16px 0", textAlign: "center" }}>
                  No grandparent profiles found. Click below to add.
                </div>
              ) : (
                <div className="children-grid-text">
                  {grandparentsList.map((g) => (
                    <button 
                      key={g.id} 
                      className="child-choice-btn-text"
                      onClick={() => handleSelectGrandparent(g)}
                    >
                      {g.firstname} {g.lastname ? `${g.lastname[0]}.` : ""}
                    </button>
                  ))}
                </div>
              )}
              <button 
                className="child-select-btn-add-new"
                onClick={() => {
                  handleCloseWizard();
                  navigate(`/parentform/smithparent/${profile.id}`);
                }}
              >
                <UserAddOutlined /> Grandparent is not listed (+ Add)
              </button>
            </div>
          )}

          {/* Step 4: Select Parent */}
          {step === "select_parent" && selectedBranch && (
            <div className="wizard-step-container">
              <div className="step-header-with-back">
                <button 
                  className="wizard-back-arrow-btn" 
                  onClick={() => setStep(relationType === "grandparent" ? "relation" : "select_grandparent")}
                >
                  <ArrowLeftOutlined /> Back
                </button>
                <h2 className="panel-title small" style={{ color: "#f3e7b1" }}>Select Your Parent</h2>
              </div>
              <p className="wizard-instruction font-tight" style={{ color: "#EABEA9" }}>
                {relationType === "grandparent" 
                  ? `Which of ${selectedBranch.firstname}'s children is your parent?` 
                  : `Which of ${selectedGrandparent?.firstname}'s children is your parent?`
                }
              </p>
              {parentsList.length === 0 ? (
                <div className="empty-branch-placeholder" style={{ color: "#EABEA9", padding: "16px 0", textAlign: "center" }}>
                  No parent profiles found. Click below to add.
                </div>
              ) : (
                <div className="children-grid-text">
                  {parentsList.map((p) => (
                    <button 
                      key={p.id} 
                      className="child-choice-btn-text"
                      onClick={() => handleSelectParent(p)}
                    >
                      {p.firstname} {p.lastname ? `${p.lastname[0]}.` : ""}
                    </button>
                  ))}
                </div>
              )}
              <button 
                className="child-select-btn-add-new"
                onClick={() => {
                  handleCloseWizard();
                  navigate(`/parentform/smithparent/${profile.id}`);
                }}
              >
                <UserAddOutlined /> My parent is not listed (+ Add)
              </button>
            </div>
          )}

          {/* Step 5: Confirm Parent Link */}
          {step === "confirm" && selectedParent && (
            <div className="wizard-step-container">
              <div className="step-header-with-back">
                <button 
                  className="wizard-back-arrow-btn" 
                  onClick={() => setStep(relationType === "parent" ? "relation" : "select_parent")}
                >
                  <ArrowLeftOutlined /> Back
                </button>
                <h2 className="panel-title small" style={{ color: "#f3e7b1" }}>Confirm Connection</h2>
              </div>
              <div className="confirm-connection-card">
                <Avatar 
                  src={getAvatarSrc(selectedParent)} 
                  icon={<UserOutlined />} 
                  size={70} 
                  className="confirm-avatar"
                />
                <h3 className="confirm-name" style={{ color: "#f3e7b1" }}>{selectedParent.firstname} {selectedParent.lastname}</h3>
                
                {selectedParent.sunset || (!selectedParent.email && !selectedParent.phone) || selectedParent.branch === 1 ? (
                  <p className="confirm-disclaimer" style={{ color: "#EABEA9" }}>
                    This is an ancestral profile. Confirming will connect your lineage **instantly** to the interactive family tree.
                  </p>
                ) : (
                  <p className="confirm-disclaimer warning" style={{ color: "#F7DC92" }}>
                    This is an active member profile. Confirming will send a connection request. You will be connected once they approve.
                  </p>
                )}

                <Button 
                  type="primary" 
                  className="hero-primary-btn confirm-btn"
                  loading={loadingAction}
                  onClick={handleConfirmConnection}
                >
                  {selectedParent.sunset || (!selectedParent.email && !selectedParent.phone) || selectedParent.branch === 1
                    ? "Confirm & Connect Instantly" 
                    : "Send Connection Request"
                  }
                </Button>
              </div>
            </div>
          )}

          {/* Step 6: Success pay-off screen */}
          {step === "success" && (
            <div className="wizard-step-container success">
              <div className="success-icon-pulse">
                <CheckCircleOutlined style={{ fontSize: '3rem', color: '#52c41a' }} />
              </div>
              <h2 className="panel-title" style={{ color: "#f3e7b1" }}>Connection Successful! 🎉</h2>
              <p className="success-subtext" style={{ color: "#EABEA9" }}>
                Welcome to the <strong>{selectedBranch?.firstname} Line</strong>! You are now connected to your parent, <strong>{connectedParentName}</strong>, and officially recognized as a <strong>{calculatedGeneration ? getOrdinal(calculatedGeneration) : "N/A"} Generation</strong> Smith descendant on the interactive tree.
              </p>
              
              <div className="panel-actions-row">
                <Button 
                  type="primary" 
                  className="hero-primary-btn"
                  onClick={() => {
                    handleCloseWizard();
                    navigate(`/antavatar/${profile.id}`);
                  }}
                >
                  <UploadOutlined /> Upload Profile Photo
                </Button>
                <Button 
                  type="default" 
                  className="hero-secondary-btn"
                  onClick={handleCloseWizard}
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}

        </div>
      </Drawer>

      {/* Down Chevron Anchor */}
      <div className="new-hero-chevron-container" onClick={handleChevronClick}>
        <DownOutlined className="new-hero-chevron" />
      </div>
    </div>
  );
};

export default NewHeroSection;
