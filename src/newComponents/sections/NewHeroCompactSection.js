import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  DownOutlined, 
  ArrowLeftOutlined, 
  UploadOutlined, 
  UserAddOutlined, 
  BulbOutlined, 
  TrophyOutlined, 
  CheckCircleOutlined,
  LoadingOutlined,
  UserOutlined,
  CameraOutlined,
  QuestionCircleOutlined,
  LinkOutlined,
  SmileOutlined,
  PlusOutlined,
  CalendarOutlined,
  BookOutlined
} from "@ant-design/icons";
import { Avatar, Button, Spin, Drawer, message } from "antd";
import ancestorsImg from "../../assets/anc1.png";
import { supabase } from "../../supabaseClient";
import AuthConsumer from "../../useSession";
import { getAvatarSrc } from "../../utils/avatarHelper";
import { updateFamilyBranch, updateAncestorReference } from "../../utils/familyTree";
import "./NewHeroCompactSection.css";
import { useHomeCache } from "./HomeCacheContext";
import { buildAncestorLeaderboard } from "./leaderboardUtils";

const tips = [
  "💡 Tip: Tap 'Interactive Tree' in the menu to visually view how you connect back to John Henry & Birdie Mae.",
  "💡 Tip: Scroll down to the 'Family Finder' to search for any cousin and view their milestones.",
  "💡 Tip: You can leave a quick message or tribute on your cousin's wall in the Guestbook.",
  "💡 Tip: Head to the Family Media page to upload historic photos and tag your relatives."
];

