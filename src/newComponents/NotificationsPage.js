import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, Spin, Empty, message } from "antd";
import {
  UserOutlined,
  HeartFilled,
  MessageFilled,
  CheckOutlined,
  BellOutlined,
} from "@ant-design/icons";
import { formatDistanceToNow } from "date-fns";
import AuthConsumer from "../useSession";
import { supabase } from "../supabaseClient";
import "./NotificationsPage.css";

const NotificationsPage = () => {
  const { session } = AuthConsumer();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notification")
        .select(`
          id,
          action_type,
          target_id,
          is_read,
          created_at,
          actor:actor_id (id, firstname, lastname, avatar_url)
        `)
        .eq("recipient_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      message.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchNotifications();

    if (session) {
      // Subscribe to real-time notification changes
      const channel = supabase
        .channel(`notifications-page-${session.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notification",
            filter: `recipient_id=eq.${session.user.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session, fetchNotifications]);

  const getNotificationText = (actionType) => {
    switch (actionType) {
      case "like_milestone":
        return "liked your milestone event.";
      case "like_media":
        return "liked your uploaded media.";
      case "comment_media":
        return "commented on your media upload.";
      case "new_guestbook_post":
        return "left a new note in your Guestbook.";
      case "like_guestbook_post":
        return "liked your Guestbook note.";
      default:
        return "interacted with your profile.";
    }
  };

  const getNotificationIcon = (actionType) => {
    if (actionType.startsWith("like_")) {
      return <HeartFilled style={{ color: "#ff4d4f" }} />;
    }
    return <MessageFilled style={{ color: "#F7DC92" }} />;
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        const { error } = await supabase
          .from("notification")
          .update({ is_read: true })
          .eq("id", notif.id);
        if (error) throw error;
      }

      // Determine where to navigate based on action_type
      let drawer = "";
      if (notif.action_type.includes("milestone")) {
        drawer = "milestones";
      } else if (notif.action_type.includes("guestbook")) {
        drawer = "guestbook";
      } else if (notif.action_type.includes("media")) {
        drawer = "media";
      }

      navigate(`/profile/${session.user.id}?drawer=${drawer}`);
    } catch (err) {
      console.error("Error updating notification status:", err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!session || notifications.length === 0) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) {
      message.info("All notifications are already marked as read");
      return;
    }

    try {
      const { error } = await supabase
        .from("notification")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      message.success("All notifications marked as read");
    } catch (err) {
      console.error("Error marking all read:", err);
      message.error("Failed to mark all notifications as read");
    }
  };

  const getActorAvatarSrc = (actor) => {
    if (!actor?.avatar_url) return null;
    if (actor.avatar_url.startsWith("http")) return actor.avatar_url;
    return `${supabase.supabaseUrl}/storage/v1/object/public/avatars/${actor.avatar_url}`;
  };

  if (!session) {
    return (
      <div className="notif-page-container">
        {/* Header content removed to clean up guest view */}
        <div className="notif-card" style={{ textAlign: "center", padding: "40px" }}>
          <BellOutlined style={{ fontSize: "3rem", color: "#EABEA9", opacity: 0.5, marginBottom: "16px" }} />
          <h2 style={{ color: "#fff" }}>Sign In Required</h2>
          <p style={{ color: "#EABEA9", opacity: 0.8, marginBottom: "20px" }}>
            Please sign in to view your personalized notification inbox.
          </p>
          <Button type="primary" onClick={() => navigate("/register")} style={{ backgroundColor: "#F7DC92", color: "#873D62", border: "none" }}>
            Sign In / Register
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="notif-page-container">
      <div className="notif-header">
        <h1 className="notif-title">Notifications Inbox</h1>
        {notifications.some((n) => !n.is_read) && (
          <Button
            type="text"
            icon={<CheckOutlined />}
            onClick={handleMarkAllRead}
            className="mark-read-btn"
          >
            Mark all as read
          </Button>
        )}
      </div>

      <div className="notif-list-container">
        {loading ? (
          <div className="notif-spinner-wrap">
            <Spin size="large" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-card">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<span style={{ color: "#EABEA9" }}>Your inbox is empty. No new notifications!</span>}
            />
          </div>
        ) : (
          <div className="notif-cards-list">
            {notifications.map((notif) => {
              const actorName = notif.actor
                ? `${notif.actor.firstname} ${notif.actor.lastname}`
                : "A family member";
              const avatarSrc = getActorAvatarSrc(notif.actor);

              return (
                <div
                  key={notif.id}
                  className={`notif-card-item ${notif.is_read ? "read" : "unread"}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notif-card-left">
                    <Avatar
                      shape="square"
                      src={avatarSrc}
                      icon={!avatarSrc && <UserOutlined />}
                      size={44}
                      className="notif-avatar"
                    />
                    <div className="notif-body">
                      <p className="notif-message">
                        <strong style={{ color: "#fff" }}>{actorName}</strong>{" "}
                        {getNotificationText(notif.action_type)}
                      </p>
                      <span className="notif-timestamp">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="notif-card-right">
                    <span className="notif-action-icon">
                      {getNotificationIcon(notif.action_type)}
                    </span>
                    {!notif.is_read && <span className="unread-dot-badge" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
