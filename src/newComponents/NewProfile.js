import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { Avatar, Input, Button, Space, Checkbox, message } from "antd";
import {
  SettingOutlined,
  UserOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  PlusOutlined,
  SendOutlined,
  CameraOutlined,
  DeleteOutlined,
  HeartOutlined,
  HeartFilled,
  SafetyOutlined,
  FlagOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { supabase } from "../supabaseClient";
import AuthConsumer from "../useSession";
import { format, formatDistanceToNow } from "date-fns";
import "./NewProfile.css";
import MilestonesLiveTile from "./MilestonesLiveTile";
import MediaLiveTile from "./MediaLiveTile";
import GuestbookComposer from "./GuestbookComposer";
import GuestbookPostCard from "./GuestbookPostCard";
import GuestbookLiveTile from "./GuestbookLiveTile";

import { getAvatarSrc } from "../utils/avatarHelper";

const getProfileLink = (profile) => {
  if (!profile) return "#";
  if (Number(profile.branch) === 1) {
    return `/branch/${profile.id}`;
  }
  return `/profile/${profile.id}`;
};

function LiveTile({ connections, data, activeDrawer }) {
  const [faces, setFaces] = useState([]);
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [nextFaceIndex, setNextFaceIndex] = useState(null);
  const [transition, setTransition] = useState(null);
  const [animating, setAnimating] = useState(false);

  const allConnections = useMemo(() => {
    const list = [...connections];
    if (data.parent_profile && !connections.some(c => c.profile_2.id === data.parent_profile.id)) {
      list.push({
        connection_type: "parent",
        profile_2: data.parent_profile
      });
    }
    return list;
  }, [connections, data.parent_profile]);

  const getRelationshipLabel = useCallback((conn) => {
    const isLineage = data.parent_profile && conn.profile_2.id === data.parent_profile.id;
    const baseType = conn.connection_type;
    let label = baseType === 'parent' ? 'Parent' : baseType === 'spouse' ? 'Spouse' : 'Child';
    if (isLineage) label += ' (Lineage)';
    return label;
  }, [data.parent_profile]);

  // Face generators
  const renderStatsFace = useCallback(() => {
    const total = allConnections.length;
    const parentCount = allConnections.filter(c => c.connection_type === 'parent').length;
    const spouseCount = allConnections.filter(c => c.connection_type === 'spouse').length;
    const childCount = allConnections.filter(c => c.connection_type === 'child').length;

    const breakDown = [];
    if (parentCount > 0) breakDown.push(`${parentCount} ${parentCount === 1 ? 'Parent' : 'Parents'}`);
    if (spouseCount > 0) breakDown.push(`${spouseCount} ${spouseCount === 1 ? 'Spouse' : 'Spouses'}`);
    if (childCount > 0) breakDown.push(`${childCount} ${childCount === 1 ? 'Child' : 'Children'}`);

    return (
      <div className="tile-stats-face">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="drawer-title" style={{ color: '#EABEA9', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.09rem' }}>Immediate Family</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f3e7b1', marginTop: '0.25rem' }}>
            {total} {total === 1 ? 'Relative' : 'Relatives'}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#EABEA9', opacity: 0.8, marginTop: '0.125rem' }}>
            {breakDown.join(' · ') || 'No connections linked'}
          </span>
        </div>
        <UserOutlined style={{ fontSize: '2rem', color: '#EABEA9', opacity: 0.3 }} />
      </div>
    );
  }, [allConnections]);

  const renderMosaicFace = useCallback(() => {
    return (
      <div className="tile-mosaic-face">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="drawer-title" style={{ color: '#EABEA9', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.09rem' }}>Immediate Family</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f3e7b1', marginTop: '0.25rem' }}>
            Circle of Relations
          </span>
        </div>
        <div className="tile-mosaic-avatars">
          {allConnections.slice(0, 4).map((c, i) => {
            const avatarSrc = getAvatarSrc(c.profile_2);
            return (
              <Avatar
                key={c.profile_2.id || i}
                shape="square"
                size={44}
                src={avatarSrc}
                icon={!avatarSrc && <UserOutlined />}
                style={{
                  borderRadius: '0.375rem',
                  border: '0.0625rem solid rgba(243, 231, 177, 0.3)',
                  boxShadow: '0 0.125rem 0.375rem rgba(0,0,0,0.15)'
                }}
              />
            );
          })}
          {allConnections.length > 4 && (
            <div style={{
              width: '2.75rem',
              height: '2.75rem',
              borderRadius: '0.375rem',
              background: 'rgba(255,255,255,0.08)',
              border: '0.0625rem solid rgba(243, 231, 177, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              color: '#F7DC92'
            }}>
              +{allConnections.length - 4}
            </div>
          )}
        </div>
      </div>
    );
  }, [allConnections]);

  const renderLineageFace = useCallback((nodes) => {
    return (
      <div className="tile-lineage-face">
        <span className="tile-lineage-title">Lineage Path</span>
        <div className="tile-lineage-path">
          {nodes.map((node, index) => {
            const avatarSrc = getAvatarSrc(node);
            return (
              <span key={node.id || index} className="tile-lineage-node">
                <Avatar
                  shape="square"
                  size={40}
                  src={avatarSrc}
                  icon={!avatarSrc && <UserOutlined />}
                  className="tile-lineage-avatar"
                />
                <span className={`tile-lineage-name ${index === nodes.length - 1 ? 'active' : ''}`}>
                  {node.firstname}
                </span>
                {index < nodes.length - 1 && <span className="tile-lineage-arrow">➔</span>}
              </span>
            );
          })}
        </div>
      </div>
    );
  }, []);

  const renderSplitPortraitFace = useCallback((conn) => {
    const avatarSrc = getAvatarSrc(conn.profile_2);
    const label = getRelationshipLabel(conn);
    return (
      <div className="tile-split-portrait">
        {avatarSrc ? (
          <img src={avatarSrc} className="tile-split-image" alt={conn.profile_2.firstname} />
        ) : (
          <div className="tile-split-placeholder">
            <UserOutlined style={{ fontSize: '1.5rem' }} />
          </div>
        )}
        <div className="tile-split-info">
          <span className="tile-split-name">{conn.profile_2.firstname} {conn.profile_2.lastname}</span>
          <span className="tile-split-relationship">{label}</span>
        </div>
      </div>
    );
  }, [getRelationshipLabel]);

  const renderNameplateSpotlightFace = useCallback((conn) => {
    const avatarSrc = getAvatarSrc(conn.profile_2);
    const label = getRelationshipLabel(conn);
    return (
      <div className="tile-nameplate-spotlight">
        {avatarSrc ? (
          <img src={avatarSrc} className="tile-nameplate-image" alt={conn.profile_2.firstname} />
        ) : (
          <div className="tile-split-placeholder" style={{ width: '100%' }}>
            <UserOutlined style={{ fontSize: '2rem' }} />
          </div>
        )}
        <div className="tile-nameplate-plate">
          <span className="tile-nameplate-name">{conn.profile_2.firstname} {conn.profile_2.lastname}</span>
          <span className="tile-nameplate-relationship">{label}</span>
        </div>
      </div>
    );
  }, [getRelationshipLabel]);

  const renderEmptyFace = useCallback(() => {
    return (
      <div className="tile-stats-face">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="drawer-title" style={{ color: '#EABEA9', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.09rem' }}>Immediate Family</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f3e7b1', marginTop: '0.25rem' }}>
            Immediate Family
          </span>
          <span style={{ fontSize: '0.8rem', color: '#EABEA9', opacity: 0.8, marginTop: '0.125rem' }}>
            No connections linked yet. Tap to connect.
          </span>
        </div>
      </div>
    );
  }, []);

  // Compile faces
  useEffect(() => {
    const pool = [];

    // 1. Stats Face
    pool.push({
      type: "stats",
      render: () => renderStatsFace()
    });

    // 2. Mosaic Face (if >= 2 connections)
    if (allConnections.length >= 2) {
      pool.push({
        type: "mosaic",
        render: () => renderMosaicFace()
      });
    }

    // 3. Lineage Path Face (if parent or ancestor exists)
    const pathNodes = [];
    if (data.ancestor_profile) {
      pathNodes.push(data.ancestor_profile);
    }
    if (data.parent_profile && (!data.ancestor_profile || data.parent_profile.id !== data.ancestor_profile.id)) {
      pathNodes.push(data.parent_profile);
    }
    pathNodes.push(data);
    if (pathNodes.length >= 2) {
      pool.push({
        type: "lineage",
        render: () => renderLineageFace(pathNodes)
      });
    }

    // 4. Split Portrait and Nameplate Spotlight (for each connection)
    allConnections.forEach((conn) => {
      // Split Portrait
      pool.push({
        type: "split-portrait",
        noPadding: true,
        render: () => renderSplitPortraitFace(conn)
      });

      // Nameplate Spotlight
      pool.push({
        type: "nameplate-spotlight",
        noPadding: true,
        render: () => renderNameplateSpotlightFace(conn)
      });
    });

    // Fallback if empty
    if (pool.length === 0) {
      pool.push({
        type: "empty",
        render: () => renderEmptyFace()
      });
    }

    setFaces(pool);
    setCurrentFaceIndex(0);
    setNextFaceIndex(null);
    setTransition(null);
    setAnimating(false);
  }, [allConnections, data, renderEmptyFace, renderLineageFace, renderMosaicFace, renderNameplateSpotlightFace, renderSplitPortraitFace, renderStatsFace]);

  // Scheduler logic
  useEffect(() => {
    if (activeDrawer !== null || faces.length <= 1) return;

    let timer;
    const tick = () => {
      const nextIndex = (currentFaceIndex + 1) % faces.length;

      const animations = ["fade", "slideUp", "slideLeft", "flipX", "flipY", "peek"];
      const randAnim = animations[Math.floor(Math.random() * animations.length)];

      setNextFaceIndex(nextIndex);
      setTransition(randAnim);
      setAnimating(true);

      const animDuration = randAnim === "peek" ? 1200 : 800;

      setTimeout(() => {
        setCurrentFaceIndex(nextIndex);
        setNextFaceIndex(null);
        setTransition(null);
        setAnimating(false);

        const nextDelay = Math.random() * 4500 + 3000; // 3 to 7.5 seconds
        timer = setTimeout(tick, nextDelay);
      }, animDuration);
    };

    const startupDelay = Math.random() * 2500 + 1500; // Stagger startup delay
    timer = setTimeout(tick, startupDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [faces, activeDrawer, currentFaceIndex]);

  if (faces.length === 0) return null;

  const currentFace = faces[currentFaceIndex];
  const nextFace = nextFaceIndex !== null ? faces[nextFaceIndex] : null;

  return (
    <div className="live-tile-container">
      <div className={`tile-face active ${currentFace.noPadding ? "no-padding" : ""} ${animating ? `${transition}-out` : ""}`}>
        {currentFace.render()}
      </div>
      {nextFace && (
        <div className={`tile-face incoming ${nextFace.noPadding ? "no-padding" : ""} ${animating ? `${transition}-in` : ""}`}>
          {nextFace.render()}
        </div>
      )}
    </div>
  );
}

function NewProfile() {
  const { session, profile } = AuthConsumer();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [tributesLoading, setTributesLoading] = useState(true);
  const [mediaLoading2, setMediaLoading2] = useState(true);
  // Milestones State
  const [milestones, setMilestones] = useState([]);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const [showAddMilestoneForm, setShowAddMilestoneForm] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneCategory, setNewMilestoneCategory] = useState("other");
  const [newMilestoneSubcategory, setNewMilestoneSubcategory] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");
  const [newMilestoneLocation, setNewMilestoneLocation] = useState("");
  const [newMilestoneNotes, setNewMilestoneNotes] = useState("");
  const [newMilestonePhoto, setNewMilestonePhoto] = useState(null);
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [newMilestoneBroadcast, setNewMilestoneBroadcast] = useState(true);

  // Drawer slide states: null | 'milestones' | 'connections' | 'guestbook'
  const [activeDrawer, setActiveDrawer] = useState(null);

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const drawerParam = params.get("drawer");
    if (drawerParam) {
      setActiveDrawer(drawerParam);
    }
  }, [location]);

  // Profile data / guestbook / connection states
  const [connections, setConnections] = useState([]);
  const [tributes, setTributes] = useState([]); // Stores guestbook posts
  const [likedGuestbookPostIds, setLikedGuestbookPostIds] = useState([]);
  const [likedMilestoneIds, setLikedMilestoneIds] = useState([]);
  const [error, setError] = useState(null);

  // Safety & Relationship States
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showSafetyOverlay, setShowSafetyOverlay] = useState(false);
  const [relationship, setRelationship] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);

  // Media Gallery State
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [activeDecadeFilter, setActiveDecadeFilter] = useState("All");
  const [showUploadMediaForm, setShowUploadMediaForm] = useState(false);
  const [newMediaCaption, setNewMediaCaption] = useState("");
  const [newMediaDecade, setNewMediaDecade] = useState("Today");
  const [newMediaFile, setNewMediaFile] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [newMediaBroadcast, setNewMediaBroadcast] = useState(true);
  const [likedMediaIds, setLikedMediaIds] = useState([]);
  const [activePhotoDetail, setActivePhotoDetail] = useState(null);
  const [mediaComments, setMediaComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const { userId: urlUserId } = useParams();
  const userId = urlUserId || session?.user?.id;

  const navigate = useNavigate();

  const goToAvatar = () => navigate(`/antavatar/${userId}`);
  const goToEdit = () => navigate(`/profileedit/${userId}`);

  // Toggle drawer slide up
  const toggleDrawer = (drawerName) => {
    setActiveDrawer(activeDrawer === drawerName ? null : drawerName);
  };

  const fetchMilestones = useCallback(async () => {
    setMilestonesLoading(true);
    try {
      const { data: mData, error: mErr } = await supabase
        .from("milestone")
        .select("*")
        .eq("profile_id", userId)
        .order("event_date", { ascending: true });

      if (!mErr && mData) {
        setMilestones(mData);
      } else {
        setMilestones([]);
      }
    } catch (err) {
      console.warn("Milestones fetch failed:", err);
      setMilestones([]);
    } finally {
      setMilestonesLoading(false);
    }
  }, [userId]);

  const getMilestoneImageSrc = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("http")) return photoUrl;
    const { data } = supabase.storage.from("milestones").getPublicUrl(photoUrl);
    return data.publicUrl;
  };

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) {
      message.error("Milestone title is required");
      return;
    }
    setSavingMilestone(true);
    try {
      const milestoneId = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);
      let photoUrl = null;

      if (newMilestonePhoto) {
        const fileExt = newMilestonePhoto.name.split(".").pop();
        const filePath = `${userId}/${milestoneId}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("milestones")
          .upload(filePath, newMilestonePhoto);

        if (uploadError) throw uploadError;
        photoUrl = filePath;
      }

      const { error: insertError } = await supabase.from("milestone").insert([
        {
          id: milestoneId,
          profile_id: userId,
          category: newMilestoneCategory,
          subcategory: newMilestoneSubcategory || null,
          title: newMilestoneTitle,
          event_date: newMilestoneDate || null,
          location_text: newMilestoneLocation || null,
          photo_url: photoUrl,
          notes: newMilestoneNotes || null,
          is_broadcast: newMilestoneBroadcast,
        },
      ]);

      if (insertError) throw insertError;

      message.success("Milestone added successfully!");
      setNewMilestoneTitle("");
      setNewMilestoneCategory("other");
      setNewMilestoneSubcategory("");
      setNewMilestoneDate("");
      setNewMilestoneLocation("");
      setNewMilestoneNotes("");
      setNewMilestonePhoto(null);
      setNewMilestoneBroadcast(true);
      setShowAddMilestoneForm(false);

      fetchMilestones();
    } catch (err) {
      console.error("Error adding milestone:", err);
      message.error("Failed to add milestone: " + err.message);
    } finally {
      setSavingMilestone(false);
    }
  };

  const handleDeleteMilestone = async (milestone) => {
    if (window.confirm("Are you sure you want to delete this milestone?")) {
      try {
        if (milestone.photo_url) {
          const { error: storageError } = await supabase.storage
            .from("milestones")
            .remove([milestone.photo_url]);
          if (storageError) {
            console.warn("Could not delete photo from storage:", storageError.message);
          }
        }

        const { error } = await supabase
          .from("milestone")
          .delete()
          .eq("id", milestone.id);

        if (error) throw error;
        message.success("Milestone deleted successfully!");
        fetchMilestones();
      } catch (err) {
        console.error("Error deleting milestone:", err);
        message.error("Failed to delete milestone");
      }
    }
  };

  const handleRemoveConnection = async (targetId) => {
    if (window.confirm("Are you sure you want to remove this connection?")) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from("connection")
          .delete()
          .or(
            `and(profile_1.eq.${userId},profile_2.eq.${targetId}),and(profile_1.eq.${targetId},profile_2.eq.${userId})`
          );

        if (error) throw error;
        message.success("Connection removed successfully!");
        window.location.reload();
      } catch (err) {
        console.error("Error removing connection:", err);
        message.error("Failed to remove connection");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoveSmithsideParent = async () => {
    if (
      window.confirm(
        "Are you sure you want to remove your Smithside parent? This will reset your lineage branch calculation and your descendants' branches."
      )
    ) {
      setLoading(true);
      try {
        const updateDescendantBranches = async (parentId) => {
          const { data: descendants, error } = await supabase
            .from("profile")
            .select("id")
            .eq("parent", parentId);

          if (error) throw error;

          for (const descendant of descendants) {
            await supabase
              .from("profile")
              .update({ branch: null, ancestor: null })
              .eq("id", descendant.id);

            await updateDescendantBranches(descendant.id);
          }
        };

        const { error: updateError } = await supabase
          .from("profile")
          .update({
            parent: null,
            branch: null,
            ancestor: null,
          })
          .eq("id", userId);

        if (updateError) throw updateError;
        await updateDescendantBranches(userId);

        if (data.parent_profile) {
          // Also delete bilateral parent/child connection rows in connections table
          await supabase
            .from("connection")
            .delete()
            .or(
              `and(profile_1.eq.${userId},profile_2.eq.${data.parent_profile.id}),and(profile_1.eq.${data.parent_profile.id},profile_2.eq.${userId})`
            );
        }

        message.success("Smithside parent removed successfully");
        window.location.reload();
      } catch (err) {
        console.error("Error removing parent:", err);
        message.error("Failed to remove parent");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleApproveRequest = async (request) => {
    try {
      const { error: updateErr } = await supabase
        .from("connection")
        .update({ status: "active" })
        .or(`and(profile_1.eq.${request.profile_1.id},profile_2.eq.${request.profile_2.id}),and(profile_1.eq.${request.profile_2.id},profile_2.eq.${request.profile_1.id})`);

      if (updateErr) throw updateErr;

      let parentId = null;
      let childId = null;

      if (request.connection_type === "child") {
        parentId = request.profile_1.id;
        childId = request.profile_2.id;
      } else if (request.connection_type === "parent") {
        parentId = request.profile_2.id;
        childId = request.profile_1.id;
      }

      if (parentId && childId) {
        const { data: parentProfile } = await supabase
          .from("profile")
          .select("branch, ancestor")
          .eq("id", parentId)
          .single();

        const branch = (parentProfile && parentProfile.branch !== null && parentProfile.branch !== undefined) ? parentProfile.branch + 1 : 0;
        const ancestor = (parentProfile && parentProfile.ancestor) ? parentProfile.ancestor : parentId;

        const { error: profileErr } = await supabase
          .from("profile")
          .update({
            parent: parentId,
            branch: branch,
            ancestor: ancestor
          })
          .eq("id", childId)
          .is("parent", null);

        if (profileErr) console.warn("Failed to update parent profile fields:", profileErr);
      }

      message.success("Relationship approved!");
      setPendingRequests(prev => prev.filter(r => !(
        (r.profile_1.id === request.profile_1.id && r.profile_2.id === request.profile_2.id) ||
        (r.profile_1.id === request.profile_2.id && r.profile_2.id === request.profile_1.id)
      )));
      window.location.reload();
    } catch (err) {
      console.error("Error approving request:", err);
      message.error("Failed to approve request");
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      const { error: deleteErr } = await supabase
        .from("connection")
        .delete()
        .or(`and(profile_1.eq.${request.profile_1.id},profile_2.eq.${request.profile_2.id}),and(profile_1.eq.${request.profile_2.id},profile_2.eq.${request.profile_1.id})`);

      if (deleteErr) throw deleteErr;

      message.success("Relationship request declined.");
      setPendingRequests(prev => prev.filter(r => !(
        (r.profile_1.id === request.profile_1.id && r.profile_2.id === request.profile_2.id) ||
        (r.profile_1.id === request.profile_2.id && r.profile_2.id === request.profile_1.id)
      )));
    } catch (err) {
      console.error("Error declining request:", err);
      message.error("Failed to decline request");
    }
  };

  const handleToggleRelationship = async (type) => {
    if (!session) return;
    try {
      if (relationship === type) {
        const { error } = await supabase
          .from("profile_relationship")
          .delete()
          .eq("blocker_id", session.user.id)
          .eq("blocked_id", userId);
        if (error) throw error;
        setRelationship(null);
        message.success(`User has been un-${type}d`);
      } else {
        const { error } = await supabase
          .from("profile_relationship")
          .upsert({
            blocker_id: session.user.id,
            blocked_id: userId,
            relation_type: type
          }, { onConflict: "blocker_id,blocked_id" });
        if (error) throw error;
        setRelationship(type);
        message.success(`User has been ${type}d`);
        if (type === 'block') {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error("Error setting relationship:", err);
      message.error("Failed to update relationship settings");
    }
  };

  const handleReportContent = async (targetType, targetId, reason = "Reported by user") => {
    if (!session) {
      message.error("You must be signed in to report content.");
      return;
    }
    try {
      const { error } = await supabase
        .from("report")
        .insert([
          {
            reporter_id: session.user.id,
            target_type: targetType,
            target_id: targetId,
            reason: reason
          }
        ]);
      if (error) throw error;

      message.success("Content has been reported and hidden. Administrators have been notified.");

      if (targetType === "guestbook_post") {
        setTributes(prev => prev.filter(p => p.id !== targetId));
      } else if (targetType === "media") {
        setMediaItems(prev => prev.filter(m => m.id !== targetId));
        if (activePhotoDetail?.id === targetId) {
          setActivePhotoDetail(null);
        }
      } else if (targetType === "media_comment") {
        setMediaComments(prev => prev.filter(c => c.id !== targetId));
      } else if (targetType === "milestone") {
        fetchMilestones();
      }
    } catch (err) {
      console.error("Error submitting report:", err);
      message.error("Failed to submit report");
    }
  };

  // === TIER 1: Profile + Block check (hero identity — show immediately) ===
  const fetchProfileData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const promises = [
        supabase.from("profile").select(`
          id, firstname, nickname, lastname, avatar_url, ancestor, parent, sunrise, sunset, branch, email, is_admin, is_locked, lock_media_comments,
          parent_profile:parent (id, firstname, nickname, lastname, avatar_url, branch),
          ancestor_profile:ancestor (id, firstname, nickname, lastname, avatar_url, branch),
          profilestate (
            city,
            state:state_id (state_name)
          )
        `).eq("id", userId)
      ];

      if (session) {
        promises.push(
          supabase.rpc("is_blocked_by_family", { viewer_id: session.user.id, target_profile_id: userId })
        );
      }

      if (session && session.user.id !== userId) {
        promises.push(
          supabase.from("profile_relationship").select("relation_type")
            .eq("blocker_id", session.user.id).eq("blocked_id", userId).maybeSingle()
        );
      }

      const results = await Promise.all(promises);
      const { data: profileData, error: profileErr } = results[0];

      if (profileErr) throw profileErr;
      if (profileData && profileData.length > 0) {
        const prof = profileData[0];
        if (Number(prof.branch) === 1) {
          navigate(`/branch/${prof.id}`, { replace: true });
          return;
        }
        setData(prof);
      }

      if (session) {
        setIsBlocked(!!results[1]?.data);
      }

      if (session && session.user.id !== userId && results[2]) {
        const relData = results[2].data;
        setRelationship(relData ? relData.relation_type : null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, session, navigate]);

  // === TIER 2: Connections + Pending requests ===
  const fetchConnectionsData = useCallback(async () => {
    if (!userId) return;
    setConnectionsLoading(true);
    try {
      const promises = [
        supabase.from("connection").select(`
          profile_2, connection_type,
          profile_2:profile_2 (id, firstname, nickname, lastname, avatar_url, sunrise, sunset, branch)
        `).eq("profile_1", userId)
      ];

      if (session && session.user.id === userId) {
        promises.push(
          supabase.from("connection").select(`
            profile_1, profile_2, connection_type, status, requested_by,
            profile_1:profile_1 (id, firstname, nickname, lastname, avatar_url),
            profile_2:profile_2 (id, firstname, nickname, lastname, avatar_url)
          `).eq("status", "pending")
            .or(`profile_1.eq.${session.user.id},profile_2.eq.${session.user.id}`)
        );
      }

      const results = await Promise.all(promises);

      const { data: connectionsData, error: connectionErr } = results[0];
      if (connectionErr) throw connectionErr;
      setConnections(connectionsData || []);

      if (results[1]) {
        const { data: pendingData, error: pendingErr } = results[1];
        if (!pendingErr && pendingData) {
          const receivedRequests = pendingData.filter(
            (req) => req.requested_by !== session.user.id
          );
          const uniqueReceived = [];
          const seenKeys = new Set();
          receivedRequests.forEach((req) => {
            const sortedIds = [req.profile_1.id, req.profile_2.id].sort().join("-");
            const key = `${sortedIds}-${req.connection_type}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              uniqueReceived.push(req);
            }
          });
          setPendingRequests(uniqueReceived);
        }
      }
    } catch (err) {
      console.error("Connections fetch error:", err);
    } finally {
      setConnectionsLoading(false);
    }
  }, [userId, session]);

  // === TIER 3: Guestbook, Media, Milestones, Likes (below the fold) ===
  const fetchContentData = useCallback(async () => {
    if (!userId) return;
    setTributesLoading(true);
    setMediaLoading2(true);
    setMilestonesLoading(true);

    try {
      const promises = [
        // Guestbook
        supabase.from("guestbook_post").select(`
          id, content, location, event_date, likes_count, is_reported, created_at, tagged_profiles,
          author:author_id (id, firstname, lastname, avatar_url)
        `).eq("profile_id", userId).eq("is_reported", false)
          .order("created_at", { ascending: false }),
        // Media
        supabase.from("media").select("*")
          .eq("profile_id", userId).order("created_at", { ascending: false }),
      ];

      // Likes queries (only if logged in)
      if (session) {
        promises.push(
          supabase.from("likes").select("target_id")
            .eq("user_id", session.user.id).eq("target_type", "guestbook_post"),
          supabase.from("likes").select("target_id")
            .eq("user_id", session.user.id).eq("target_type", "media"),
          supabase.from("likes").select("target_id")
            .eq("user_id", session.user.id).eq("target_type", "milestone")
        );
      }

      const [guestbookRes, mediaRes, ...likesResults] = await Promise.all(promises);

      // Guestbook
      setTributes(!guestbookRes.error && guestbookRes.data ? guestbookRes.data : []);
      setTributesLoading(false);

      // Media
      setMediaItems(!mediaRes.error && mediaRes.data ? mediaRes.data : []);
      setMediaLoading2(false);

      // Likes
      if (session && likesResults.length >= 3) {
        if (likesResults[0].data) setLikedGuestbookPostIds(likesResults[0].data.map(l => l.target_id));
        if (likesResults[1].data) setLikedMediaIds(likesResults[1].data.map(l => l.target_id));
        if (likesResults[2].data) setLikedMilestoneIds(likesResults[2].data.map(l => l.target_id));
      }
    } catch (err) {
      console.warn("Content fetch error:", err);
      setTributesLoading(false);
      setMediaLoading2(false);
    }

    // Milestones (separate since it has its own fetch function)
    await fetchMilestones();
  }, [userId, session, fetchMilestones]);

  // Fire all tiers in parallel
  useEffect(() => {
    fetchProfileData();
    fetchConnectionsData();
    fetchContentData();
  }, [fetchProfileData, fetchConnectionsData, fetchContentData]);

  if (error) return <div className="profile-bezel-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f3e7b1' }}>Error: {error}</div>;

  if (loading || !data) return (
    <div className="profile-bezel-card">
      <div className="profile-hero-section">
        <div className="profile-photo-container">
          <div className="profile-avatar-placeholder profile-skeleton-pulse">
            <UserOutlined className="placeholder-icon" />
          </div>
        </div>
        <div className="profile-identity-overlay">
          <div className="profile-skeleton-bar" style={{ width: '40%', height: '0.7rem', margin: '0 auto 0.5rem' }} />
          <div className="profile-skeleton-bar" style={{ width: '60%', height: '1.4rem', margin: '0 auto' }} />
        </div>
      </div>
      <div className="profile-drawers-container">
        <div className="profile-skeleton-tiles">
          {[0,1,2,3].map(i => (
            <div key={i} className="profile-skeleton-tile">
              <div className="profile-skeleton-bar" style={{ width: '50%', height: '0.6rem' }} />
              <div className="profile-skeleton-bar" style={{ width: '70%', height: '0.5rem', opacity: 0.5 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Group connections
  const connectionGroups = connections.reduce((acc, conn) => {
    const type = conn.connection_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(conn);
    return acc;
  }, { parent: [], spouse: [], child: [] });

  // Permissions & Context Calculations
  const isCurrentUser = session?.user?.id === userId;
  const isDeceased = data.sunset !== null;

  // Check direct relationship (child, parent, spouse)
  const isMyChild = data.parent === session?.user?.id;
  const isMySpouse = connections.some(
    (conn) => conn.profile_2.id === session?.user?.id && conn.connection_type === "spouse"
  );
  const isMyParent = connections.some(
    (conn) => conn.profile_2.id === session?.user?.id && conn.connection_type === "parent"
  );
  const isDirectRelation = isMyChild || isMySpouse || isMyParent;

  // Check if minor (age < 18)
  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return null;
    const birthDate = new Date(birthDateStr);
    const ageDiffMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };
  const profileAge = calculateAge(data.sunrise);
  const isMinor = profileAge !== null && profileAge < 18;

  // Can edit if yourself (alive), or your direct connection who is deceased or lacks an email account
  // But for minors, only the parent (isMyChild) can edit
  const hasNoEmailTied = !data.email;
  const canEdit = session && (
    isMinor
      ? isMyChild
      : (isCurrentUser && !isDeceased) || (isDirectRelation && (isDeceased || hasNoEmailTied))
  );

  // Date Formatting
  const safeFormat = (date, pattern) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return format(d, pattern);
  };

  const formattedSunrise = safeFormat(data.sunrise, "MMMM d, yyyy");
  const formattedSunset = data.sunset ? safeFormat(data.sunset, "MMMM d, yyyy") : null;

  // Dynamic Badge Formatting
  const getGenerationBadgeText = (branchVal, ancestorProfile) => {
    if (branchVal === null || branchVal === undefined) return "UNLINKED LINEAGE";
    if (branchVal === 0) return "ROOTS · FOUNDER";

    const ordinal = (n) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    if (branchVal === 1) {
      return `1ST BRANCH · ${data.firstname} ${data.lastname}`.toUpperCase();
    }

    const genNum = branchVal + 1;
    const ancestorName = ancestorProfile
      ? `${ancestorProfile.firstname} ${ancestorProfile.lastname}`
      : "FAMILY BRANCH";
    return `${ordinal(genNum)} GEN · ${ancestorName}`.toUpperCase();
  };

  const badgeText = getGenerationBadgeText(data.branch, data.ancestor_profile);

  // --- Guestbook v2 Handlers ---
  const handleGuestbookPostCreated = (newPost) => {
    setTributes(prev => [newPost, ...prev]);
  };

  const handleDeleteGuestbookPost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        const { error } = await supabase
          .from("guestbook_post")
          .delete()
          .eq("id", postId);
        if (error) throw error;
        setTributes(prev => prev.filter(p => p.id !== postId));
        message.success("Note deleted successfully");
      } catch (err) {
        console.error("Error deleting note:", err);
        message.error("Failed to delete note");
      }
    }
  };

  const handleReportGuestbookPost = async (postId) => {
    await handleReportContent("guestbook_post", postId, "Reported by family member");
  };

  const handleGuestbookLikeToggle = async (postId, isLiked) => {
    if (!session) return;
    try {
      if (isLiked) {
        await supabase.from("likes").insert([
          { user_id: session.user.id, target_type: "guestbook_post", target_id: postId }
        ]);
        setLikedGuestbookPostIds(prev => [...prev, postId]);
      } else {
        await supabase.from("likes").delete()
          .eq("user_id", session.user.id)
          .eq("target_type", "guestbook_post")
          .eq("target_id", postId);
        setLikedGuestbookPostIds(prev => prev.filter(id => id !== postId));
      }
    } catch (err) {
      console.error("Error toggling guestbook like:", err);
    }
  };

  // --- Media Gallery Handlers ---
  const fetchMedia = async () => {
    setMediaLoading(true);
    try {
      const { data: mData, error: mErr } = await supabase
        .from("media")
        .select("*")
        .eq("profile_id", userId)
        .order("created_at", { ascending: false });
      if (!mErr && mData) {
        setMediaItems(mData);
      } else {
        setMediaItems([]);
      }
    } catch (err) {
      console.warn("Media fetch failed:", err);
      setMediaItems([]);
    } finally {
      setMediaLoading(false);
    }
  };

  const getMediaImageSrc = (filePath) => {
    if (!filePath) return null;
    if (filePath.startsWith("http") || filePath.startsWith("/")) return filePath;
    const { data } = supabase.storage.from("profile-media").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleUploadMedia = async (e) => {
    e.preventDefault();
    if (!newMediaFile) {
      message.error("Please select a file to upload");
      return;
    }
    setUploadingMedia(true);
    try {
      const mediaId = (window.crypto && window.crypto.randomUUID)
        ? window.crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);
      const fileExt = newMediaFile.name.split(".").pop();
      const filePath = `${userId}/${mediaId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-media")
        .upload(filePath, newMediaFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("media").insert([
        {
          id: mediaId,
          profile_id: userId,
          uploader_id: session.user.id,
          file_path: filePath,
          caption: newMediaCaption.trim() || null,
          decade: newMediaDecade,
          is_broadcast: newMediaBroadcast,
        },
      ]);

      if (insertError) throw insertError;

      message.success("Photo added to gallery!");
      setNewMediaCaption("");
      setNewMediaDecade("Today");
      setNewMediaFile(null);
      setNewMediaBroadcast(true);
      setShowUploadMediaForm(false);
      fetchMedia();
    } catch (err) {
      console.error("Error uploading photo:", err);
      message.error("Failed to upload photo: " + err.message);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleMediaLikeToggle = async (mediaId, isLiked) => {
    if (!session) return;
    try {
      if (isLiked) {
        await supabase.from("likes").insert([
          { user_id: session.user.id, target_type: "media", target_id: mediaId }
        ]);
        setLikedMediaIds(prev => [...prev, mediaId]);
      } else {
        await supabase.from("likes").delete()
          .eq("user_id", session.user.id)
          .eq("target_type", "media")
          .eq("target_id", mediaId);
        setLikedMediaIds(prev => prev.filter(id => id !== mediaId));
      }
    } catch (err) {
      console.error("Error toggling media like:", err);
    }
  };

  const handleMilestoneLikeToggle = async (milestoneId) => {
    if (!session) return;
    const isLiked = likedMilestoneIds.includes(milestoneId);
    try {
      if (!isLiked) {
        const { error } = await supabase
          .from("likes")
          .insert([
            { user_id: session.user.id, target_type: "milestone", target_id: milestoneId }
          ]);
        if (error) throw error;
        setLikedMilestoneIds(prev => [...prev, milestoneId]);
        setMilestones(prev => prev.map(m => m.id === milestoneId ? { ...m, likes_count: (m.likes_count || 0) + 1 } : m));
      } else {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", session.user.id)
          .eq("target_type", "milestone")
          .eq("target_id", milestoneId);
        if (error) throw error;
        setLikedMilestoneIds(prev => prev.filter(id => id !== milestoneId));
        setMilestones(prev => prev.map(m => m.id === milestoneId ? { ...m, likes_count: Math.max(0, (m.likes_count || 0) - 1) } : m));
      }
    } catch (err) {
      console.error("Error toggling milestone like:", err);
      message.error("Failed to update like");
    }
  };

  const fetchMediaComments = async (mediaId) => {
    try {
      const { data, error } = await supabase
        .from("media_comment")
        .select("id, comment_text, created_at, author:author_id (id, firstname, lastname, avatar_url)")
        .eq("media_id", mediaId)
        .order("created_at", { ascending: true });
      if (!error && data) {
        setMediaComments(data);
      } else {
        setMediaComments([]);
      }
    } catch (err) {
      console.warn("Comments fetch failed:", err);
    }
  };

  const handlePostComment = async () => {
    if (!newCommentText.trim() || !activePhotoDetail) return;
    setSubmittingComment(true);
    try {
      const { data: commentData, error } = await supabase
        .from("media_comment")
        .insert([
          {
            media_id: activePhotoDetail.id,
            author_id: session.user.id,
            comment_text: newCommentText.trim(),
          },
        ])
        .select("id, comment_text, created_at, author:author_id (id, firstname, lastname, avatar_url)");

      if (error) throw error;

      if (commentData && commentData.length > 0) {
        setMediaComments(prev => [...prev, commentData[0]]);
        setNewCommentText("");
        message.success("Comment added!");
      }
    } catch (err) {
      console.error("Error posting comment:", err);
      message.error("Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      try {
        const { error } = await supabase
          .from("media_comment")
          .delete()
          .eq("id", commentId);
        if (error) throw error;
        setMediaComments(prev => prev.filter(c => c.id !== commentId));
        message.success("Comment deleted");
      } catch (err) {
        console.error("Error deleting comment:", err);
        message.error("Failed to delete comment");
      }
    }
  };

  const handleDeleteMedia = async (mediaItem) => {
    if (window.confirm("Are you sure you want to delete this photo from the gallery?")) {
      try {
        const { error: storageError } = await supabase.storage
          .from("profile-media")
          .remove([mediaItem.file_path]);
        if (storageError) {
          console.warn("Could not delete file from storage:", storageError.message);
        }

        const { error } = await supabase
          .from("media")
          .delete()
          .eq("id", mediaItem.id);
        if (error) throw error;

        message.success("Photo deleted successfully");
        fetchMedia();
        if (activePhotoDetail?.id === mediaItem.id) {
          setActivePhotoDetail(null);
        }
      } catch (err) {
        console.error("Error deleting photo:", err);
        message.error("Failed to delete photo");
      }
    }
  };

  const handleToggleMediaBroadcast = async (mediaId, currentBroadcast) => {
    try {
      const { error } = await supabase
        .from("media")
        .update({ is_broadcast: !currentBroadcast })
        .eq("id", mediaId);

      if (error) throw error;
      setMediaItems(mediaItems.map(m => m.id === mediaId ? { ...m, is_broadcast: !currentBroadcast } : m));
      message.success(currentBroadcast ? "Removed from Global Feed" : "Broadcasted to Global Feed!");
    } catch (err) {
      console.error("Error toggling media broadcast:", err);
      message.error("Failed to update broadcast status");
    }
  };

  const handleToggleMilestoneBroadcast = async (milestoneId, currentBroadcast) => {
    try {
      const { error } = await supabase
        .from("milestone")
        .update({ is_broadcast: !currentBroadcast })
        .eq("id", milestoneId);

      if (error) throw error;
      setMilestones(milestones.map(m => m.id === milestoneId ? { ...m, is_broadcast: !currentBroadcast } : m));
      message.success(currentBroadcast ? "Removed from Global Feed" : "Broadcasted to Global Feed!");
    } catch (err) {
      console.error("Error toggling milestone broadcast:", err);
      message.error("Failed to update broadcast status");
    }
  };

  if (isBlocked) {
    const initials = `${data.firstname?.[0] || ""}. ${data.lastname?.[0] || ""}.`;
    return (
      <div className="profile-bezel-card blocked-screen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #4e1237 0%, #2b081e 100%)', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid #fa541c', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#300820', marginBottom: '24px' }}>
          <UserOutlined style={{ fontSize: '4rem', color: '#fa541c', opacity: 0.8 }} />
        </div>
        <h1 style={{ color: '#f3e7b1', fontSize: '2rem', fontWeight: 'bold', marginBottom: '12px' }}>{initials}</h1>
        <div style={{ background: 'rgba(250, 84, 28, 0.08)', border: '1px solid rgba(250, 84, 28, 0.3)', borderRadius: '16px', padding: '24px 20px', maxWidth: '360px', marginBottom: '24px' }}>
          <SafetyOutlined style={{ fontSize: '2.5rem', color: '#fa541c', marginBottom: '12px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
          <h3 style={{ color: '#fa541c', fontSize: '1.2rem', margin: '0 0 8px 0', fontWeight: 'bold' }}>Access Restricted</h3>
          <p style={{ color: '#EABEA9', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>You do not have permission to view this profile's milestones, guestbook, or media gallery.</p>
        </div>
        <Button onClick={() => navigate("/")} style={{ background: 'transparent', borderColor: '#EABEA9', color: '#F7DC92', borderRadius: '8px', fontWeight: 'bold' }}>
          Return to Tree
        </Button>
      </div>
    );
  }

  return (
    <div className="profile-bezel-card">
      {/* TOP HALF: Hero & Identity */}
      <div className={`profile-hero-section ${activeDrawer ? "shrunk" : ""}`}>
        {/* Full Image */}
        <div
          className="profile-photo-container"
          onClick={canEdit ? goToAvatar : undefined}
          style={canEdit ? { cursor: 'pointer' } : undefined}
        >
          {getAvatarSrc(data) ? (
            <img src={getAvatarSrc(data)} alt={`${data.firstname} portrait`} />
          ) : (
            <div className="profile-avatar-placeholder">
              <UserOutlined className="placeholder-icon" />
            </div>
          )}
          {canEdit && (
            <div className="photo-edit-badge">
              <CameraOutlined className="photo-edit-icon" />
            </div>
          )}
        </div>

        {/* Floating Settings Gear */}
        {canEdit && (
          <SettingOutlined className="settings-cog" onClick={goToEdit} />
        )}

        {/* Floating Safety Gear */}
        {session && !isCurrentUser && (
          <SafetyOutlined
            className="settings-cog safety-cog"
            onClick={() => setShowSafetyOverlay(true)}
            style={{
              left: canEdit ? "64px" : "16px",
              right: "auto",
              color: relationship ? "#fa8c16" : "#f3e7b1"
            }}
          />
        )}

        {/* Normal Identity Overlay */}
        <div className={`profile-identity-overlay ${activeDrawer ? "hidden" : ""}`}>
          <span className="profile-badge">{badgeText}</span>
          <h1 className="profile-name">
            {data.nickname ? `${data.firstname} "${data.nickname}"` : data.firstname} {data.lastname}
          </h1>
          {isDeceased && (
            <span className="profile-lifespan-dates" style={{ fontFamily: "'Titillium Web', sans-serif", fontSize: "1rem", fontWeight: "600", color: "#EABEA9", marginTop: "6px", letterSpacing: "0.5px" }}>
              {formattedSunrise} – {formattedSunset}
            </span>
          )}
        </div>

        {/* Shrunk Mini Identity */}
        <div className="profile-mini-identity">
          {getAvatarSrc(data) ? (
            <img src={getAvatarSrc(data)} className="profile-mini-avatar" alt="avatar" />
          ) : (
            <Avatar icon={<UserOutlined />} shape="square" className="profile-mini-avatar" style={{ border: 'none' }} />
          )}
          <div className="profile-mini-text">
            <span className="profile-mini-name">{data.firstname} {data.lastname}</span>
            <span className="profile-mini-badge">{badgeText}</span>
          </div>
        </div>
      </div>

      {/* BOTTOM HALF: Slid-up drawers */}
      <div className={`profile-drawers-container ${activeDrawer ? "expanded" : ""}`}>
        {isCurrentUser && pendingRequests.length > 0 && !activeDrawer && (
          <div className="pending-requests-banner">
            <div className="pending-requests-header">
              <span className="pending-title">Pending Family Connections</span>
              <span className="pending-count">{pendingRequests.length} request{pendingRequests.length > 1 ? "s" : ""}</span>
            </div>
            <div className="pending-requests-list">
              {pendingRequests.map((req) => {
                const otherProfile = req.profile_1.id === session.user.id ? req.profile_2 : req.profile_1;
                let descriptionText = "";
                if (req.connection_type === 'spouse') {
                  descriptionText = `wants to link as your spouse`;
                } else if (req.connection_type === 'parent') {
                  if (req.profile_1.id === session.user.id) {
                    descriptionText = `wants to link as your parent`;
                  } else {
                    descriptionText = `wants to link you as their child`;
                  }
                } else if (req.connection_type === 'child') {
                  if (req.profile_2.id === session.user.id) {
                    descriptionText = `wants to link as your parent`;
                  } else {
                    descriptionText = `wants to link you as their child`;
                  }
                }
                return (
                  <div key={`${otherProfile.id}-${req.connection_type}`} className="pending-request-item">
                    <div className="pending-request-info">
                      <Avatar src={getAvatarSrc(otherProfile)} icon={<UserOutlined />} />
                      <div>
                        <span className="pending-request-name">{otherProfile.firstname} {otherProfile.lastname}</span>
                        <span className="pending-request-desc">{descriptionText}</span>
                      </div>
                    </div>
                    <div className="pending-request-actions">
                      <Button size="small" className="approve-btn" onClick={() => handleApproveRequest(req)}>Approve</Button>
                      <Button size="small" className="decline-btn" onClick={() => handleRejectRequest(req)}>Decline</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* 1. Life Milestones Drawer */}
        <div className={`profile-drawer milestones 
          ${activeDrawer === "milestones" ? "expanded-active" : ""} 
          ${activeDrawer && activeDrawer !== "milestones" ? "hidden-inactive" : ""}`}
        >
          {activeDrawer === "milestones" ? (
            <>
              <div className="drawer-header" onClick={() => toggleDrawer("milestones")}>
                <span className="drawer-title">Life Milestones</span>
                <button className="close-drawer-btn"><CloseOutlined /></button>
              </div>
              <div className="drawer-content" style={{ display: "flex", flexDirection: "column", height: "calc(100% - 60px)" }}>
                <div className="milestone-timeline-container" style={{ flex: 1, overflowY: "auto", padding: "1rem 0" }}>

                  {/* Timeline Render */}
                  {milestonesLoading ? (
                    <div style={{ textAlign: "center", color: "#EABEA9", padding: "2rem" }}>Loading timeline...</div>
                  ) : (() => {
                    const profileLocation = data?.profilestate?.[0] || data?.profilestate || null;
                    const virtualBirth = data.sunrise ? {
                      id: "virtual-birth",
                      category: "general",
                      title: "Born (Sunrise)",
                      event_date: data.sunrise,
                      location_text: profileLocation ? `${profileLocation.city || ""}${profileLocation.city && profileLocation.state?.state_name ? ", " : ""}${profileLocation.state?.state_name || ""}`.trim() || null : null,
                      notes: "The journey begins.",
                      isVirtual: true,
                    } : null;

                    const virtualSunset = data.sunset ? {
                      id: "virtual-sunset",
                      category: "general",
                      title: "Gone Home (Sunset)",
                      event_date: data.sunset,
                      notes: "Rest in peace.",
                      isVirtual: true,
                    } : null;

                    const timelineEvents = [
                      ...(virtualBirth ? [virtualBirth] : []),
                      ...milestones,
                      ...(virtualSunset ? [virtualSunset] : []),
                    ];

                    const sortedEvents = [...timelineEvents].sort((a, b) => {
                      if (!a.event_date) return 1;
                      if (!b.event_date) return -1;
                      return new Date(a.event_date) - new Date(b.event_date);
                    });

                    const filteredEvents = sortedEvents;

                    if (filteredEvents.length === 0 && !canEdit) {
                      return (
                        <div style={{ textAlign: "center", padding: "40px 16px", color: "#EABEA9" }}>
                          <p style={{ margin: 0, fontStyle: "italic", opacity: 0.8 }}>No events recorded for this category.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="timeline-river">
                        {canEdit && (
                          <div className="timeline-item add-milestone-trigger-item">
                            <div className="timeline-left" style={{ display: "flex", justifyContent: "flex-end", paddingRight: "8px" }}>
                              <PlusOutlined style={{ color: "#EABEA9", fontSize: "1.1rem", marginTop: "12px" }} />
                            </div>
                            <div className="timeline-center">
                              <div className="timeline-dot general" style={{ border: "2px solid #EABEA9", background: "#30041e", zIndex: 3, width: "12px", height: "12px", borderRadius: "50%" }} />
                            </div>
                            <div className="timeline-right" style={{ marginBottom: "1.5rem" }}>
                              <Button
                                type="dashed"
                                onClick={() => setShowAddMilestoneForm(true)}
                                icon={<PlusOutlined />}
                                style={{ width: "100%", color: "#f3e7b1", borderColor: "#EABEA9", background: "rgba(255,255,255,0.03)", height: "45px", borderRadius: "8px" }}
                              >
                                Add New Life Milestone
                              </Button>
                            </div>
                          </div>
                        )}
                        {filteredEvents.map((event) => {
                          const dateObj = event.event_date ? new Date(event.event_date) : null;
                          const formattedDate = dateObj && !isNaN(dateObj.getTime())
                            ? format(dateObj, "MMMM d, yyyy")
                            : "";
                          const year = dateObj && !isNaN(dateObj.getTime())
                            ? dateObj.getFullYear()
                            : "";

                          const isSpecialVirtual = event.id === "virtual-birth" || event.id === "virtual-sunset";
                          const dotClass = `timeline-dot ${event.category} ${isSpecialVirtual ? "virtual-bookend" : ""}`;

                          return (
                            <div key={event.id} className="timeline-item">
                              <div className="timeline-left">
                                <span className="timeline-year">{year}</span>
                              </div>
                              <div className="timeline-center">
                                <div className={dotClass} />
                              </div>
                              <div className="timeline-right">
                                <div className="timeline-card">
                                  <div className="timeline-card-header">
                                    <h4 className="timeline-card-title">{event.title}</h4>
                                    {canEdit && !event.isVirtual && (
                                      <Button
                                        size="small"
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => handleDeleteMilestone(event)}
                                        style={{ color: "#ff7875", padding: "0 4px" }}
                                      />
                                    )}
                                  </div>

                                  <div className="timeline-card-meta">
                                    {formattedDate && (
                                      <span className="meta-item">
                                        <CalendarOutlined /> {formattedDate}
                                      </span>
                                    )}
                                    {event.location_text && (
                                      <span className="meta-item">
                                        <EnvironmentOutlined /> {event.location_text}
                                      </span>
                                    )}
                                    {canEdit && !event.isVirtual && (
                                      <button
                                        onClick={() => handleToggleMilestoneBroadcast(event.id, event.is_broadcast)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: event.is_broadcast ? "#F7DC92" : "#888", padding: "0 4px", display: "flex", alignItems: "center" }}
                                        title={event.is_broadcast ? "Remove from Broadcast" : "Broadcast to Family Feed"}
                                      >
                                        {event.is_broadcast ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                                      </button>
                                    )}
                                    {!event.isVirtual && session && (
                                      <button
                                        onClick={() => handleMilestoneLikeToggle(event.id)}
                                        className={`timeline-like-btn ${likedMilestoneIds.includes(event.id) ? 'liked' : ''}`}
                                        title={likedMilestoneIds.includes(event.id) ? "Unlike Milestone" : "Like Milestone"}
                                      >
                                        {likedMilestoneIds.includes(event.id) ? <HeartFilled /> : <HeartOutlined />}
                                        <span>{event.likes_count || 0}</span>
                                      </button>
                                    )}
                                  </div>

                                  {event.notes && (
                                    <p className="timeline-card-notes">{event.notes}</p>
                                  )}

                                  {event.photo_url && (
                                    <div className="timeline-card-photo-wrap">
                                      <img
                                        src={getMilestoneImageSrc(event.photo_url)}
                                        alt={event.title}
                                        className="timeline-card-photo"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </>
          ) : (
            <div className="tile-click-zone" onClick={() => toggleDrawer("milestones")}>
              {milestonesLoading ? (
                <div className="profile-tile-skeleton">
                  <CalendarOutlined className="profile-tile-skeleton-icon pulse-icon" />
                  <span className="profile-tile-skeleton-label">Loading milestones...</span>
                </div>
              ) : (
                <MilestonesLiveTile
                  milestones={milestones}
                  profileName={data.firstname}
                  getMilestoneImageSrc={getMilestoneImageSrc}
                  activeDrawer={activeDrawer}
                />
              )}
            </div>
          )}
        </div>

        {/* 2. Immediate Family Drawer */}
        <div className={`profile-drawer connections 
          ${activeDrawer === "connections" ? "expanded-active" : ""} 
          ${activeDrawer && activeDrawer !== "connections" ? "hidden-inactive" : ""}`}
        >
          {activeDrawer === "connections" ? (
            <>
              <div className="drawer-header" onClick={() => toggleDrawer("connections")}>
                <span className="drawer-title">Immediate Family</span>
                <button className="close-drawer-btn"><CloseOutlined /></button>
              </div>
              <div className="drawer-content">
                <Space direction="vertical" size="large" style={{ width: "100%", marginTop: "1rem" }}>

                  {/* Parent */}
                  <div>
                    <h3 style={{ color: "#EABEA9", borderBottom: "1px solid rgba(234,190,169,0.15)", paddingBottom: "4px" }}>Parents</h3>

                    {/* Smithside lineage parent */}
                    {data.parent_profile && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                        <Link to={getProfileLink(data.parent_profile)} style={{ display: "flex", alignItems: "center", gap: "12px", color: "#f3e7b1" }}>
                          <Avatar
                            src={getAvatarSrc(data.parent_profile)}
                            icon={!getAvatarSrc(data.parent_profile) && <UserOutlined />}
                          />
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span>{data.parent_profile.firstname} {data.parent_profile.lastname}</span>
                            <span style={{ fontSize: "0.75rem", color: "#EABEA9" }}>Smithside Parent (Lineage)</span>
                          </div>
                        </Link>
                        {canEdit && (
                          <Button size="small" type="text" danger onClick={handleRemoveSmithsideParent} style={{ color: "#ff7875" }}>
                            Remove
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Other parents from connection table */}
                    {connectionGroups.parent
                      .filter((conn) => conn.profile_2.id !== data.parent_profile?.id)
                      .map((conn) => (
                        <div key={conn.profile_2.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                          <Link to={getProfileLink(conn.profile_2)} style={{ display: "flex", alignItems: "center", gap: "12px", color: "#f3e7b1" }}>
                            <Avatar
                              src={getAvatarSrc(conn.profile_2)}
                              icon={!getAvatarSrc(conn.profile_2) && <UserOutlined />}
                            />
                            <span>{conn.profile_2.firstname} {conn.profile_2.lastname}</span>
                          </Link>
                          {canEdit && (
                            <Button size="small" type="text" danger onClick={() => handleRemoveConnection(conn.profile_2.id)} style={{ color: "#ff7875" }}>
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}

                    {/* CTAs */}
                    {!data.parent_profile && (
                      <div style={{ padding: "8px 0", color: "#EABEA9", fontStyle: "italic", fontSize: "0.9rem" }}>
                        Smithside lineage parent not linked.
                        {canEdit && (
                          <Button size="small" type="link" onClick={() => navigate(`/interactive-form/smithparent/${userId}`)} style={{ color: "#F7DC92", padding: "0 8px" }}>
                            <PlusOutlined /> Link Smithside Parent
                          </Button>
                        )}
                      </div>
                    )}

                    {canEdit && (
                      <Button size="small" type="link" onClick={() => navigate(`/interactive-form/parent/${userId}`)} style={{ color: "#F7DC92", padding: "8px 0 0 0", display: "block" }}>
                        <PlusOutlined /> Link Other Parent
                      </Button>
                    )}
                  </div>

                  {/* Spouses */}
                  <div>
                    <h3 style={{ color: "#EABEA9", borderBottom: "1px solid rgba(234,190,169,0.15)", paddingBottom: "4px" }}>Spouse / Partner</h3>
                    {connectionGroups.spouse.length > 0 ? (
                      connectionGroups.spouse.map((conn) => (
                        <div key={conn.profile_2.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                          <Link to={getProfileLink(conn.profile_2)} style={{ display: "flex", alignItems: "center", gap: "12px", color: "#f3e7b1" }}>
                            <Avatar
                              shape="square"
                              src={getAvatarSrc(conn.profile_2)}
                              icon={!getAvatarSrc(conn.profile_2) && <UserOutlined />}
                              style={{ borderRadius: '6px' }}
                            />
                            <span>{conn.profile_2.firstname} {conn.profile_2.lastname}</span>
                          </Link>
                          {canEdit && (
                            <Button size="small" type="text" danger onClick={() => handleRemoveConnection(conn.profile_2.id)} style={{ color: "#ff7875" }}>
                              Remove
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: "8px 0", color: "#EABEA9", fontStyle: "italic", fontSize: "0.9rem" }}>
                        No spouse linked.
                      </div>
                    )}
                    {canEdit && (
                      <Button size="small" type="link" onClick={() => navigate(`/interactive-form/spouse/${userId}`)} style={{ color: "#F7DC92", padding: "8px 0 0 0", display: "block" }}>
                        <PlusOutlined /> Link Spouse
                      </Button>
                    )}
                  </div>

                  {/* Children */}
                  <div>
                    <h3 style={{ color: "#EABEA9", borderBottom: "1px solid rgba(234,190,169,0.15)", paddingBottom: "4px" }}>Children</h3>
                    {connectionGroups.child.length > 0 ? (
                      connectionGroups.child.map((conn) => (
                        <div key={conn.profile_2.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                          <Link to={getProfileLink(conn.profile_2)} style={{ display: "flex", alignItems: "center", gap: "12px", color: "#f3e7b1" }}>
                            <Avatar
                              shape="square"
                              src={getAvatarSrc(conn.profile_2)}
                              icon={!getAvatarSrc(conn.profile_2) && <UserOutlined />}
                              style={{ borderRadius: '6px' }}
                            />
                            <span>{conn.profile_2.firstname} {conn.profile_2.lastname}</span>
                          </Link>
                          {canEdit && (
                            <Button size="small" type="text" danger onClick={() => handleRemoveConnection(conn.profile_2.id)} style={{ color: "#ff7875" }}>
                              Remove
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: "8px 0", color: "#EABEA9", fontStyle: "italic", fontSize: "0.9rem" }}>
                        No children linked.
                      </div>
                    )}
                    {canEdit && (
                      <Button size="small" type="link" onClick={() => navigate(`/interactive-form/child/${userId}`)} style={{ color: "#F7DC92", padding: "8px 0 0 0", display: "block" }}>
                        <PlusOutlined /> Link Child
                      </Button>
                    )}
                  </div>

                </Space>
              </div>
            </>
          ) : (
            <div className="tile-click-zone" onClick={() => toggleDrawer("connections")}>
              {connectionsLoading ? (
                <div className="profile-tile-skeleton">
                  <TeamOutlined className="profile-tile-skeleton-icon pulse-icon" />
                  <span className="profile-tile-skeleton-label">Loading family...</span>
                </div>
              ) : (
                <LiveTile connections={connections} data={data} activeDrawer={activeDrawer} />
              )}
            </div>
          )}
        </div>

        {/* Bottom Row: Guestbook and Media */}
        <div className={`profile-drawers-bottom-row 
          ${activeDrawer === "guestbook" || activeDrawer === "media" ? "expanded-active" : ""}`}
        >
          {/* 3. Tribute Guestbook Drawer */}
          {!isMinor && (
            <div className={`profile-drawer guestbook 
              ${activeDrawer === "guestbook" ? "expanded-active" : ""} 
              ${activeDrawer && activeDrawer !== "guestbook" ? "hidden-inactive" : ""}`}
            >
              {activeDrawer === "guestbook" ? (
                <>
                  <div className="drawer-header" onClick={() => toggleDrawer("guestbook")}>
                    <span className="drawer-title">Tribute Guestbook</span>
                    <button className="close-drawer-btn"><CloseOutlined /></button>
                  </div>
                  <div className="drawer-content" style={{ display: "flex", flexDirection: "column", height: "calc(100% - 60px)" }}>
                    {data.is_locked ? (
                      <div style={{ padding: "12px 16px", textAlign: "center", color: "#fa8c16", background: "rgba(250,84,28,0.06)", borderRadius: "12px", border: "1px solid rgba(250,84,28,0.25)", marginBottom: "16px", fontSize: "0.9rem", fontWeight: "bold" }}>
                        This guestbook has been locked by the owner. New messages cannot be posted.
                      </div>
                    ) : session && profile ? (
                      <GuestbookComposer
                        profileId={userId}
                        firstname={data.firstname}
                        authorId={session.user.id}
                        currentUser={profile}
                        onPostCreated={handleGuestbookPostCreated}
                        getAvatarSrc={getAvatarSrc}
                      />
                    ) : session ? (
                      <div style={{ padding: "12px", textAlign: "center", color: "#EABEA9" }}>
                        Complete your profile before writing guestbook notes.
                      </div>
                    ) : (
                      <div style={{ padding: "12px", textAlign: "center", color: "#EABEA9" }}>
                        Please <Link to="/register" style={{ color: "#F7DC92", fontWeight: "bold" }}>Sign In</Link> to write a note in the guestbook.
                      </div>
                    )}
                    <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                      {tributes.map((post) => (
                        <GuestbookPostCard
                          key={post.id}
                          post={post}
                          currentUserId={session?.user?.id}
                          profileId={userId}
                          liked={likedGuestbookPostIds.includes(post.id)}
                          onDelete={handleDeleteGuestbookPost}
                          onReport={handleReportGuestbookPost}
                          onLikeToggle={handleGuestbookLikeToggle}
                          onUpdateBroadcast={(postId, isPub) => {
                            setTributes(tributes.map(t => t.id === postId ? { ...t, is_broadcast: isPub } : t));
                          }}
                          getAvatarSrc={getAvatarSrc}
                          getProfileLink={getProfileLink}
                        />
                      ))}
                      {tributes.length === 0 && (
                        <div style={{ textAlign: "center", color: "#EABEA9", padding: "24px 0", fontStyle: "italic" }}>
                          {session?.user?.id === userId
                            ? "No notes left yet. When family members leave you messages, they will show up here!"
                            : "No notes left yet. Be the first to write a message!"}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="tile-click-zone" onClick={() => toggleDrawer("guestbook")}>
                  {tributesLoading ? (
                    <div className="profile-tile-skeleton">
                      <EditOutlined className="profile-tile-skeleton-icon pulse-icon" />
                      <span className="profile-tile-skeleton-label">Loading guestbook...</span>
                    </div>
                  ) : (
                    <GuestbookLiveTile
                      posts={tributes}
                      profileName={data.firstname}
                      getAvatarSrc={getAvatarSrc}
                      activeDrawer={activeDrawer}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. Media Gallery Drawer */}
          <div className={`profile-drawer media 
            ${activeDrawer === "media" ? "expanded-active" : ""} 
            ${activeDrawer && activeDrawer !== "media" ? "hidden-inactive" : ""}`}
          >
            {activeDrawer === "media" ? (
              <>
                <div className="drawer-header" onClick={() => toggleDrawer("media")}>
                  <span className="drawer-title">Media Gallery</span>
                  <button className="close-drawer-btn"><CloseOutlined /></button>
                </div>
                <div className="drawer-content" style={{ display: "flex", flexDirection: "column", height: "calc(100% - 60px)" }}>

                  {/* Decade Filters */}
                  <div className="milestone-tabs-nav">
                    {["All", "1980s and older", "1990s", "2000s", "2010s", "Today"].map((dec) => (
                      <button
                        key={dec}
                        type="button"
                        className={`milestone-tab-btn ${activeDecadeFilter === dec ? "active" : ""}`}
                        onClick={() => setActiveDecadeFilter(dec)}
                      >
                        {dec}
                      </button>
                    ))}
                  </div>

                  <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
                    {/* Upload button */}
                    {canEdit && !showUploadMediaForm && (
                      <Button
                        type="dashed"
                        onClick={() => setShowUploadMediaForm(true)}
                        icon={<PlusOutlined />}
                        style={{ width: "100%", color: "#f3e7b1", borderColor: "#EABEA9", background: "rgba(255,255,255,0.03)", height: "45px", borderRadius: "8px", marginBottom: "1.5rem" }}
                      >
                        Upload New Photo
                      </Button>
                    )}

                    {/* Upload Form */}
                    {canEdit && showUploadMediaForm && (
                      <form onSubmit={handleUploadMedia} className="add-milestone-form">
                        <h3 style={{ color: "#EABEA9", margin: "0 0 12px 0", fontSize: "1.1rem" }}>Upload Photo</h3>

                        <div className="form-group" style={{ marginBottom: "12px" }}>
                          <label style={{ display: "block", color: "#EABEA9", fontSize: "0.8rem", marginBottom: "4px" }}>Select Photo *</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setNewMediaFile(e.target.files[0])}
                            required
                            style={{ color: "#EABEA9", fontSize: "0.85rem" }}
                          />
                        </div>

                        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: "block", color: "#EABEA9", fontSize: "0.8rem", marginBottom: "4px" }}>Decade *</label>
                            <select
                              value={newMediaDecade}
                              onChange={(e) => setNewMediaDecade(e.target.value)}
                              style={{ width: "100%", height: "32px", padding: "4px 8px", borderRadius: "6px", background: "#4a1934", color: "#fff", border: "1px solid rgba(234,190,169,0.3)" }}
                            >
                              <option value="Today">Today</option>
                              <option value="2010s">2010s</option>
                              <option value="2000s">2000s</option>
                              <option value="1990s">1990s</option>
                              <option value="1980s and older">1980s and older</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <label style={{ display: "block", color: "#EABEA9", fontSize: "0.8rem", marginBottom: "4px" }}>Caption</label>
                          <Input
                            placeholder="e.g. Summer Reunion at the lake"
                            value={newMediaCaption}
                            onChange={(e) => setNewMediaCaption(e.target.value)}
                            style={{ background: "#4a1934", color: "#fff", borderColor: "rgba(234,190,169,0.3)" }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                          <Checkbox
                            checked={newMediaBroadcast}
                            onChange={(e) => setNewMediaBroadcast(e.target.checked)}
                            style={{ color: "#f3e7b1" }}
                          >
                            Broadcast to Family Feed
                          </Checkbox>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          <Button
                            onClick={() => {
                              setShowUploadMediaForm(false);
                              setNewMediaFile(null);
                            }}
                            style={{ background: "transparent", color: "#EABEA9", borderColor: "rgba(234,190,169,0.3)" }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={uploadingMedia}
                            style={{ backgroundColor: "#F7DC92", color: "#873D62", fontWeight: "bold", border: "none" }}
                          >
                            Upload
                          </Button>
                        </div>
                      </form>
                    )}

                    {/* Polaroid Gallery */}
                    {mediaLoading ? (
                      <div style={{ textAlign: "center", color: "#EABEA9", padding: "2rem" }}>Loading media...</div>
                    ) : (() => {
                      const filteredMedia = activeDecadeFilter === "All"
                        ? mediaItems
                        : mediaItems.filter(item => item.decade === activeDecadeFilter);

                      if (filteredMedia.length === 0) {
                        return (
                          <div style={{ textAlign: "center", padding: "40px 16px", color: "#EABEA9", fontStyle: "italic" }}>
                            No photos in this decade yet.
                          </div>
                        );
                      }

                      return (
                        <div className="polaroid-carousel">
                          {filteredMedia.map((item, index) => {
                            const liked = likedMediaIds.includes(item.id);
                            return (
                              <div
                                key={item.id}
                                className="polaroid-card"
                                style={{
                                  transform: `rotate(${(index % 2 === 0 ? 1 : -1) * (Math.random() * 2)}deg)`,
                                }}
                              >
                                <div
                                  className="polaroid-photo-wrapper"
                                  onClick={() => {
                                    setActivePhotoDetail(item);
                                    fetchMediaComments(item.id);
                                  }}
                                  style={{ cursor: "pointer" }}
                                >
                                  <img
                                    src={getMediaImageSrc(item.file_path)}
                                    alt={item.caption || "Family photo"}
                                    className="polaroid-photo"
                                  />
                                </div>
                                <div className="polaroid-caption">
                                  {item.caption || "Untitled Memory"}
                                </div>
                                <div className="polaroid-meta">
                                  <span style={{ textTransform: "uppercase", fontSize: "0.65rem", fontWeight: "bold", letterSpacing: "0.5px", color: "#873D62" }}>
                                    {item.decade}
                                  </span>
                                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <button
                                      onClick={() => handleMediaLikeToggle(item.id, !liked)}
                                      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", color: liked ? "#ff4d4f" : "#888", padding: 0 }}
                                    >
                                      {liked ? <HeartFilled /> : <HeartOutlined />}
                                      <span>{likedMediaIds.filter(id => id === item.id).length}</span>
                                    </button>
                                    {canEdit && (
                                      <>
                                        <button
                                          onClick={() => handleToggleMediaBroadcast(item.id, item.is_broadcast)}
                                          style={{ background: "none", border: "none", cursor: "pointer", color: item.is_broadcast ? "#F7DC92" : "#888", padding: 0 }}
                                          title={item.is_broadcast ? "Remove from Broadcast" : "Broadcast to Family Feed"}
                                        >
                                          {item.is_broadcast ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                                        </button>
                                        <button
                                          onClick={() => handleDeleteMedia(item)}
                                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ff7875", padding: 0 }}
                                        >
                                          <DeleteOutlined />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            ) : (
              <div className="tile-click-zone" onClick={() => toggleDrawer("media")}>
                {mediaLoading2 ? (
                  <div className="profile-tile-skeleton">
                    <CameraOutlined className="profile-tile-skeleton-icon pulse-icon" />
                    <span className="profile-tile-skeleton-label">Loading photos...</span>
                  </div>
                ) : (
                  <MediaLiveTile
                    mediaItems={mediaItems}
                    getMediaImageSrc={getMediaImageSrc}
                    activeDrawer={activeDrawer}
                  />
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Photo Detail Modal / Comments Overlay */}
      {activePhotoDetail && (
        <div className="photo-detail-overlay-backdrop">
          <div className="photo-detail-modal">
            <button className="close-overlay-btn" onClick={() => setActivePhotoDetail(null)}>
              <CloseOutlined />
            </button>
            <div className="photo-detail-content">
              <div className="photo-detail-image-wrap">
                <img src={getMediaImageSrc(activePhotoDetail.file_path)} alt="detail" />
              </div>
              <div className="photo-detail-info-pane">
                <div className="photo-info-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span className="photo-decade-badge">{activePhotoDetail.decade}</span>
                    <p className="photo-caption-text">{activePhotoDetail.caption || "Family Memory"}</p>
                  </div>
                  {session && activePhotoDetail.uploader_id !== session.user.id && (
                    <Button
                      type="text"
                      danger
                      icon={<FlagOutlined />}
                      onClick={() => handleReportContent("media", activePhotoDetail.id, "Reported media item")}
                      style={{ color: "#fa8c16", display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px" }}
                    >
                      Report
                    </Button>
                  )}
                </div>

                <div className="photo-comments-list">
                  <h4 style={{ color: "#EABEA9", marginBottom: "12px", borderBottom: "1px solid rgba(234,190,169,0.15)", paddingBottom: "6px" }}>Comments</h4>
                  <div className="comments-scroll-area">
                    {mediaComments.map((comment) => (
                      <div key={comment.id} className="comment-bubble">
                        <div className="comment-meta">
                          <Avatar size="small" src={getAvatarSrc(comment.author)} icon={<UserOutlined />} />
                          <span className="comment-author-name">{comment.author?.firstname} {comment.author?.lastname}</span>
                          <span className="comment-time">
                            {comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : ""}
                          </span>
                          {(comment.author?.id === session?.user?.id || canEdit) && (
                            <button className="delete-comment-btn" onClick={() => handleDeleteComment(comment.id)}>
                              <DeleteOutlined />
                            </button>
                          )}
                          {session && comment.author?.id !== session.user.id && (
                            <button className="delete-comment-btn report-comment-btn" onClick={() => handleReportContent("media_comment", comment.id, "Reported comment")} style={{ color: "#fa8c16", marginLeft: "8px" }}>
                              <FlagOutlined />
                            </button>
                          )}
                        </div>
                        <p className="comment-text-content">{comment.comment_text}</p>
                      </div>
                    ))}
                    {mediaComments.length === 0 && (
                      <p style={{ color: "#EABEA9", opacity: 0.6, fontStyle: "italic", textAlign: "center", margin: "24px 0" }}>No comments yet. Leave a word!</p>
                    )}
                  </div>
                </div>

                {data.lock_media_comments ? (
                  <div style={{ padding: "10px", textAlign: "center", color: "#fa8c16", background: "rgba(250,84,28,0.06)", borderRadius: "8px", border: "1px solid rgba(250,84,28,0.2)", fontSize: "0.85rem", fontWeight: "bold", marginTop: "auto" }}>
                    Comments have been locked by the owner.
                  </div>
                ) : session ? (
                  <div className="comment-input-area">
                    <Input
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      onPressEnter={handlePostComment}
                      style={{ background: "#4e1237", border: "1px solid #EABEA9", color: "#fff", borderRadius: "8px" }}
                    />
                    <Button
                      type="primary"
                      onClick={handlePostComment}
                      loading={submittingComment}
                      icon={<SendOutlined />}
                      style={{ backgroundColor: "#F7DC92", color: "#873D62", border: "none", borderRadius: "8px" }}
                    />
                  </div>
                ) : (
                  <div style={{ color: "#EABEA9", fontSize: "0.85rem", textAlign: "center", paddingTop: "8px", borderTop: "1px solid rgba(234,190,169,0.15)" }}>
                    Please sign in to write a comment.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Overlay Modal */}
      {showSafetyOverlay && (
        <div className="photo-detail-overlay-backdrop">
          <div className="photo-detail-modal" style={{ height: "auto", maxHeight: "80vh" }}>
            <button className="close-overlay-btn" onClick={() => setShowSafetyOverlay(false)}>
              <CloseOutlined />
            </button>
            <div style={{ padding: "32px 24px" }}>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <SafetyOutlined style={{ fontSize: "3rem", color: "#F7DC92", marginBottom: "12px" }} />
                <h2 style={{ color: "#f3e7b1", margin: 0 }}>Safety & Privacy Controls</h2>
                <p style={{ color: "#EABEA9", fontSize: "0.85rem", marginTop: "4px" }}>Manage your relationship and boundaries with {data.firstname}.</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Mute Box */}
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(234,190,169,0.15)", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ paddingRight: "8px" }}>
                    <h4 style={{ color: "#f3e7b1", margin: "0 0 4px 0" }}>Mute {data.firstname}</h4>
                    <p style={{ color: "#EABEA9", fontSize: "0.8rem", margin: 0, opacity: 0.8 }}>Hide this person's guestbook posts and gallery comments from your feed. You can still see their profile card.</p>
                  </div>
                  <Button
                    type={relationship === "mute" ? "default" : "primary"}
                    onClick={() => handleToggleRelationship("mute")}
                    style={relationship === "mute" ? { color: "#f3e7b1", borderColor: "#EABEA9", background: "transparent" } : { backgroundColor: "#fa8c16", borderColor: "#fa8c16", color: "#fff", fontWeight: "bold" }}
                  >
                    {relationship === "mute" ? "Muted" : "Mute"}
                  </Button>
                </div>

                {/* Block Box */}
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(234,190,169,0.15)", borderRadius: "12px", padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ paddingRight: "8px" }}>
                    <h4 style={{ color: "#f3e7b1", margin: "0 0 4px 0" }}>Block {data.firstname}</h4>
                    <p style={{ color: "#EABEA9", fontSize: "0.8rem", margin: 0, opacity: 0.8 }}>Restricts this person from viewing your milestones, guestbook, or photos. They will only see initials, and their direct family node is locked.</p>
                  </div>
                  <Button
                    type={relationship === "block" ? "default" : "primary"}
                    danger={relationship !== "block"}
                    onClick={() => handleToggleRelationship("block")}
                    style={relationship === "block" ? { color: "#f3e7b1", borderColor: "#EABEA9", background: "transparent" } : { fontWeight: "bold" }}
                  >
                    {relationship === "block" ? "Blocked" : "Block"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Milestone Form Modal Overlay */}
      {showAddMilestoneForm && (
        <div className="photo-detail-overlay-backdrop">
          <div className="milestone-overlay-modal">
            <button
              className="close-overlay-btn"
              onClick={() => {
                setShowAddMilestoneForm(false);
                setNewMilestonePhoto(null);
              }}
            >
              <CloseOutlined />
            </button>
            <div style={{ padding: "1.5rem 1.25rem" }}>
              <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                <PlusOutlined style={{ fontSize: "2rem", color: "#F7DC92", marginBottom: "8px" }} />
                <h2 style={{ color: "#f3e7b1", margin: 0, fontSize: "1.4rem" }}>Add Life Milestone</h2>
                <p style={{ color: "#EABEA9", fontSize: "0.85rem", marginTop: "4px" }}>Share an event, memory, or milestone in {data.firstname}'s life path.</p>
              </div>

              <form onSubmit={handleAddMilestone} className="milestone-modal-form-fields">
                <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                  <label className="milestone-modal-label">Title *</label>
                  <Input
                    placeholder="e.g. Graduated from UT Austin"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    required
                    style={{ background: "#4a1934", color: "#fff", borderColor: "rgba(234,190,169,0.3)", height: "36px" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "0.75rem" }}>
                  <div style={{ flex: 1 }}>
                    <label className="milestone-modal-label">Category</label>
                    <select
                      value={newMilestoneCategory}
                      onChange={(e) => setNewMilestoneCategory(e.target.value)}
                      style={{ width: "100%", height: "36px", padding: "4px 8px", borderRadius: "6px", background: "#4a1934", color: "#fff", border: "1px solid rgba(234,190,169,0.3)" }}
                    >
                      <option value="school">School</option>
                      <option value="career">Career</option>
                      <option value="sports">Sports</option>
                      <option value="family">Family</option>
                      <option value="adventures">Adventures</option>
                      <option value="memories">Memories</option>
                      <option value="travel">Travel</option>
                      <option value="military">Military</option>
                      <option value="faith">Faith</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="milestone-modal-label">Subcategory (optional)</label>
                    <Input
                      placeholder="e.g. Baptism, B.S. Degree"
                      value={newMilestoneSubcategory}
                      onChange={(e) => setNewMilestoneSubcategory(e.target.value)}
                      style={{ background: "#4a1934", color: "#fff", borderColor: "rgba(234,190,169,0.3)", height: "36px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "0.75rem" }}>
                  <div style={{ flex: 1 }}>
                    <label className="milestone-modal-label">Date</label>
                    <input
                      type="date"
                      value={newMilestoneDate}
                      onChange={(e) => setNewMilestoneDate(e.target.value)}
                      style={{ width: "100%", height: "36px", padding: "4px 8px", borderRadius: "6px", background: "#4a1934", color: "#fff", border: "1px solid rgba(234,190,169,0.3)", fontFamily: "inherit" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="milestone-modal-label">Location</label>
                    <Input
                      placeholder="e.g. Austin, TX"
                      value={newMilestoneLocation}
                      onChange={(e) => setNewMilestoneLocation(e.target.value)}
                      style={{ background: "#4a1934", color: "#fff", borderColor: "rgba(234,190,169,0.3)", height: "36px" }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: "0.75rem" }}>
                  <label className="milestone-modal-label">Notes / Memories</label>
                  <Input.TextArea
                    placeholder="Add details, memories, or notes..."
                    value={newMilestoneNotes}
                    onChange={(e) => setNewMilestoneNotes(e.target.value)}
                    rows={3}
                    style={{ background: "#4a1934", color: "#fff", borderColor: "rgba(234,190,169,0.3)", resize: "none" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label className="milestone-modal-label">Attach Event Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewMilestonePhoto(e.target.files[0])}
                    style={{ color: "#EABEA9", fontSize: "0.8rem", cursor: "pointer" }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                  <Checkbox
                    checked={newMilestoneBroadcast}
                    onChange={(e) => setNewMilestoneBroadcast(e.target.checked)}
                    style={{ color: "#f3e7b1" }}
                  >
                    Broadcast to Family Feed
                  </Checkbox>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <Button
                    onClick={() => {
                      setShowAddMilestoneForm(false);
                      setNewMilestonePhoto(null);
                    }}
                    style={{ background: "transparent", color: "#EABEA9", borderColor: "rgba(234,190,169,0.3)", height: "36px" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={savingMilestone}
                    style={{ backgroundColor: "#F7DC92", color: "#873D62", fontWeight: "bold", border: "none", height: "36px" }}
                  >
                    Save Event
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NewProfile;
