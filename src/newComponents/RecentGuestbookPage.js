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
import "./RecentMilestonesPage.css"; // Reuse milestone layout styles

const RecentGuestbookPage = () => {
  const { session } = AuthConsumer();
  const [posts, setPosts] = useState([]);
  const [likedPostIds, setLikedPostIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenPostIds, setHiddenPostIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("hidden_guestbook_ids") || "[]");
    } catch {
      return [];
    }
  });

  const fetchGuestbookData = useCallback(async () => {
    setLoading(true);
    try {
      let blockedUserIds = [];
      let mutedUserIds = [];
      let relativeUserIds = [];

      if (session) {
        // Fetch blocks
        const { data: rels } = await supabase
          .from("profile_relationship")
          .select("blocked_id")
          .eq("blocker_id", session.user.id);
        if (rels) blockedUserIds = rels.map((r) => r.blocked_id);

        // Fetch mutes
        const { data: mutes } = await supabase
          .from("profile_relationship")
          .select("blocked_id")
          .eq("blocker_id", session.user.id)
          .eq("relationship_type", "mute");
        if (mutes) mutedUserIds = mutes.map(m => m.blocked_id);

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

      // Fetch most recent guestbook posts where is_broadcast is true
      const { data: gData, error: gErr } = await supabase
        .from("guestbook_post")
        .select(`
          id,
          author_id,
          profile_id,
          content,
          location,
          event_date,
          likes_count,
          created_at,
          author:author_id (id, firstname, lastname, avatar_url, is_locked)
        `)
        .eq("is_broadcast", true)
        .order("created_at", { ascending: false })
        .limit(40); // Fetch more to allow for filtering

      if (gErr) throw gErr;

      const filtered = (gData || []).filter((item) => {
        const author = item.author;
        if (!author) return false;
        if (blockedUserIds.includes(author.id)) return false;
        if (mutedUserIds.includes(author.id)) return false;
        if (hiddenPostIds.includes(item.id)) return false;

        if (author.is_locked) {
          const isOwn = session && session.user.id === author.id;
          const isRelative = relativeUserIds.includes(author.id);
          if (!isOwn && !isRelative) return false;
        }
        return true;
      });

      setPosts(filtered.slice(0, 20));

      if (session) {
        const { data: lData } = await supabase
          .from("likes")
          .select("target_id")
          .eq("user_id", session.user.id)
          .eq("target_type", "guestbook"); // Or guestbook_post depending on schema
        if (lData) {
          setLikedPostIds(lData.map((l) => l.target_id));
        }
      }
    } catch (err) {
      console.error("Error loading guestbook:", err);
      message.error("Failed to load family guestbook");
    } finally {
      setLoading(false);
    }
  }, [session, hiddenPostIds]);

  useEffect(() => {
    fetchGuestbookData();
  }, [fetchGuestbookData]);

  const handleLikeToggle = async (postId) => {
    if (!session) {
      message.warning("Please sign in to like posts");
      return;
    }
    const isLiked = likedPostIds.includes(postId);
    try {
      if (!isLiked) {
        const { error } = await supabase
          .from("likes")
          .insert([{ user_id: session.user.id, target_type: "guestbook", target_id: postId }]);
        if (error) throw error;
        setLikedPostIds((prev) => [...prev, postId]);
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p));
      } else {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", session.user.id)
          .eq("target_type", "guestbook")
          .eq("target_id", postId);
        if (error) throw error;
        setLikedPostIds((prev) => prev.filter((id) => id !== postId));
        setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: Math.max(0, (p.likes_count || 0) - 1) } : p));
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const handleConfirmMute = (authorId, name) => {
    Modal.confirm({
      title: `Mute ${name}?`,
      content: "You will no longer see posts from this person in the family guestbook.",
      okText: "Mute",
      okType: "danger",
      async onOk() {
        try {
          await supabase.from("profile_relationship").upsert([{ blocker_id: session.user.id, blocked_id: authorId, relationship_type: "mute" }]);
          setPosts(prev => prev.filter(p => p.author_id !== authorId));
          message.success(`Muted ${name}`);
        } catch (err) { message.error("Failed to mute"); }
      }
    });
  };

  const handleConfirmReport = (postId) => {
    Modal.confirm({
      title: "Report Post?",
      content: "Flag this post for moderation? It will be hidden from your feed immediately.",
      okText: "Report",
      okType: "danger",
      async onOk() {
        try {
          await supabase.from("report").insert([{ reporter_id: session.user.id, target_type: "guestbook", target_id: postId, reason: "reported" }]);
          setPosts(prev => prev.filter(p => p.id !== postId));
          message.success("Post reported");
        } catch (err) { message.error("Failed to report"); }
      }
    });
  };

  const handleConfirmDelete = (postId) => {
    Modal.confirm({
      title: "Delete Post?",
      content: "Are you sure you want to delete your post?",
      okText: "Delete",
      okType: "danger",
      async onOk() {
        try {
          await supabase.from("guestbook_post").delete().eq("id", postId);
          setPosts(prev => prev.filter(p => p.id !== postId));
          message.success("Post deleted");
        } catch (err) { message.error("Failed to delete"); }
      }
    });
  };

  const handleHidePost = (postId) => {
    setHiddenPostIds(prev => {
      const updated = [...prev, postId];
      localStorage.setItem("hidden_guestbook_ids", JSON.stringify(updated));
      return updated;
    });
    setPosts(prev => prev.filter(p => p.id !== postId));
    message.success("Post hidden");
  };

  const getModerateMenuItems = (item) => {
    const isOwner = session && session.user.id === item.author_id;
    const menuItems = [];
    if (isOwner) {
      menuItems.push({ key: "delete", danger: true, icon: <DeleteOutlined />, label: "Delete Post", onClick: () => handleConfirmDelete(item.id) });
    } else {
      menuItems.push({ key: "mute", icon: <StopOutlined />, label: `Mute ${item.author?.firstname}`, onClick: () => handleConfirmMute(item.author_id, item.author?.firstname) });
      menuItems.push({ key: "hide", icon: <EyeInvisibleOutlined />, label: "Hide Post", onClick: () => handleHidePost(item.id) });
      menuItems.push({ key: "report", icon: <FlagOutlined />, label: "Report Post", onClick: () => handleConfirmReport(item.id) });
    }
    return { items: menuItems };
  };

  const getProfileAvatarSrc = (profile) => {
    if (!profile?.avatar_url) return null;
    if (profile.avatar_url.startsWith("http")) return profile.avatar_url;
    return `${supabase.supabaseUrl}/storage/v1/object/public/avatars/${profile.avatar_url}`;
  };

  return (
    <div className="milestones-page-container">
      <div className="milestones-header">
        <h1 className="milestones-title">Family Guestbook</h1>
        <p className="milestones-subtitle">Recent messages and well-wishes from across the family</p>
      </div>

      {loading ? (
        <div className="milestones-spinner-wrap"><Spin size="large" /></div>
      ) : posts.length === 0 ? (
        <div className="milestones-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span style={{ color: "#EABEA9" }}>No guestbook posts found.</span>} />
        </div>
      ) : (
        <div className="milestones-grid">
          {posts.map((item) => {
            const isLiked = likedPostIds.includes(item.id);
            const avatarSrc = getProfileAvatarSrc(item.author);
            const formattedDate = item.created_at ? format(new Date(item.created_at), "MMM d, yyyy") : "";

            return (
              <Card key={item.id} className="milestone-feed-card" bordered={false}>
                <div className="milestone-card-user-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/profile/${item.author?.id}`} className="user-link" style={{ flex: 1 }}>
                    <Avatar shape="square" src={avatarSrc} icon={!avatarSrc && <UserOutlined />} size={40} className="user-avatar" />
                    <div className="user-info">
                      <span className="user-name">{item.author?.firstname} {item.author?.lastname}</span>
                      <span className="user-tag">GUESTBOOK</span>
                    </div>
                  </Link>
                  <Dropdown menu={getModerateMenuItems(item)} trigger={['click']} placement="bottomRight">
                    <Button type="text" icon={<MoreOutlined style={{ color: '#EABEA9', fontSize: '1.2rem' }} />} className="mod-trigger-btn" />
                  </Dropdown>
                </div>

                <div className="milestone-card-body">
                  <p className="milestone-card-notes" style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: '8px 0' }}>
                    {item.content}
                  </p>
                  <div className="milestone-card-meta">
                    {formattedDate && <span className="meta-item"><CalendarOutlined /> {formattedDate}</span>}
                    {item.location && <span className="meta-item"><EnvironmentOutlined /> {item.location}</span>}
                  </div>
                </div>

                <div className="milestone-card-actions">
                  <button onClick={() => handleLikeToggle(item.id)} className={`timeline-like-btn ${isLiked ? "liked" : ""}`}>
                    {isLiked ? <HeartFilled /> : <HeartOutlined />}
                    <span>{item.likes_count || 0}</span>
                  </button>
                  <Link to={`/profile/${item.profile_id}`} className="view-profile-link">
                    View Wall &rarr;
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

export default RecentGuestbookPage;
