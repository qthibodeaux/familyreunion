import { useState, useEffect } from "react";
import { Avatar, message, Tag } from "antd";
import {
  HeartOutlined,
  HeartFilled,
  FlagOutlined,
  DeleteOutlined,
  MessageOutlined,
  UserOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "../supabaseClient";

/**
 * GuestbookPostCard
 * Renders a single guestbook post with author info, content bubble,
 * metadata chips, and action row (like, reply, report, delete).
 */
export default function GuestbookPostCard({
  post,
  currentUserId,
  profileId, // The ID of the person whose wall this is
  onDelete,
  onReport,
  onLikeToggle,
  onUpdateBroadcast,
  getAvatarSrc,
  getProfileLink,
  liked: initialLiked = false,
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [reporting, setReporting] = useState(false);
  const [isBroadcast, setIsBroadcast] = useState(post.is_broadcast);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setIsBroadcast(post.is_broadcast);
  }, [post.is_broadcast]);

  const [taggedProfilesData, setTaggedProfilesData] = useState([]);

  useEffect(() => {
    if (post.tagged_profiles && post.tagged_profiles.length > 0) {
      const fetchTagged = async () => {
        try {
          const { data, error } = await supabase
            .from("profile")
            .select("id, firstname, lastname, branch")
            .in("id", post.tagged_profiles);
          if (!error && data) {
            setTaggedProfilesData(data);
          }
        } catch (err) {
          console.warn("Error fetching tagged profiles:", err);
        }
      };
      fetchTagged();
    } else {
      setTaggedProfilesData([]);
    }
  }, [post.tagged_profiles]);

  const isAuthor = currentUserId === post.author?.id;
  const isWallOwner = currentUserId === profileId;
  const canDelete = isAuthor || isWallOwner;
  const canManageBroadcast = isAuthor || isWallOwner;
  const canReport = currentUserId && !isAuthor;
  const canLike = !!currentUserId;

  const handleToggleBroadcast = async () => {
    if (!canManageBroadcast) return;
    const nextState = !isBroadcast;
    setIsBroadcast(nextState);
    try {
      const { error } = await supabase
        .from("guestbook_post")
        .update({ is_broadcast: nextState })
        .eq("id", post.id);
      if (error) throw error;
      message.success(nextState ? "Post is now broadcasted to the family feed" : "Post hidden from family feed");
      if (onUpdateBroadcast) onUpdateBroadcast(post.id, nextState);
    } catch (err) {
      setIsBroadcast(!nextState);
      message.error("Failed to update broadcast status");
    }
  };

  const handleLike = async () => {
    if (!canLike) return;
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
    setLiked(newLiked);
    setLikeCount(newCount);

    // Optimistic update — call parent handler for Supabase update
    if (onLikeToggle) {
      onLikeToggle(post.id, newLiked, newCount);
    }
  };

  const handleReport = async () => {
    if (!canReport) return;
    setReporting(true);
    try {
      if (onReport) {
        await onReport(post.id);
      }
      message.success("Post reported. Thank you for keeping the community safe.");
    } catch (err) {
      message.error("Failed to report post.");
    } finally {
      setReporting(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    if (onDelete) {
      await onDelete(post.id);
    }
  };

  // Format relative timestamp
  const timeAgo = post.created_at
    ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
    : "";

  // Author initials for Avatar fallback
  const authorInitials = `${post.author?.firstname?.[0] || ""}${post.author?.lastname?.[0] || ""}`.toUpperCase();

  // Render @mentions as highlighted clickable text
  const renderContent = (text) => {
    if (!text) return null;
    if (!taggedProfilesData || taggedProfilesData.length === 0) return text;

    // Sort tagged profiles by full name length descending to prevent partial matches
    const sortedTags = [...taggedProfilesData].sort((a, b) => {
      const nameA = `${a.firstname} ${a.lastname}`;
      const nameB = `${b.firstname} ${b.lastname}`;
      return nameB.length - nameA.length;
    });

    let parts = [text];

    sortedTags.forEach((profile) => {
      const name = `${profile.firstname} ${profile.lastname}`;
      const mentionStr = `@${name}`;
      const newParts = [];

      parts.forEach((part) => {
        if (typeof part !== "string") {
          newParts.push(part);
          return;
        }

        const index = part.indexOf(mentionStr);
        if (index !== -1) {
          let currentStr = part;
          let idx = 0;
          while (true) {
            const foundIdx = currentStr.indexOf(mentionStr);
            if (foundIdx === -1) {
              if (currentStr) newParts.push(currentStr);
              break;
            }
            if (foundIdx > 0) {
              newParts.push(currentStr.substring(0, foundIdx));
            }
            newParts.push(
              <Link
                key={`${profile.id}-${idx++}`}
                to={getProfileLink ? getProfileLink(profile) : `/profile/${profile.id}`}
                style={{
                  color: "#EABEA9",
                  fontWeight: "bold",
                  textDecoration: "none",
                }}
                className="guestbook-mention-link"
              >
                {mentionStr}
              </Link>
            );
            currentStr = currentStr.substring(foundIdx + mentionStr.length);
          }
        } else {
          newParts.push(part);
        }
      });

      parts = newParts;
    });

    return parts;
  };

  return (
    <div
      className="guestbook-post-card"
      style={{
        background: "rgba(255,255,255,0.05)",
        padding: "14px 16px",
        borderRadius: "12px",
        border: "1px solid rgba(234,190,169,0.1)",
        marginBottom: "12px",
      }}
    >
      {/* Author Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <Link to={getProfileLink(post.author) || "#"}>
          <Avatar
            size="small"
            src={getAvatarSrc ? getAvatarSrc(post.author) : null}
            icon={<UserOutlined />}
            style={{ border: "1px solid rgba(234,190,169,0.3)" }}
          >
            {authorInitials}
          </Avatar>
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            to={getProfileLink(post.author) || "#"}
            style={{
              color: "#f3e7b1",
              fontWeight: 700,
              fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            {post.author?.firstname} {post.author?.lastname}
          </Link>
        </div>
        <span
          style={{
            fontSize: "0.75rem",
            color: "#EABEA9",
            opacity: 0.7,
            flexShrink: 0,
          }}
        >
          {timeAgo}
        </span>
      </div>

      {/* Content Bubble */}
      <div
        style={{
          position: "relative",
          marginLeft: "4px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            borderLeft: "3px solid #EABEA9",
            paddingLeft: "12px",
            background: "rgba(78, 18, 55, 0.3)",
            borderRadius: "0 8px 8px 0",
            padding: "10px 12px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.95rem",
              color: "#fff",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {renderContent(post.content)}
          </p>
          {isBroadcast && (
            <Tag 
              color="gold" 
              style={{ 
                marginTop: "8px", 
                fontSize: "0.65rem", 
                background: "rgba(247, 220, 146, 0.1)", 
                borderColor: "rgba(247, 220, 146, 0.3)",
                color: "#F7DC92",
                display: "inline-block"
              }}
            >
              Public Broadcast
            </Tag>
          )}
        </div>
      </div>

      {/* Metadata Row */}
      {(post.location || post.event_date) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "10px",
            fontSize: "0.8rem",
            color: "#EABEA9",
            opacity: 0.85,
          }}
        >
          {post.location && (
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <EnvironmentOutlined style={{ fontSize: "0.75rem" }} />
              {post.location}
            </span>
          )}
          {post.location && post.event_date && (
            <span style={{ opacity: 0.4 }}>·</span>
          )}
          {post.event_date && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontStyle: "italic",
              }}
            >
              <CalendarOutlined style={{ fontSize: "0.75rem" }} />
              Remembering: {new Date(post.event_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      )}

      {/* Action Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          fontSize: "0.85rem",
        }}
      >
        {/* Like */}
        <button
          onClick={handleLike}
          disabled={!canLike}
          style={{
            background: "none",
            border: "none",
            cursor: canLike ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: liked ? "#F7DC92" : "#EABEA9",
            padding: "2px 0",
            fontSize: "0.85rem",
            transition: "color 0.15s ease",
            opacity: canLike ? 1 : 0.5,
          }}
        >
          {liked ? <HeartFilled /> : <HeartOutlined />}
          <span>{likeCount}</span>
        </button>

        {/* Visibility/Broadcast Toggle */}
        {canManageBroadcast && (
          <button
            onClick={handleToggleBroadcast}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: isBroadcast ? "#F7DC92" : "#EABEA9",
              padding: "2px 0",
              fontSize: "0.85rem",
              transition: "color 0.15s ease",
            }}
            title={isBroadcast ? "Publicly broadcasted. Click to hide from feed." : "Private note. Click to broadcast to feed."}
          >
            {isBroadcast ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            <span>{isBroadcast ? "Public" : "Private"}</span>
          </button>
        )}

        {/* Reply (placeholder) */}
        <button
          onClick={() => message.info("Replies coming soon!")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: "#EABEA9",
            padding: "2px 0",
            fontSize: "0.85rem",
            transition: "color 0.15s ease",
          }}
        >
          <MessageOutlined />
          <span>Reply</span>
        </button>

        {/* Report */}
        {canReport && (
          <button
            onClick={handleReport}
            disabled={reporting}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#EABEA9",
              padding: "2px 0",
              fontSize: "0.85rem",
              transition: "color 0.15s ease",
              marginLeft: "auto",
            }}
          >
            <FlagOutlined />
            <span>{reporting ? "Reporting..." : "Report"}</span>
          </button>
        )}

        {/* Delete */}
        {canDelete && (
          <button
            onClick={handleDelete}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#ff7875",
              padding: "2px 0",
              fontSize: "0.85rem",
              transition: "color 0.15s ease",
              marginLeft: canReport ? "0" : "auto",
            }}
          >
            <DeleteOutlined />
            <span>Delete</span>
          </button>
        )}
      </div>
    </div>
  );
}
