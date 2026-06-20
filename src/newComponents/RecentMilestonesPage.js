import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Avatar, Button, Spin, Empty, Card, message, Dropdown, Modal } from "antd";
import {
  UserOutlined,
  HeartOutlined,
  HeartFilled,
  CalendarOutlined,
  EnvironmentOutlined,
  MoreOutlined,
  EyeInvisibleOutlined,
  FlagOutlined,
  StopOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { format } from "date-fns";
import AuthConsumer from "../useSession";
import { supabase } from "../supabaseClient";
import { getAvatarSrc } from "../utils/avatarHelper";
import "./RecentMilestonesPage.css";

const RecentMilestonesPage = () => {
  const { session } = AuthConsumer();
  const [milestones, setMilestones] = useState([]);
  const [likedMilestoneIds, setLikedMilestoneIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenPostIds, setHiddenPostIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("hidden_milestone_ids") || "[]");
    } catch {
      return [];
    }
  });

  const fetchMilestonesData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Query blocks/mutes and direct relatives if user is logged in
      let blockedUserIds = [];
      let mutedUserIds = [];
      let relativeUserIds = [];
      if (session) {
        // Fetch blocks
        const { data: rels } = await supabase
          .from("profile_relationship")
          .select("blocked_id")
          .eq("blocker_id", session.user.id);
        if (rels) {
          blockedUserIds = rels.map((r) => r.blocked_id);
        }

        // Fetch mutes (mutes might be a separate relationship or part of profile_relationship depending on schema)
        // For now, let's also check for a 'muted' status if that exists, or use the uploaderId logic below
        const { data: mutes } = await supabase
          .from("profile_relationship")
          .select("blocked_id")
          .eq("blocker_id", session.user.id)
          .eq("relationship_type", "mute");
        if (mutes) {
          mutedUserIds = mutes.map(m => m.blocked_id);
        }

        const { data: conns } = await supabase
          .from("connection")
          .select("profile_2")
          .eq("profile_1", session.user.id)
          .eq("status", "active")
          .in("connection_type", ["spouse", "child", "parent"]);
        if (conns) {
          relativeUserIds = conns.map((c) => typeof c.profile_2 === 'object' ? c.profile_2.id : c.profile_2);
        }
      }

      // 2. Fetch most recent milestones across all profiles where is_broadcast is true
      const { data: mData, error: mErr } = await supabase
        .from("milestone")
        .select(`
          id,
          profile_id,
          title,
          category,
          subcategory,
          event_date,
          location_text,
          notes,
          photo_url,
          likes_count,
          created_at,
          profile:profile_id (id, firstname, lastname, avatar_url, is_locked)
        `)
        .eq("is_broadcast", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (mErr) throw mErr;

      // 3. Filter by blocks/mutes and locks in JS
      const filtered = (mData || []).filter((item) => {
        const prof = item.profile;
        if (!prof) return false;

        // Filter out if blocked/muted
        if (blockedUserIds.includes(prof.id)) return false;
        if (mutedUserIds.includes(prof.id)) return false;
        if (hiddenPostIds.includes(item.id)) return false;

        // Filter out locked profiles unless it is the user's own profile or a direct relative
        if (prof.is_locked) {
          const isOwn = session && session.user.id === prof.id;
          const isRelative = relativeUserIds.includes(prof.id);
          if (!isOwn && !isRelative) return false;
        }

        return true;
      });

      // Limit to 20 after filtering
      setMilestones(filtered.slice(0, 20));

      // 4. Fetch logged-in user's milestone likes
      if (session) {
        const { data: lData, error: lErr } = await supabase
          .from("likes")
          .select("target_id")
          .eq("user_id", session.user.id)
          .eq("target_type", "milestone");
        if (!lErr && lData) {
          setLikedMilestoneIds(lData.map((l) => l.target_id));
        }
      }
    } catch (err) {
      console.error("Error loading milestones:", err);
      message.error("Failed to load family milestones");
    } finally {
      setLoading(false);
    }
  }, [session, hiddenPostIds]);

  useEffect(() => {
    fetchMilestonesData();
  }, [fetchMilestonesData]);

  const handleMilestoneLikeToggle = async (milestoneId) => {
    if (!session) {
      message.warning("Please sign in to like milestones");
      return;
    }
    const isLiked = likedMilestoneIds.includes(milestoneId);
    try {
      if (!isLiked) {
        const { error } = await supabase
          .from("likes")
          .insert([
            { user_id: session.user.id, target_type: "milestone", target_id: milestoneId }
          ]);
        if (error) throw error;
        setLikedMilestoneIds((prev) => [...prev, milestoneId]);
        setMilestones((prev) =>
          prev.map((m) =>
            m.id === milestoneId ? { ...m, likes_count: (m.likes_count || 0) + 1 } : m
          )
        );
      } else {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", session.user.id)
          .eq("target_type", "milestone")
          .eq("target_id", milestoneId);
        if (error) throw error;
        setLikedMilestoneIds((prev) => prev.filter((id) => id !== milestoneId));
        setMilestones((prev) =>
          prev.map((m) =>
            m.id === milestoneId
              ? { ...m, likes_count: Math.max(0, (m.likes_count || 0) - 1) }
              : m
          )
        );
      }
    } catch (err) {
      console.error("Error toggling like:", err);
      message.error("Failed to update like");
    }
  };

  // Moderation Handlers
  const handleConfirmMute = (uploaderId, firstname) => {
    if (!session) {
      message.warning("Please sign in to moderate content");
      return;
    }
    Modal.confirm({
      title: `Mute ${firstname || "this user"}?`,
      content: "You will no longer see updates from this family member in your milestones feed.",
      okText: "Mute",
      okType: "danger",
      cancelText: "Cancel",
      async onOk() {
        try {
          const { error } = await supabase
            .from("profile_relationship")
            .upsert([
              {
                blocker_id: session.user.id,
                blocked_id: uploaderId,
                relationship_type: "mute",
              },
            ]);
          if (error) throw error;
          message.success(`Muted ${firstname || "user"}`);
          setMilestones((prev) => prev.filter((item) => item.profile_id !== uploaderId));
        } catch (err) {
          console.error("Error muting:", err);
          message.error("Failed to mute user");
        }
      },
    });
  };

  const handleConfirmReport = (milestoneId) => {
    if (!session) {
      message.warning("Please sign in to moderate content");
      return;
    }
    Modal.confirm({
      title: "Report Milestone?",
      content: "Are you sure you want to report this milestone? It will be flagged for moderation and hidden from your feed immediately.",
      okText: "Report",
      okType: "danger",
      cancelText: "Cancel",
      async onOk() {
        try {
          const { error } = await supabase
            .from("report")
            .insert([
              {
                reporter_id: session.user.id,
                target_type: "milestone",
                target_id: milestoneId,
                reason: "reported by user",
              },
            ]);
          if (error) throw error;
          message.success("Milestone reported and hidden");
          setMilestones((prev) => prev.filter((item) => item.id !== milestoneId));
        } catch (err) {
          console.error("Error reporting milestone:", err);
          message.error("Failed to report milestone");
        }
      },
    });
  };

  const handleConfirmDelete = (milestoneId) => {
    if (!session) {
      message.warning("Please sign in to delete content");
      return;
    }
    Modal.confirm({
      title: "Delete Milestone?",
      content: "Are you sure you want to permanently delete this milestone? This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      async onOk() {
        try {
          const { error } = await supabase
            .from("milestone")
            .delete()
            .eq("id", milestoneId);
          if (error) throw error;
          message.success("Milestone deleted");
          setMilestones((prev) => prev.filter((item) => item.id !== milestoneId));
        } catch (err) {
          console.error("Error deleting milestone:", err);
          message.error("Failed to delete milestone");
        }
      },
    });
  };

  const handleHidePost = (milestoneId) => {
    Modal.confirm({
      title: "Hide Milestone?",
      content: "Are you sure you want to hide this specific milestone from your feed? Other family members will still be able to see it.",
      okText: "Hide",
      cancelText: "Cancel",
      onOk() {
        setHiddenPostIds((prev) => {
          const updated = [...prev, milestoneId];
          localStorage.setItem("hidden_milestone_ids", JSON.stringify(updated));
          return updated;
        });
        setMilestones((prev) => prev.filter((item) => item.id !== milestoneId));
        message.success("Milestone hidden from your feed");
      },
    });
  };

  const getModerateMenuItems = (item) => {
    const isOwner = session && session.user.id === item.profile_id;
    const menuItems = [];
    if (isOwner) {
      menuItems.push({
        key: "delete",
        danger: true,
        icon: <DeleteOutlined />,
        label: "Delete Milestone",
        onClick: () => handleConfirmDelete(item.id),
      });
    } else {
      menuItems.push({
        key: "mute",
        icon: <StopOutlined />,
        label: `Mute ${item.profile?.firstname || "User"}`,
        onClick: () => handleConfirmMute(item.profile_id, item.profile?.firstname),
      });
      menuItems.push({
        key: "hide",
        icon: <EyeInvisibleOutlined />,
        label: "Hide Post (Ignore)",
        onClick: () => handleHidePost(item.id),
      });
      menuItems.push({
        key: "report",
        icon: <FlagOutlined />,
        label: "Report Milestone",
        onClick: () => handleConfirmReport(item.id),
      });
    }
    return { items: menuItems };
  };

  const getMilestoneImageSrc = (photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("http")) return photoUrl;
    const { data } = supabase.storage.from("milestones").getPublicUrl(photoUrl);
    return data.publicUrl;
  };

  const getProfileAvatarSrc = (profile) => {
    return getAvatarSrc(profile);
  };

  const formatMilestoneDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return format(d, "MMMM d, yyyy");
  };

  return (
    <div className="milestones-page-container">
      <div className="milestones-header">
        <h1 className="milestones-title">Family Milestones</h1>
        <p className="milestones-subtitle">Bulletins of recent achievements and celebrations</p>
      </div>

      {loading ? (
        <div className="milestones-spinner-wrap">
          <Spin size="large" />
        </div>
      ) : milestones.length === 0 ? (
        <div className="milestones-empty">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: "#EABEA9" }}>No milestones posted yet.</span>}
          />
        </div>
      ) : (
        <div className="milestones-grid">
          {milestones.map((item) => {
            const isLiked = likedMilestoneIds.includes(item.id);
            const avatarSrc = getProfileAvatarSrc(item.profile);
            const formattedDate = formatMilestoneDate(item.event_date);
            const photoSrc = getMilestoneImageSrc(item.photo_url);

            return (
              <Card key={item.id} className="milestone-feed-card" bordered={false}>
                {/* Card Header: Owner Identity */}
                <div className="milestone-card-user-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/profile/${item.profile?.id}`} className="user-link" style={{ flex: 1 }}>
                    <Avatar
                      shape="square"
                      src={avatarSrc}
                      icon={!avatarSrc && <UserOutlined />}
                      size={40}
                      className="user-avatar"
                    />
                    <div className="user-info">
                      <span className="user-name">
                        {item.profile?.firstname} {item.profile?.lastname}
                      </span>
                      <span className="user-tag">{item.category || "FAMILY"}</span>
                    </div>
                  </Link>

                  {/* Moderation Dropdown */}
                  <Dropdown menu={getModerateMenuItems(item)} trigger={['click']} placement="bottomRight">
                    <Button 
                      type="text" 
                      icon={<MoreOutlined style={{ color: '#EABEA9', fontSize: '1.2rem' }} />} 
                      className="mod-trigger-btn"
                    />
                  </Dropdown>
                </div>

                {/* Card Image */}
                {photoSrc && (
                  <div className="milestone-card-img-wrap">
                    <img
                      src={photoSrc}
                      alt={item.title}
                      className="milestone-card-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Card Body */}
                <div className="milestone-card-body">
                  <h3 className="milestone-card-title">{item.title}</h3>
                  
                  <div className="milestone-card-meta">
                    {formattedDate && (
                      <span className="meta-item">
                        <CalendarOutlined /> {formattedDate}
                      </span>
                    )}
                    {item.location_text && (
                      <span className="meta-item">
                        <EnvironmentOutlined /> {item.location_text}
                      </span>
                    )}
                  </div>

                  {item.notes && <p className="milestone-card-notes">{item.notes}</p>}
                </div>

                {/* Card Actions Footer */}
                <div className="milestone-card-actions">
                  <button
                    onClick={() => handleMilestoneLikeToggle(item.id)}
                    className={`timeline-like-btn ${isLiked ? "liked" : ""}`}
                    title={isLiked ? "Unlike milestone" : "Like milestone"}
                  >
                    {isLiked ? <HeartFilled /> : <HeartOutlined />}
                    <span>{item.likes_count || 0}</span>
                  </button>
                  <Link to={`/profile/${item.profile?.id}`} className="view-profile-link">
                    View Profile &rarr;
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentMilestonesPage;