const NewHeroCompactSection = ({ demoMode }) => {
  const { session: realSession, profile: realProfile, setProfile } = AuthConsumer();
  const navigate = useNavigate();

  const {
    branchLeaders: cachedLeaders,
    setBranchLeaders: setCachedLeaders,
    globalProfiles: cachedProfiles,
    setGlobalProfiles: setCachedProfiles,
  } = useHomeCache();

  const isDemo = !!demoMode;
  const session = isDemo ? (demoMode === "guest" ? null : { user: { id: "demo-user-id" } }) : realSession;
  const profile = useMemo(() => {
    return isDemo ? (
      demoMode === "guest" ? null :
      demoMode === "unclaimed" ? null :
      demoMode === "unconnected" ? { id: "demo-user-id", firstname: "David", lastname: "Smith", parent: null, ancestor: null, avatar_url: null, branch: null } :
      demoMode === "connected_no_photo" ? { id: "demo-user-id", firstname: "David", lastname: "Smith", parent: "arthur-id", ancestor: "mary-id", avatar_url: null, branch: 2 } :
      demoMode === "connected_no_family" ? { id: "demo-user-id", firstname: "David", lastname: "Smith", parent: "arthur-id", ancestor: "mary-id", avatar_url: "john.jpg", branch: 2 } :
      { id: "demo-user-id", firstname: "David", lastname: "Smith", parent: "arthur-id", ancestor: "mary-id", avatar_url: "john.jpg", branch: 2 }
    ) : realProfile;
  }, [isDemo, demoMode, realProfile]);

  const [step, setStep] = useState("welcome");
  const [loadingData, setLoadingData] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Lineage Builder States
  const [branchLeaders, setBranchLeaders] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null); 
  const [relationType, setRelationType] = useState(null); 
  const [grandparentsList, setGrandparentsList] = useState([]);
  const [selectedGrandparent, setSelectedGrandparent] = useState(null);
  const [parentsList, setParentsList] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);
  const [connectedParentName, setConnectedParentName] = useState("");
  const [calculatedGeneration, setCalculatedGeneration] = useState(null);

  const [copiedInvite, setCopiedInvite] = useState(false);
  const [activeTipIdx, setActiveTipIdx] = useState(0);

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [lineageTrail, setLineageTrail] = useState(null);

  // Connections setup
  const [spouseProfile, setSpouseProfile] = useState(null);
  const [childrenProfiles, setChildrenProfiles] = useState([]);
  const [noSpouse, setNoSpouse] = useState(false);
  const [noMoreChildren, setNoMoreChildren] = useState(false);
  
  // Rotating Actions Hub active index
  const [activeActionIdx, setActiveActionIdx] = useState(0);

  // Sync checklist state with local storage
  useEffect(() => {
    if (!profile || !profile.id) return;
    if (isDemo) {
      setNoSpouse(false);
      setNoMoreChildren(false);
      return;
    }
    setNoSpouse(localStorage.getItem(`family_reunion_no_spouse_${profile.id}`) === "true");
    setNoMoreChildren(localStorage.getItem(`family_reunion_no_more_children_${profile.id}`) === "true");
  }, [profile, isDemo, demoMode]);

  const handleToggleNoSpouse = (val) => {
    setNoSpouse(val);
    if (profile?.id) {
      localStorage.setItem(`family_reunion_no_spouse_${profile.id}`, val ? "true" : "false");
    }
  };

  const handleToggleNoMoreChildren = (val) => {
    setNoMoreChildren(val);
    if (profile?.id) {
      localStorage.setItem(`family_reunion_no_more_children_${profile.id}`, val ? "true" : "false");
    }
  };

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTipIdx((prev) => (prev + 1) % tips.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Rotate final CTAs
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveActionIdx((prev) => (prev + 1) % 3);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Fetch connections
  useEffect(() => {
    if (isDemo) {
      if (demoMode === "connected_complete") {
        setSpouseProfile({ id: "spouse-demo-id", firstname: "Sarah", lastname: "Smith", avatar_url: null });
        setChildrenProfiles([{ id: "child-demo-1", firstname: "Junior", lastname: "Smith", avatar_url: null }]);
      } else {
        setSpouseProfile(null);
        setChildrenProfiles([]);
      }
      return;
    }

    if (!profile || !profile.id) {
      setSpouseProfile(null);
      setChildrenProfiles([]);
      return;
    }

    const checkFamilyConnections = async () => {
      try {
        const { data: connData, error: connErr } = await supabase
          .from("connection")
          .select("connection_type, profile_1, profile_2")
          .or(`profile_1.eq.${profile.id},profile_2.eq.${profile.id}`)
          .eq("status", "active");

        if (connErr) throw connErr;

        const spouseConns = (connData || []).filter(c => c.connection_type === "spouse");
        const hasSpouse = spouseConns.length > 0;

        if (hasSpouse) {
          const spouseId = spouseConns[0].profile_1 === profile.id ? spouseConns[0].profile_2 : spouseConns[0].profile_1;
          const { data: spouseProf, error: spouseProfErr } = await supabase
            .from("profile")
            .select("id, firstname, nickname, lastname, avatar_url, branch, ancestor")
            .eq("id", spouseId)
            .single();
          if (!spouseProfErr && spouseProf) {
            setSpouseProfile(spouseProf);
          }
        } else {
          setSpouseProfile(null);
        }

        const { data: childrenData, error: childErr } = await supabase
          .from("profile")
          .select("id, firstname, nickname, lastname, avatar_url, branch, parent, ancestor")
          .eq("parent", profile.id);

        if (childErr) throw childErr;
        setChildrenProfiles(childrenData || []);

        if (profile.parent === null && profile.ancestor === null && hasSpouse) {
          const spouseId = spouseConns[0].profile_1 === profile.id ? spouseConns[0].profile_2 : spouseConns[0].profile_1;
          const { data: spouseProfileObj, error: spouseProfErr } = await supabase
            .from("profile")
            .select("branch, ancestor")
            .eq("id", spouseId)
            .single();

          if (!spouseProfErr && spouseProfileObj && spouseProfileObj.ancestor) {
            const { error: updateErr } = await supabase
              .from("profile")
              .update({ branch: spouseProfileObj.branch, ancestor: spouseProfileObj.ancestor })
              .eq("id", profile.id);

            if (!updateErr && setProfile) {
              setProfile({ ...profile, branch: spouseProfileObj.branch, ancestor: spouseProfileObj.ancestor });
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    checkFamilyConnections();
  }, [profile, isDemo, demoMode, setProfile]);

  // Fetch lineage trail
  useEffect(() => {
    if (isDemo) {
      if (demoMode && demoMode.startsWith("connected")) {
        setLineageTrail({
          ancestor: { id: "mary-id", firstname: "Mary", nickname: "", lastname: "Thibodeaux", avatar_url: "mary.jpg" },
          parent: { id: "arthur-id", firstname: "Arthur", nickname: "", lastname: "Thibodeaux", avatar_url: "arthur.jpg" },
          me: profile || { id: "demo-user-id", firstname: "David", lastname: "Smith", avatar_url: "john.jpg" }
        });
      } else {
        setLineageTrail(null);
      }
      return;
    }

    const fetchLineageTrail = async () => {
      if (!profile || !profile.id || !profile.parent || !profile.ancestor) {
        setLineageTrail(null);
        return;
      }
      try {
        const { data: ancestorProfile, error: ancErr } = await supabase
          .from("profile")
          .select("id, firstname, nickname, lastname, avatar_url, branch")
          .eq("id", profile.ancestor)
          .single();

        if (ancErr) throw ancErr;

        const { data: parentProfile, error: parErr } = await supabase
          .from("profile")
          .select("id, firstname, nickname, lastname, avatar_url, branch")
          .eq("id", profile.parent)
          .single();

        if (parErr) throw parErr;

        setLineageTrail({
          ancestor: ancestorProfile,
          parent: parentProfile,
          me: profile
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchLineageTrail();
  }, [profile, isDemo, demoMode]);

  // Fetch branch leaders and active leaderboard
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
        { leader: mockLeaders[9], count: 12 }, 
        { leader: mockLeaders[8], count: 8 },  
        { leader: mockLeaders[3], count: 5 },  
      ]);
      return;
    }

    const loadCoreData = async () => {
      setLoadingData(true);
      try {
        let leaders = cachedLeaders;
        let allProfiles = cachedProfiles;

        if (!leaders) {
          const { data, error } = await supabase
            .from("profile")
            .select("id, firstname, nickname, lastname, avatar_url, branch, sunrise, sunset")
            .eq("branch", 1)
            .order("sunrise", { ascending: true });

          if (error) throw error;
          leaders = data;
          setCachedLeaders(data);
        }

        if (!allProfiles) {
          const { data, error } = await supabase
            .from("profile")
            .select("id, parent, ancestor, branch, email, sunrise");

          if (error) throw error;
          allProfiles = data;
          setCachedProfiles(data);
        }

        const leaderboardData = buildAncestorLeaderboard(allProfiles, leaders);

        setBranchLeaders(leaders);
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    };

    loadCoreData();
  }, [isDemo, cachedLeaders, cachedProfiles, setCachedLeaders, setCachedProfiles]);

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

  const handleSelectBranch = (branch) => {
    setSelectedBranch(branch);
    setStep("relation");
  };

  const handleSelectRelation = async (type) => {
    setRelationType(type);
    if (isDemo) {
      const mockChildren = [
        { id: "child-1", firstname: "Thomas", lastname: "Thibodeaux", branch: 2, sunset: true },
        { id: "child-2", firstname: "Susan", lastname: "Thibodeaux", branch: 2, email: "susan@demo.com" },
        { id: "child-3", firstname: "Robert", lastname: "Thibodeaux", branch: 2, email: null }
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
        setSelectedParent(selectedBranch);
        setStep("confirm");
      } else {
        const { data, error } = await supabase
          .from("profile")
          .select("id, firstname, nickname, lastname, avatar_url, branch, email, sunset")
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
      console.error(err);
      message.error("Failed to load family line children");
    } finally {
      setLoadingData(false);
    }
  };

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
        .select("id, firstname, nickname, lastname, avatar_url, branch, email, sunset")
        .eq("parent", grandparent.id)
        .order("firstname", { ascending: true });

      if (error) throw error;
      setParentsList(data || []);
      setStep("select_parent");
    } catch (err) {
      console.error(err);
      message.error("Failed to load children");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSelectParent = (parent) => {
    setSelectedParent(parent);
    setStep("confirm");
  };

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
      const isClaimed = selectedParent.email;
      const isDeceased = selectedParent.sunset;
      const isBranch1 = selectedParent.branch === 1;
      const autoConnect = !isClaimed || isDeceased || isBranch1;

      if (!autoConnect) {
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

        await supabase.from("notification").insert({
          recipient_id: selectedParent.id,
          actor_id: profile.id,
          action_type: "new_guestbook_post",
          target_id: selectedParent.id,
        });

        message.success("Connection request sent to your parent! Waiting for their approval.");
        setStep("welcome");
      } else {
        const parentBranch = selectedParent.branch;
        const newBranch = (parentBranch !== null && parentBranch !== undefined) ? parentBranch + 1 : 1;
        const newAncestor = selectedParent.ancestor || selectedParent.id;

        const { error: updateProfileErr } = await supabase
          .from("profile")
          .update({ parent: selectedParent.id, branch: newBranch, ancestor: newAncestor })
          .eq("id", profile.id);

        if (updateProfileErr) throw updateProfileErr;

        await updateFamilyBranch(profile.id, newBranch);
        await updateAncestorReference(profile.id, newAncestor);

        const { error: connErr } = await supabase
          .from("connection")
          .insert([
            { profile_1: selectedParent.id, profile_2: profile.id, connection_type: "child", status: "active" },
            { profile_1: profile.id, profile_2: selectedParent.id, connection_type: "parent", status: "active" },
          ]);

        if (connErr) throw connErr;

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
      console.error(err);
      message.error("Failed to connect parent: " + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

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
        console.error(err);
        message.error("Failed to copy link");
      });
  };

  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const handleChevronClick = () => {
    const parentContainer = document.querySelector(".new-home-container");
    if (parentContainer) {
      parentContainer.scrollBy({
        top: window.innerHeight,
        behavior: "smooth",
      });
    }
  };

  const getActiveCTA = () => {
    // 1. Profile Photo Upload CTA
    if (!profile.avatar_url) {
      return (
        <div className="compact-cta-card-content photo-cta cta-pulse">
          <CameraOutlined className="compact-cta-main-icon" />
          <h3 className="compact-cta-heading">Add Profile Photo</h3>
          <p className="compact-cta-desc">Help your cousins recognize you on the family tree by adding a profile photo.</p>
          <div className="compact-cta-actions">
            <Button type="primary" className="compact-btn-primary" onClick={() => navigate(`/antavatar/${profile.id}`)}>
              Add Photo
            </Button>
          </div>
        </div>
      );
    }

    // 2. Parent Connection Link CTA
    if (profile.parent === null && profile.ancestor === null) {
      return (
        <div className="compact-cta-card-content lineage-cta cta-pulse">
          <UserAddOutlined className="compact-cta-main-icon" />
          <h3 className="compact-cta-heading">Connect to Tree</h3>
          <p className="compact-cta-desc">Lineage connects you to the entire interactive tree and calculates your generation.</p>
          <div className="compact-cta-actions">
            <Button type="primary" className="compact-btn-primary" onClick={handleStartLineageBuilder}>
              Find My Parent
            </Button>
          </div>
        </div>
      );
    }

    // 3. Parent ancestor link CTA (Orphaned Parent)
    if (profile.parent !== null && profile.ancestor === null) {
      return (
        <div className="compact-cta-card-content parent-link-cta cta-pulse">
          <LinkOutlined className="compact-cta-main-icon" />
          <h3 className="compact-cta-heading">Resolve Lineage</h3>
          <p className="compact-cta-desc">Your parent profile is created, but needs to be linked to John & Birdie Mae's descendants.</p>
          <div className="compact-cta-actions">
            <Button type="primary" className="compact-btn-primary" onClick={() => navigate(`/parentform/smithparent/${profile.parent}`)}>
              Link Parent to Ancestor
            </Button>
          </div>
        </div>
      );
    }

    // 4. Spouse Connection CTA
    if (!spouseProfile && !noSpouse) {
      return (
        <div className="compact-cta-card-content spouse-cta">
          <SmileOutlined className="compact-cta-main-icon" />
          <h3 className="compact-cta-heading">Connect Spouse</h3>
          <p className="compact-cta-desc">Add your spouse profile to build your immediate family branch.</p>
          <div className="compact-cta-actions vertical">
            <Button type="primary" className="compact-btn-primary" onClick={() => navigate(`/interactive-form/spouse/${profile.id}`)}>
              Connect Spouse
            </Button>
            <Button type="text" className="compact-cta-dismiss-btn" onClick={() => handleToggleNoSpouse(true)}>
              I don't have a spouse
            </Button>
          </div>
        </div>
      );
    }

    // 5. Children Connection CTA (No children yet)
    if (childrenProfiles.length === 0 && !noMoreChildren) {
      return (
        <div className="compact-cta-card-content children-cta">
          <PlusOutlined className="compact-cta-main-icon" />
          <h3 className="compact-cta-heading">Connect Children</h3>
          <p className="compact-cta-desc">Add your children to the tree so they are included in milestones and calendar events.</p>
          <div className="compact-cta-actions vertical">
            <Button type="primary" className="compact-btn-primary" onClick={() => navigate(`/interactive-form/child/${profile.id}`)}>
              Add Children
            </Button>
            <Button type="text" className="compact-cta-dismiss-btn" onClick={() => handleToggleNoMoreChildren(true)}>
              No children / Done
            </Button>
          </div>
        </div>
      );
    }

    // 6. Children Connection CTA (Already has children, but check if they want to add more)
    if (childrenProfiles.length > 0 && !noMoreChildren) {
      return (
        <div className="compact-cta-card-content children-cta">
          <PlusOutlined className="compact-cta-main-icon" />
          <h3 className="compact-cta-heading">Add More Children?</h3>
          <p className="compact-cta-desc">You have connected {childrenProfiles.length} child{childrenProfiles.length === 1 ? "" : "ren"}. Would you like to add more?</p>
          <div className="compact-cta-actions vertical">
            <Button type="primary" className="compact-btn-primary" onClick={() => navigate(`/interactive-form/child/${profile.id}`)}>
              Add Another Child
            </Button>
            <Button type="text" className="compact-cta-dismiss-btn" onClick={() => handleToggleNoMoreChildren(true)}>
              No more children
            </Button>
          </div>
        </div>
      );
    }

    // 7. Rotating Action Hub (if all profile connections are completed/dismissed)
    const rotatingActions = [
      {
        icon: <CalendarOutlined className="compact-cta-main-icon" />,
        title: "Share a Milestone",
        desc: "Keep the family updated on weddings, births, graduations, or passings.",
        btnText: "Add Milestone",
        onClick: () => navigate("/milestones")
      },
      {
        icon: <BookOutlined className="compact-cta-main-icon" />,
        title: "Sign Guestbook",
        desc: "Write a warm tribute, memory, or quick hello on the family wall.",
        btnText: "Sign Wall",
        onClick: () => navigate("/guestbook")
      },
      {
        icon: <LinkOutlined className="compact-cta-main-icon" />,
        title: "Invite Cousins",
        desc: "Copy our custom invite link and send it to your siblings and relatives.",
        btnText: copiedInvite ? "✅ Link Copied!" : "Copy Invite Link",
        onClick: handleCopyInviteLink,
        isSuccessBtn: copiedInvite
      }
    ];

    const currentAction = rotatingActions[activeActionIdx % rotatingActions.length];

    return (
      <div className="compact-cta-card-content hub-cta">
        {currentAction.icon}
        <h3 className="compact-cta-heading">{currentAction.title}</h3>
        <p className="compact-cta-desc">{currentAction.desc}</p>
        <div className="compact-cta-actions">
          <Button 
            type="primary" 
            className={`compact-btn-primary ${currentAction.isSuccessBtn ? "success" : ""}`} 
            onClick={currentAction.onClick}
          >
            {currentAction.btnText}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="new-hero-compact-section">
      {/* Row 1: Stacked Header (Title on top, ancestor image centered below) */}
      <div className="compact-header-row stacked">
        <div className="compact-title-container">
          <h1 className="compact-hero-title centered">SMITH FAMILY</h1>
        </div>

        <div className="compact-image-container">
          <div className="vignette-image-wrapper">
            <img
              src={ancestorsImg}
              alt="Smith Family Ancestors"
              className="vignette-hero-image"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Context-Aware Connection Dashboard */}
      <div className="compact-dashboard-wrapper">
        
        {loadingData && (
          <div className="compact-dashboard-loading">
            <Spin indicator={<LoadingOutlined style={{ fontSize: "1.5rem", color: '#f3e7b1' }} spin />} />
            <p style={{ marginTop: "0.5rem", color: '#EABEA9', fontSize: '0.8rem' }}>Loading family data...</p>
          </div>
        )}

        {/* GUEST VIEW */}
        {!loadingData && !session && (
          <div className="guest-welcome-card-wrapper">
            <h2 className="welcome-card-title">Explore Our Living Heritage</h2>
            <p className="welcome-card-subtext">
              Welcome to our family portal. Join us in preserving our lineage, tracking milestones, and sharing historic memories across generations.
            </p>
            <div className="compact-actions-row">
              <Button 
                type="primary" 
                className="compact-btn-primary"
                onClick={() => navigate("/register")}
              >
                Sign In with Google
              </Button>
              <Button 
                type="default" 
                className="compact-btn-secondary"
                onClick={() => navigate("/register")}
              >
                Join / Claim Profile
              </Button>
            </div>
          </div>
        )}

        {/* LOGGED IN & UNONBOARDED VIEW (Redirection fallback) */}
        {!loadingData && session && (!profile || !profile.firstname) && (
          <div className="onboarding-welcome-card-wrapper">
            <h2 className="welcome-card-title">Let's set up your profile</h2>
            <p className="welcome-card-subtext">
              Your account is logged in, but you haven't linked a family card yet. Let's find your place in the Smith family tree.
            </p>
            <div className="compact-actions-row">
              <Button 
                type="primary" 
                className="compact-btn-primary"
                onClick={() => navigate("/onboarding")}
              >
                Claim or Create Profile Card
              </Button>
            </div>
          </div>
        )}

        {/* LOGGED IN VIEW */}
        {!loadingData && session && profile && profile.firstname && (
          <>
            {/* Visual 3-Avatar Lineage Chain Card */}
            <div className="compact-lineage-card">
              {(() => {
                const nodes = [];
                
                // 1. Ancestor Node
                if (lineageTrail?.ancestor) {
                  nodes.push({
                    type: "ancestor",
                    profile: lineageTrail.ancestor,
                    label: `${lineageTrail.ancestor.firstname} Line`,
                    onClick: () => navigate(`/profile/${lineageTrail.ancestor.id}`)
                  });
                } else {
                  nodes.push({
                    type: "ancestor",
                    placeholder: true,
                    label: "Select Ancestor",
                    onClick: handleStartLineageBuilder
                  });
                }

                // 2. Parent Node
                const isParentAncestor = lineageTrail?.parent && lineageTrail?.ancestor && (lineageTrail.parent.id === lineageTrail.ancestor.id);
                
                if (!isParentAncestor) {
                  if (lineageTrail?.parent) {
                    nodes.push({
                      type: "parent",
                      profile: lineageTrail.parent,
                      label: lineageTrail.parent.firstname,
                      onClick: () => navigate(`/profile/${lineageTrail.parent.id}`)
                    });
                  } else {
                    nodes.push({
                      type: "parent",
                      placeholder: true,
                      label: "Select Parent",
                      onClick: () => {
                        if (profile && profile.parent) {
                          navigate(`/parentform/smithparent/${profile.parent}`);
                        } else {
                          handleStartLineageBuilder();
                        }
                      }
                    });
                  }
                }

                // 3. User Node (With smart photo trigger inside the avatar)
                const userHasPhoto = !!profile.avatar_url;
                nodes.push({
                  type: "user",
                  profile: profile,
                  label: profile?.firstname || "You",
                  isUser: true,
                  hasPhoto: userHasPhoto,
                  onClick: () => navigate(`/antavatar/${profile.id}`)
                });

                // 4. Child Node (Only if parent === ancestor and children exist)
                if (isParentAncestor && childrenProfiles.length > 0) {
                  const firstChild = childrenProfiles[0];
                  nodes.push({
                    type: "child",
                    profile: firstChild,
                    label: childrenProfiles.length === 1 ? firstChild.firstname : `${childrenProfiles.length} Children`,
                    onClick: () => navigate(`/profile/${firstChild.id}`)
                  });
                }

                return (
                  <div className="compact-lineage-chain">
                    {nodes.map((node, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && (
                          <div className="compact-chain-arrow">
                            <span>&rarr;</span>
                          </div>
                        )}
                        <div 
                          className={`compact-node-btn ${node.placeholder ? "is-placeholder" : ""} ${node.isUser ? "is-user" : ""} ${node.isUser && !node.hasPhoto ? "needs-photo" : ""}`}
                          onClick={node.onClick}
                        >
                          <div className="compact-avatar-holder">
                            {node.placeholder ? (
                              <QuestionCircleOutlined className="compact-ph-icon" />
                            ) : node.isUser && !node.hasPhoto ? (
                              <div className="compact-photo-upload-trigger">
                                <CameraOutlined className="compact-trigger-camera" />
                                <span className="compact-trigger-plus">+</span>
                              </div>
                            ) : (
                              <Avatar 
                                src={getAvatarSrc(node.profile)} 
                                icon={<UserOutlined />} 
                                className="compact-avatar-img-tag"
                              />
                            )}
                          </div>
                          <span className="compact-node-lbl">{node.label}</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Side-by-Side Dashboard Columns */}
            <div className="compact-dashboard-columns">
              
              {/* Column 1: Leaderboard Card */}
              <div className="compact-col-card compact-leaderboard">
                <div className="compact-card-header">
                  <TrophyOutlined className="compact-card-icon gold-color" />
                  <span className="compact-card-title">Leaderboard</span>
                </div>
                <div className="compact-scores-box">
                  {leaderboard.slice(0, 3).map((item, idx) => {
                    const colors = ["#F7DC92", "#e0e0e0", "#cd7f32"];
                    const trophyColor = colors[idx] || "#EABEA9";
                    return (
                      <div key={item.leader.id} className="compact-score-row">
                        <div className="compact-score-row-top">
                          <TrophyOutlined style={{ color: trophyColor, marginRight: "0.4rem", fontSize: "0.95rem" }} />
                          <span className="compact-score-name">{item.leader.firstname} Line</span>
                        </div>
                        <div className="compact-score-row-bottom">
                          <span className="compact-score-count">{item.count} Active Members</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: Connections & Dynamic CTA Actions Card */}
              <div className="compact-col-card compact-actions-center">
                {getActiveCTA()}
              </div>

            </div>

            {/* Compact Tip Row */}
            <div className="compact-tip-row">
              <BulbOutlined className="compact-tip-icon" />
              <span className="compact-tip-text">{tips[activeTipIdx]}</span>
            </div>
          </>
        )}

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
                
                {selectedParent.sunset || (!selectedParent.email) || selectedParent.branch === 1 ? (
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
                  className="compact-btn-primary confirm-btn"
                  loading={loadingAction}
                  onClick={handleConfirmConnection}
                >
                  {selectedParent.sunset || (!selectedParent.email) || selectedParent.branch === 1
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
              
              <div className="compact-actions-row">
                <Button 
                  type="primary" 
                  className="compact-btn-primary"
                  onClick={() => {
                    handleCloseWizard();
                    navigate(`/antavatar/${profile.id}`);
                  }}
                >
                  <UploadOutlined /> Upload Profile Photo
                </Button>
                <Button 
                  type="default" 
                  className="compact-btn-secondary"
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
      <div className="compact-chevron-container" onClick={handleChevronClick}>
        <DownOutlined className="compact-chevron-icon" />
      </div>
    </div>
  );
};

export default NewHeroCompactSection;
