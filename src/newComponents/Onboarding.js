import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AutoComplete, Avatar, Button, Card, Spin, Typography, message } from "antd";
import { CloseOutlined, SearchOutlined, UserOutlined, UserAddOutlined, SafetyOutlined, TeamOutlined, CheckCircleFilled } from "@ant-design/icons";
import { supabase } from "../supabaseClient";
import AuthConsumer from "../useSession";
import { format } from "date-fns";
import { getAvatarSrc } from "../utils/avatarHelper";
import "./Onboarding.css";

const { Title, Text } = Typography;

const Onboarding = () => {
  const { session, setProfile } = AuthConsumer();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [flow, setFlow] = useState("choice"); // 'choice' | 'search' | 'confirm'
  const [searchText, setSearchText] = useState("");
  const [options, setOptions] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [searching, setSearching] = useState(false);

  // Prevent accidental back-button loss of progress
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (flow !== "choice") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flow]);

  const handleClose = () => {
    navigate("/");
  };

  const handleSearch = async (value) => {
    setSearchText(value);
    if (!value || value.length < 2) {
      setOptions([]);
      return;
    }

    setSearching(true);
    try {
      // Find unclaimed profiles (where email is null or empty) matching search text
      const { data, error } = await supabase
        .from("profile")
        .select("id, firstname, nickname, lastname, avatar_url, branch, sunrise, sunset, parent, ancestor")
        .or(`firstname.ilike.%${value}%,nickname.ilike.%${value}%,lastname.ilike.%${value}%`)
        .is("email", null)
        .or("branch.neq.0,branch.is.null") // Cannot claim Branch 0 (The Roots) but allow null branch profiles
        .order("firstname", { ascending: true })
        .limit(8);

      if (!error && data) {
        setOptions(
          data.map((p) => ({
            value: p.id,
            label: (
              <div className="onboarding-search-item" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 4px" }}>
                <Avatar 
                  src={getAvatarSrc(p)}
                  icon={!getAvatarSrc(p) && <UserOutlined />}
                  size="default"
                  style={{ border: "2px solid rgba(234,190,169,0.3)" }}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "#f3e7b1", fontWeight: 600, fontSize: "0.95rem" }}>
                    {p.firstname} {p.nickname && `"${p.nickname}"`} {p.lastname}
                  </span>
                  {p.sunrise && (
                    <span style={{ color: "rgba(234,190,169,0.6)", fontSize: "0.75rem" }}>
                      Born {format(new Date(p.sunrise), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>
            ),
            profile: p,
          }))
        );
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const onSelectProfile = (value, option) => {
    setSelectedProfile(option.profile);
    setFlow("confirm");
  };

  const handleClaimProfile = async () => {
    if (!selectedProfile) return;
    setLoading(true);
    try {
      const p_user_id = session?.user?.id;
      const p_email = session?.user?.email || null;

      if (!p_user_id) throw new Error("Must be logged in to claim a profile.");

      // Age verification check (18+)
      if (selectedProfile.sunrise) {
        const birthDate = new Date(selectedProfile.sunrise);
        const ageDiffMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDiffMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        if (age < 18) {
          throw new Error("This profile represents a minor (under 18). Minor profiles cannot be claimed; they must remain unclaimed and managed by their parent or guardian.");
        }
      }

      // 1. Copy data from seededProfile to the auto-created empty profile (p_user_id)
      const updateData = {
        firstname: selectedProfile.firstname,
        lastname: selectedProfile.lastname,
        nickname: selectedProfile.nickname || null,
        avatar_url: selectedProfile.avatar_url || null,
        sunrise: selectedProfile.sunrise || null,
        sunset: selectedProfile.sunset || null,
        branch: selectedProfile.branch,
        parent: selectedProfile.parent || null,
        ancestor: selectedProfile.ancestor || null,
        email: p_email
      };

      const { error: copyError } = await supabase
        .from("profile")
        .upsert({ id: p_user_id, ...updateData });

      if (copyError) throw copyError;

      // 2. Cascade update all foreign key references in other tables
      
      // Update connection table:
      const { error: conn1Err } = await supabase
        .from("connection")
        .update({ profile_1: p_user_id })
        .eq("profile_1", selectedProfile.id);
      if (conn1Err) throw conn1Err;

      const { error: conn2Err } = await supabase
        .from("connection")
        .update({ profile_2: p_user_id })
        .eq("profile_2", selectedProfile.id);
      if (conn2Err) throw conn2Err;

      // Update parent references:
      const { error: parentErr } = await supabase
        .from("profile")
        .update({ parent: p_user_id })
        .eq("parent", selectedProfile.id);
      if (parentErr) throw parentErr;

      // Update ancestor references:
      const { error: ancestorErr } = await supabase
        .from("profile")
        .update({ ancestor: p_user_id })
        .eq("ancestor", selectedProfile.id);
      if (ancestorErr) throw ancestorErr;

      // Update profilestate table:
      const { error: stateErr } = await supabase
        .from("profilestate")
        .update({ profile_id: p_user_id })
        .eq("profile_id", selectedProfile.id);
      if (stateErr) throw stateErr;

      // Update guestbook_post table (profile_id and author_id):
      try {
        await supabase
          .from("guestbook_post")
          .update({ profile_id: p_user_id })
          .eq("profile_id", selectedProfile.id);
        
        await supabase
          .from("guestbook_post")
          .update({ author_id: p_user_id })
          .eq("author_id", selectedProfile.id);
      } catch (tributeErr) {
        console.warn("Guestbook claims update bypassed.", tributeErr);
      }

      // 3. Delete the old seeded duplicate profile row
      const { error: deleteErr } = await supabase
        .from("profile")
        .delete()
        .eq("id", selectedProfile.id);
      if (deleteErr) throw deleteErr;

      // 4. Fetch the fully updated profile object and refresh session
      const { data: updatedProfileData, error: profileFetchErr } = await supabase
        .from("profile")
        .select("*")
        .eq("id", p_user_id)
        .single();
      
      if (!profileFetchErr && updatedProfileData) {
        setProfile(updatedProfileData);
      }

      message.success({
        content: "Welcome to the family tree! Your profile has been claimed.",
        icon: <CheckCircleFilled style={{ color: "#52c41a" }} />,
        duration: 4,
      });
      navigate(`/profile/${p_user_id}`);
    } catch (err) {
      console.error("Error claiming profile:", err);
      message.error({
        content: `Failed to claim profile: ${err.message || err}`,
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate(`/profileform/self/${session?.user?.id}`);
  };

  const getStepIndex = () => {
    switch (flow) {
      case "choice": return 0;
      case "search": return 1;
      case "confirm": return 2;
      default: return 0;
    }
  };

  const renderStepDots = () => (
    <div className="onboarding-step-dots">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`onboarding-step-dot ${i === getStepIndex() ? "active" : ""}`} />
      ))}
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin size="large" />
          <p style={{ marginTop: "16px", color: "#EABEA9", fontWeight: "bold" }}>Merging profile details...</p>
        </div>
      );
    }

    switch (flow) {
      case "choice":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "24px" }}>
            <Button 
              className="onboarding-choice-btn"
              onClick={handleCreateNew}
              style={{
                height: "auto",
                width: "100%",
                padding: "24px 20px",
                background: "#6c254c",
                borderColor: "#EABEA9",
                color: "#f3e7b1",
                borderRadius: "16px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "10px",
                whiteSpace: "normal"
              }}
            >
              <UserAddOutlined style={{ fontSize: "1.5rem", color: "#F7DC92" }} />
              <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Create a new profile card</span>
              <span style={{ fontSize: "0.85rem", opacity: 0.8, color: "#EABEA9", textAlign: "left" }}>Start fresh and set up your details and connections from scratch.</span>
            </Button>

            <Button 
              className="onboarding-choice-btn"
              onClick={() => setFlow("search")}
              style={{
                height: "auto",
                width: "100%",
                padding: "24px 20px",
                background: "#6c254c",
                borderColor: "#EABEA9",
                color: "#f3e7b1",
                borderRadius: "16px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "10px",
                whiteSpace: "normal"
              }}
            >
              <SafetyOutlined style={{ fontSize: "1.5rem", color: "#F7DC92" }} />
              <span style={{ fontSize: "1.2rem", fontWeight: "bold" }}>I think I'm already in the tree</span>
              <span style={{ fontSize: "0.85rem", opacity: 0.8, color: "#EABEA9", textAlign: "left" }}>Search the family gallery to claim a card someone else created for you.</span>
            </Button>
          </div>
        );

      case "search":
        return (
          <div style={{ marginTop: "24px" }}>
            <Text style={{ color: "#EABEA9", display: "block", marginBottom: "8px", fontWeight: "bold" }}>
              <TeamOutlined style={{ marginRight: "6px" }} />
              Search family gallery
            </Text>
            <AutoComplete
              dropdownMatchSelectWidth={true}
              style={{ width: "100%" }}
              options={options}
              onSelect={onSelectProfile}
              onSearch={handleSearch}
              popupClassName="onboarding-search-dropdown"
              notFoundContent={
                searchText.length >= 2 && !searching ? (
                  <div className="onboarding-empty-state">
                    <div className="onboarding-empty-state-icon"><SearchOutlined /></div>
                    <div>No matches found</div>
                    <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>Try a different name or spelling</div>
                  </div>
                ) : null
              }
            >
              <div className="onboarding-input-wrapper" style={{ position: "relative" }}>
                 <input 
                  className="onboarding-input" 
                  style={{ 
                    width: "100%", 
                    padding: "14px 44px 14px 16px", 
                    background: "#6c254c", 
                    border: "1px solid #EABEA9", 
                    color: "#fff", 
                    borderRadius: "12px",
                    outline: "none",
                    boxSizing: "border-box",
                    fontSize: "1rem"
                  }}
                  placeholder="Start typing your name..." 
                  value={searchText} 
                  onChange={(e) => handleSearch(e.target.value)} 
                  autoFocus
                />
                {searching ? (
                  <Spin size="small" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} />
                ) : (
                  <SearchOutlined style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#EABEA9", fontSize: "1.2rem" }} />
                )}
              </div>
            </AutoComplete>
            {options.length > 0 && (
              <div className="onboarding-search-hint">{options.length} result{options.length !== 1 ? "s" : ""} found</div>
            )}

            <Button 
              type="link" 
              onClick={() => { setFlow("choice"); setSearchText(""); setOptions([]); }}
              style={{ color: "#F7DC92", marginTop: "20px", padding: 0 }}
            >
              &larr; Back to choices
            </Button>
          </div>
        );

      case "confirm":
      const formattedSunrise = selectedProfile?.sunrise ? format(new Date(selectedProfile.sunrise), "MMMM d, yyyy") : "Unknown";
        return (
          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <Text style={{ color: "#EABEA9", display: "block", marginBottom: "16px", fontSize: "1.1rem" }}>
              Is this your profile card?
            </Text>
            
            <div className="onboarding-preview-card" style={{ background: "rgba(255,255,255,0.04)", padding: "28px", borderRadius: "16px", border: "1px solid rgba(234,190,169,0.15)", marginBottom: "24px" }}>
              <Avatar 
                size={90}
                src={getAvatarSrc(selectedProfile)}
                icon={!getAvatarSrc(selectedProfile) && <UserOutlined />}
                style={{ border: "3px solid #f3e7b1", background: "#5b1f40" }}
              />
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "14px", color: "#f3e7b1" }}>
                {selectedProfile?.firstname} {selectedProfile?.nickname && `"${selectedProfile.nickname}"`} {selectedProfile?.lastname}
              </div>
              {selectedProfile?.branch && (
                <div className="onboarding-branch-badge">
                  Branch {selectedProfile.branch}
                </div>
              )}
              <div style={{ fontSize: "0.9rem", color: "#EABEA9", marginTop: "10px" }}>
                Born: {formattedSunrise}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Button 
                onClick={() => { setFlow("search"); setSelectedProfile(null); }}
                style={{ background: "transparent", borderColor: "#EABEA9", color: "#F7DC92", fontWeight: "bold", borderRadius: "10px" }}
              >
                Change Search
              </Button>
              <Button 
                type="primary"
                onClick={handleClaimProfile}
                style={{ backgroundColor: "#F7DC92", color: "#873D62", border: "none", fontWeight: "bold", borderRadius: "10px" }}
              >
                Yes, claim this profile
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="onboarding-page-shell" style={{ 
      height: "100%", 
      width: "100%", 
      background: "linear-gradient(135deg, #873d62 0%, #b98797 100%)", 
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      boxSizing: "border-box",
      overflowY: "auto"
    }}>
      <div style={{ width: "100%", maxWidth: "440px", padding: "0 20px" }}>
        <Card
          className="onboarding-bezel-card"
          style={{
            background: "#4e1237",
            border: "none",
            borderRadius: "24px",
            padding: "8px",
            position: "relative",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)"
          }}
        >
          {/* Close Header Button (Placed top-left to avoid top-right cutout notch) */}
          <button className="close-onboarding-btn" onClick={handleClose} style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            background: "transparent",
            border: "none",
            color: "#EABEA9",
            fontSize: "1.25rem",
            cursor: "pointer",
            zIndex: 10
          }}>
            <CloseOutlined />
          </button>

          <div style={{ padding: "16px 8px" }}>
            {renderStepDots()}

            <Title level={2} style={{ color: "#f3e7b1", fontWeight: "bold", fontSize: "1.6rem", margin: "0 0 8px 0" }}>
              Welcome to the Family Portal!
            </Title>
            <Text style={{ color: "#EABEA9", fontSize: "1rem" }}>
              Let's find your place in the tree.
            </Text>

            {renderContent()}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
