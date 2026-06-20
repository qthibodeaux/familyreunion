import React, { useState } from "react";
import { CloseOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, message } from "antd";
import { supabase } from "../supabaseClient";
import { updateFamilyBranch, updateAncestorReference } from "../utils/familyTree";
import { getAvatarSrc } from "../utils/avatarHelper";
import { useNavigate } from "react-router-dom";
import "./InPlaceForm.css";

const STEPS = {
  SEARCH: "search",
  DETAILS: "details",
  CONFIRM: "confirm",
};

const CONNECTION_CONFIG = {
  smithparent: {
    title: "Who is your Smith family parent?",
    label: "Parent",
    showSearch: true,
  },
  parent: {
    title: "Who is your parent?",
    label: "Parent",
    showSearch: true,
  },
  spouse: {
    title: "Who is your spouse/partner?",
    label: "Spouse",
    showSearch: true,
  },
  child: {
    title: "Who is your child?",
    label: "Child",
    showSearch: true,
  },
  self: {
    title: "Verify your identity",
    label: "Self",
    showSearch: true,
  },
};

const RESULTS_PER_PAGE = 3;

const InPlaceForm = ({ mode, anchor, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [method, setMethod] = useState(null); // 'find' | 'create' | null
  const [step, setStep] = useState(STEPS.SEARCH);
  const [searchText, setSearchText] = useState("");
  const [allResults, setAllResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const config = CONNECTION_CONFIG[mode] || CONNECTION_CONFIG.parent;

  const handleSearch = async (value) => {
    setSearchText(value);
    setCurrentPage(0);
    
    if (!value || value.length < 2) {
      setAllResults([]);
      return;
    }

    let query = supabase
      .from("profile")
      .select("id, firstname, nickname, lastname, avatar_url, branch, email, phone, sunset")
      .or(`firstname.ilike.%${value}%,nickname.ilike.%${value}%,lastname.ilike.%${value}%`);

    // Exclude first branch (branch 1) and root branch for child/spouse searches, but allow NULL branches for all
    if (mode === 'child' || mode === 'spouse') {
      query = query.or("branch.gt.1,branch.is.null");
    } else {
      query = query.or("branch.neq.0,branch.is.null");
    }

    const { data, error } = await query
      .order("firstname", { ascending: true })
      .limit(20);

    if (!error && data) {
      setAllResults(data);
    }
  };

  const getPaginatedResults = () => {
    const start = currentPage * RESULTS_PER_PAGE;
    return allResults.slice(start, start + RESULTS_PER_PAGE);
  };

  const getTotalPages = () => {
    return Math.ceil(allResults.length / RESULTS_PER_PAGE);
  };

  const onSelectProfile = (profile) => {
    setSelectedProfile(profile);
    setStep(STEPS.CONFIRM);
  };

  const handleCreateClick = () => {
    navigate(`/profileform/${mode}/${anchor.id}`);
  };

  const handleFinalSubmit = async () => {
    if (!selectedProfile) return;

    setLoading(true);
    try {
      const targetProfileId = selectedProfile.id;
      const targetProfile = selectedProfile;

      // Check if a connection already exists in connections table
      const { data: existingConnections, error: checkError } = await supabase
        .from("connection")
        .select("*")
        .or(
          `and(profile_1.eq.${anchor.id},profile_2.eq.${targetProfileId}),and(profile_1.eq.${targetProfileId},profile_2.eq.${anchor.id})`
        );

      if (checkError) throw checkError;

      // Insert connection rows if they don't exist
      if (existingConnections.length === 0) {
        let connectionData = [];
        
        // Determine status: Auto-connect if target is deceased or Branch 1 or not claimed
        const isClaimed = targetProfile.email || targetProfile.phone;
        const isDeceased = targetProfile.sunset;
        const isBranch1 = targetProfile.branch === 1;
        const autoConnect = !isClaimed || isDeceased || isBranch1;
        const connStatus = autoConnect ? "active" : "pending";
        const requestedBy = autoConnect ? null : anchor.id;

        if (mode === "child") {
          connectionData = [
            { profile_1: anchor.id, profile_2: targetProfileId, connection_type: "child", status: connStatus, requested_by: requestedBy },
            { profile_1: targetProfileId, profile_2: anchor.id, connection_type: "parent", status: connStatus, requested_by: requestedBy }
          ];
        } else if (mode === "parent" || mode === "smithparent") {
          connectionData = [
            { profile_1: targetProfileId, profile_2: anchor.id, connection_type: "child", status: connStatus, requested_by: requestedBy },
            { profile_1: anchor.id, profile_2: targetProfileId, connection_type: "parent", status: connStatus, requested_by: requestedBy }
          ];
        } else if (mode === "spouse") {
          connectionData = [
            { profile_1: anchor.id, profile_2: targetProfileId, connection_type: "spouse", status: connStatus, requested_by: requestedBy },
            { profile_1: targetProfileId, profile_2: anchor.id, connection_type: "spouse", status: connStatus, requested_by: requestedBy }
          ];
        }

        if (connectionData.length > 0) {
          const { error: connError } = await supabase
            .from("connection")
            .insert(connectionData);
          if (connError) throw connError;
        }

        if (connStatus === "pending") {
          const { error: notifError } = await supabase
            .from("notification")
            .insert({
              recipient_id: targetProfileId,
              actor_id: anchor.id,
              action_type: "connection_request",
              target_id: targetProfileId
            });
          if (notifError) {
            console.error("Failed to create connection notification:", notifError);
          }
          message.info("Connection request sent! Waiting for approval.");
        }
      }

      // Lineage calculations for parents / smithparents
      if (mode === "parent" || mode === "smithparent") {
        let parentBranch = targetProfile.branch;
        let parentAncestor = targetProfile.ancestor;

        const { data: dbParent, error: fetchParentErr } = await supabase
          .from("profile")
          .select("branch, ancestor")
          .eq("id", targetProfileId)
          .single();
        
        if (!fetchParentErr && dbParent) {
          parentBranch = dbParent.branch;
          parentAncestor = dbParent.ancestor;
        }

        let newBranch = null;
        if (parentBranch !== null && parentBranch !== undefined) {
          newBranch = parentBranch + 1;
        }

        const computedAncestor = parentAncestor || targetProfileId;
        const { error: updateAnchorError } = await supabase
          .from("profile")
          .update({
            parent: targetProfileId,
            branch: newBranch,
            ancestor: computedAncestor
          })
          .eq("id", anchor.id);

        if (updateAnchorError) throw updateAnchorError;

        if (parentAncestor === null || parentAncestor === undefined) {
          await updateFamilyBranch(anchor.id, newBranch);
        }
        await updateAncestorReference(anchor.id, computedAncestor);
      }

      if (mode === "child") {
        let childBranch = anchor.branch !== null && anchor.branch !== undefined ? anchor.branch + 1 : null;
        let childAncestor = anchor.ancestor || anchor.id;

        const { error: updateChildError } = await supabase
          .from("profile")
          .update({
            parent: anchor.id,
            branch: childBranch,
            ancestor: childAncestor
          })
          .eq("id", targetProfileId);

        if (updateChildError) throw updateChildError;

        await updateFamilyBranch(targetProfileId, childBranch);
        await updateAncestorReference(targetProfileId, childAncestor);
      }

      message.success("Connected successfully!");
      onSuccess && onSuccess(targetProfile);
      onClose();
    } catch (err) {
      console.error("Connection error:", err);
      message.error(`Failed to connect: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const paginatedResults = getPaginatedResults();
  const totalPages = getTotalPages();

  return (
    <div className="in-place-form-section">
      <div className="in-place-form-card">
        {/* Top Row - Close Button */}
        <div className="form-header-row">
          <button className="close-form-btn" onClick={onClose}>
            <CloseOutlined />
          </button>
        </div>

        {/* Mode Toggle Buttons Row */}
        <div className="mode-choice-header">
          <button
            className={`mode-toggle-btn ${method === 'find' ? 'active' : ''}`}
            onClick={() => {
              setMethod('find');
              setSearchText('');
              setAllResults([]);
              setCurrentPage(0);
            }}
          >
            Find Existing
          </button>
          <button
            className="mode-toggle-btn"
            onClick={handleCreateClick}
          >
            Create New
          </button>
        </div>

        {/* Context Header */}
        {method === 'find' && (
          <div className="form-context-header" style={{ padding: '20px 20px 0' }}>
            <div className="anchor-node">
              <div className="anchor-avatar">
                {getAvatarSrc(anchor) ? (
                  <img src={getAvatarSrc(anchor)} alt={anchor.firstname} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '1.2rem', fontWeight: 'bold' }}>
                    {anchor?.firstname?.[0] || 'G'}
                  </div>
                )}
              </div>
              <span className="anchor-name">{anchor?.firstname || "Guest"}</span>
            </div>
            <div className="connection-line" />
            <h2 className="form-question-title">{config.title}</h2>
          </div>
        )}

        {/* Form Body */}
        <div className="form-content-wrapper">
          {method === 'find' && step === STEPS.SEARCH && (
            <>
              <div className="form-input-group">
                <label className="form-input-label">Search family gallery</label>
                <div className="form-input-wrapper" style={{ position: 'relative' }}>
                  <input 
                    className="form-input" 
                    style={{ width: '100%', paddingRight: '40px' }}
                    placeholder="Start typing a name..." 
                    value={searchText} 
                    onChange={(e) => handleSearch(e.target.value)} 
                  />
                  <SearchOutlined style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                </div>
              </div>

              {searchText.length < 2 && allResults.length === 0 ? (
                <div className="search-not-found" style={{ minHeight: '200px' }}>
                  <div className="search-not-found-text">Start typing a name to search...</div>
                </div>
              ) : allResults.length === 0 ? (
                <div className="search-not-found" style={{ minHeight: '200px' }}>
                  <div className="search-not-found-text">No results found for "{searchText}"</div>
                  <button
                    type="button"
                    className="search-not-found-link"
                    onClick={handleCreateClick}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    Create a new profile instead
                  </button>
                </div>
              ) : (
                <>
                  <div className="search-results-container">
                    {paginatedResults.map((profile) => (
                      <div
                        key={profile.id}
                        className="search-result-card"
                        onClick={() => onSelectProfile(profile)}
                      >
                        <div className="search-result-avatar">
                          {getAvatarSrc(profile) ? (
                            <img src={getAvatarSrc(profile)} alt={profile.firstname} />
                          ) : (
                            profile.firstname?.[0] || '?'
                          )}
                        </div>
                        <div className="search-result-info">
                          <div className="search-result-name">
                            {profile.firstname} {profile.nickname && `"${profile.nickname}"`} {profile.lastname}
                          </div>
                          <div className="search-result-meta">
                            Branch {profile.branch !== null && profile.branch !== undefined ? profile.branch : '—'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="search-pagination">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`pagination-dot ${currentPage === idx ? 'active' : ''}`}
                          onClick={() => setCurrentPage(idx)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {method === 'find' && step === STEPS.CONFIRM && (
            <div className="confirmation-stage" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <div className="selected-profile-preview" style={{ marginBottom: 20 }}>
                <Avatar 
                  shape="square"
                  size={80}
                  src={getAvatarSrc(selectedProfile)}
                  icon={!getAvatarSrc(selectedProfile) && <UserOutlined />}
                  style={{ borderRadius: '16px', border: '3px solid #f3e7b1', background: '#5b1f40' }}
                >
                  {selectedProfile?.firstname?.[0]}
                </Avatar>
                <div className="selected-name" style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 10, color: '#f3e7b1' }}>
                  {selectedProfile?.firstname} {selectedProfile?.lastname}
                </div>
                <div className="selected-meta" style={{ opacity: 0.7, fontSize: '0.8rem', color: '#eabea9' }}>
                  Branch {selectedProfile?.branch !== null && selectedProfile?.branch !== undefined ? selectedProfile.branch : '—'}
                </div>
              </div>
              
              <div className="form-footer">
                <button className="form-btn form-btn-prev" onClick={() => setStep(STEPS.SEARCH)}>
                  Change
                </button>
                <button className="form-btn form-btn-next" onClick={handleFinalSubmit} disabled={loading}>
                  {loading ? "Saving..." : "Confirm & Connect"}
                </button>
              </div>
            </div>
          )}

          {method === null && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#eabea9' }}>
              <p>Select an option above to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InPlaceForm;
