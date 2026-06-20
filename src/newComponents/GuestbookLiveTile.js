import { useEffect, useState, useCallback } from "react";
import { Avatar } from "antd";
import {
  UserOutlined,
  MessageOutlined,
  HeartFilled,
  EnvironmentOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { formatDistanceToNow } from "date-fns";

/**
 * GuestbookLiveTile
 * A Windows 8 / Windows Phone inspired live tile for the Guestbook drawer.
 * Rotates through multiple faces showing guestbook activity, messages, stats,
 * and social signals — all in a compact square format.
 *
 * Props:
 *   posts          — array of guestbook posts (newest first)
 *   profileName    — first name of the profile owner (for personalization)
 *   getAvatarSrc   — function(profile) => avatar URL
 *   activeDrawer   — null when collapsed, string when any drawer is open
 */
export default function GuestbookLiveTile({
  posts,
  profileName,
  getAvatarSrc,
  activeDrawer,
}) {
  const [faces, setFaces] = useState([]);
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [nextFaceIndex, setNextFaceIndex] = useState(null);
  const [transition, setTransition] = useState(null);
  const [animating, setAnimating] = useState(false);

  // ─── Helpers ─────────────────────────────────────────────────────────

  const truncate = useCallback((str, len) => {
    if (!str) return "";
    return str.length > len ? str.slice(0, len - 1) + "…" : str;
  }, []);

  const isWithinDays = useCallback((dateStr, days) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
  }, []);

  // ─── Face Renderers ──────────────────────────────────────────────────

  const renderEmptyFace = useCallback(() => {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          padding: "0.75rem 1rem",
          gap: "0.5rem",
          textAlign: "center",
        }}
      >
        <MessageOutlined
          style={{ fontSize: "2rem", color: "#EABEA9", opacity: 0.5 }}
        />
        <span
          style={{
            fontSize: "0.9rem",
            color: "#f3e7b1",
            fontWeight: 600,
          }}
        >
          No notes yet
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            color: "#EABEA9",
            opacity: 0.8,
          }}
        >
          Tap to leave the first note
        </span>
      </div>
    );
  }, []);

  // Face 1: Outlook-style — big count + app icon + sender preview
  const renderCountFace = useCallback(() => {
    const count = posts.length;
    const latest = posts[0];

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          padding: "0.75rem 1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <MessageOutlined
            style={{ fontSize: "1.6rem", color: "#EABEA9", opacity: 0.85 }}
          />
          <span
            style={{
              fontSize: "2.4rem",
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1,
              letterSpacing: "-0.05rem",
            }}
          >
            {count}
          </span>
        </div>

        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#EABEA9",
              textTransform: "uppercase",
              letterSpacing: "0.06rem",
              marginBottom: "0.25rem",
            }}
          >
            {count === 1 ? "1 note" : `${count} notes`}
          </div>
          {latest && (
            <div
              style={{
                fontSize: "0.85rem",
                color: "#f3e7b1",
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {latest.author?.firstname}: "{truncate(latest.content, 28)}"
            </div>
          )}
        </div>
      </div>
    );
  }, [posts, truncate]);

  // Face 2: Facebook-style notification — social action snippet
  const renderInteractionFace = useCallback(() => {
    // Find the most-liked post
    const mostLiked = [...posts].sort(
      (a, b) => (b.likes_count || 0) - (a.likes_count || 0)
    )[0];
    if (!mostLiked || (mostLiked.likes_count || 0) === 0) {
      return renderEmptyFace();
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          height: "100%",
          padding: "0.75rem 1rem",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <HeartFilled style={{ fontSize: "1.2rem", color: "#F7DC92" }} />
          <span
            style={{
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#fff",
            }}
          >
            {mostLiked.likes_count}
          </span>
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            color: "#f3e7b1",
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          likes on{" "}
          <span style={{ color: "#EABEA9" }}>
            {mostLiked.author?.firstname}&apos;s
          </span>{" "}
          note
        </div>
        <div
          style={{
            fontSize: "0.75rem",
            color: "#EABEA9",
            fontStyle: "italic",
            opacity: 0.8,
          }}
        >
          &ldquo;{truncate(mostLiked.content, 36)}&rdquo;
        </div>
      </div>
    );
  }, [posts, renderEmptyFace, truncate]);

  // Face 3: Message preview — full snippet like the Facebook tile
  const renderMessageFace = useCallback((index = 0) => {
    const post = posts[index] || posts[0];
    if (!post) return renderEmptyFace();

    const avatarSrc = getAvatarSrc ? getAvatarSrc(post.author) : null;
    const timeAgo = post.created_at
      ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
      : "";

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          padding: "0.75rem 1rem",
        }}
      >
        {/* Top: sender info row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Avatar
            size={28}
            src={avatarSrc}
            icon={!avatarSrc && <UserOutlined />}
            style={{
              border: "1px solid rgba(234,190,169,0.3)",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#f3e7b1",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {post.author?.firstname} {post.author?.lastname}
            </div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "#EABEA9",
                opacity: 0.7,
              }}
            >
              {timeAgo}
            </div>
          </div>
        </div>

        {/* Message body — the star of the show */}
        <div
          style={{
            fontSize: "0.9rem",
            color: "#fff",
            lineHeight: 1.4,
            marginTop: "0.5rem",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {post.content}
        </div>

        {/* Bottom: subtle metadata chips */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "auto",
            paddingTop: "0.5rem",
          }}
        >
          {post.location && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "#EABEA9",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <EnvironmentOutlined style={{ fontSize: "0.65rem" }} />
              {truncate(post.location, 18)}
            </span>
          )}
          {post.event_date && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "#EABEA9",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <CalendarOutlined style={{ fontSize: "0.65rem" }} />
              {new Date(post.event_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {(post.likes_count || 0) > 0 && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "#F7DC92",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                marginLeft: "auto",
              }}
            >
              <HeartFilled style={{ fontSize: "0.65rem" }} />
              {post.likes_count}
            </span>
          )}
        </div>
      </div>
    );
  }, [getAvatarSrc, posts, renderEmptyFace, truncate]);

  // Face 4: Activity Pulse — multiple recent posters, Google Mail style
  const renderPulseFace = useCallback(() => {
    const recentPosts = posts.filter((p) => isWithinDays(p.created_at, 30));
    const uniqueAuthors = [];
    const seen = new Set();
    for (const p of recentPosts) {
      if (!seen.has(p.author?.id)) {
        seen.add(p.author?.id);
        uniqueAuthors.push(p);
      }
    }
    const displayAuthors = uniqueAuthors.slice(0, 3);

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          padding: "0.75rem 1rem",
        }}
      >
        {/* Top: eyebrow + count */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              color: "#EABEA9",
              textTransform: "uppercase",
              letterSpacing: "0.06rem",
            }}
          >
            Recent Activity
          </span>
          <span
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "#fff",
            }}
          >
            {recentPosts.length}
          </span>
        </div>

        {/* Center: overlapping avatars like a notification stack */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "0.5rem",
          }}
        >
          {displayAuthors.map((p, i) => {
            const src = getAvatarSrc ? getAvatarSrc(p.author) : null;
            return (
              <Avatar
                key={p.author?.id || i}
                size={36}
                src={src}
                icon={!src && <UserOutlined />}
                style={{
                  border: "2px solid #4a1934",
                  marginLeft: i > 0 ? "-0.75rem" : 0,
                  zIndex: displayAuthors.length - i,
                  flexShrink: 0,
                }}
              />
            );
          })}
          {uniqueAuthors.length > 3 && (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(247,220,146,0.2)",
                border: "2px solid #4a1934",
                marginLeft: "-0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#F7DC92",
                zIndex: 0,
              }}
            >
              +{uniqueAuthors.length - 3}
            </div>
          )}
        </div>

        {/* Bottom: names + new notes label */}
        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              fontSize: "0.85rem",
              color: "#f3e7b1",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayAuthors.map((a) => a.author?.firstname).join(", ")}
            {uniqueAuthors.length > 3 && " & more"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "#EABEA9",
              opacity: 0.8,
            }}
          >
            {recentPosts.length} new {recentPosts.length === 1 ? "note" : "notes"} this month
          </div>
        </div>
      </div>
    );
  }, [getAvatarSrc, posts, isWithinDays]);

  // Face 5: Nostalgia Moment — "Remembering" date-stamped posts
  const renderNostalgiaFace = useCallback(() => {
    const nostalgiaPosts = posts.filter((p) => p.event_date);
    const pick = nostalgiaPosts[0];
    if (!pick) return renderMessageFace(0);

    const avatarSrc = getAvatarSrc ? getAvatarSrc(pick.author) : null;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          padding: "0.75rem 1rem",
        }}
      >
        {/* Top: calendar icon + date badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <CalendarOutlined
            style={{ fontSize: "1.1rem", color: "#F7DC92", opacity: 0.9 }}
          />
          <span
            style={{
              fontSize: "0.75rem",
              color: "#EABEA9",
              textTransform: "uppercase",
              letterSpacing: "0.06rem",
            }}
          >
            Remembering
          </span>
        </div>

        {/* Date as big number */}
        <div style={{ marginTop: "0.25rem" }}>
          <span
            style={{
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.1,
            }}
          >
            {new Date(pick.event_date).toLocaleDateString("en-US", {
              month: "short",
            })}{" "}
            {new Date(pick.event_date).getDate()}
          </span>
          <span
            style={{
              fontSize: "0.85rem",
              color: "#EABEA9",
              marginLeft: "0.5rem",
            }}
          >
            {new Date(pick.event_date).getFullYear()}
          </span>
        </div>

        {/* Snippet */}
        <div
          style={{
            fontSize: "0.85rem",
            color: "#f3e7b1",
            fontStyle: "italic",
            lineHeight: 1.4,
            marginTop: "0.5rem",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          &ldquo;{truncate(pick.content, 42)}&rdquo;
        </div>

        {/* Author micro */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginTop: "auto",
            paddingTop: "0.5rem",
          }}
        >
          <Avatar
            size={20}
            src={avatarSrc}
            icon={!avatarSrc && <UserOutlined />}
            style={{ border: "1px solid rgba(234,190,169,0.2)" }}
          />
          <span style={{ fontSize: "0.75rem", color: "#EABEA9" }}>
            — {pick.author?.firstname}
          </span>
        </div>
      </div>
    );
  }, [getAvatarSrc, posts, renderMessageFace, truncate]);

  // Face 6: Mention Spotlight — "You were mentioned"
  const renderMentionFace = useCallback(() => {
    // For the live tile, we don't have a separate mentions array.
    // We simulate by showing a post that has tagged_profiles (mentions).
    const mentionPosts = posts.filter(
      (p) => p.tagged_profiles && p.tagged_profiles.length > 0
    );
    const pick = mentionPosts[0];
    if (!pick) return renderMessageFace(0);

    const avatarSrc = getAvatarSrc ? getAvatarSrc(pick.author) : null;

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          height: "100%",
          padding: "0.75rem 1rem",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Avatar
            size={32}
            src={avatarSrc}
            icon={!avatarSrc && <UserOutlined />}
            style={{ border: "1px solid rgba(234,190,169,0.3)" }}
          />
          <span
            style={{
              fontSize: "0.85rem",
              color: "#f3e7b1",
              fontWeight: 700,
            }}
          >
            {pick.author?.firstname} mentioned {profileName || "you"}
          </span>
        </div>
        <div
          style={{
            fontSize: "0.85rem",
            color: "#fff",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            paddingLeft: "2.5rem",
          }}
        >
          &ldquo;{truncate(pick.content, 50)}&rdquo;
        </div>
      </div>
    );
  }, [getAvatarSrc, posts, profileName, renderMessageFace, truncate]);

  // ─── Compile Faces ───────────────────────────────────────────────────

  useEffect(() => {
    const pool = [];

    if (posts.length === 0) {
      pool.push({ type: "empty", render: () => renderEmptyFace() });
    } else {
      // 1. Count face (Outlook style) — always present if posts exist
      pool.push({ type: "count", render: () => renderCountFace() });

      // 2. Message preview faces — rotate through recent messages
      // Show up to 3 most recent messages as individual faces
      const messageCount = Math.min(posts.length, 3);
      for (let i = 0; i < messageCount; i++) {
        pool.push({
          type: "message",
          index: i,
          render: () => renderMessageFace(i),
        });
      }

      // 3. Interaction face (most liked) — only if there's a liked post
      const hasLikes = posts.some((p) => (p.likes_count || 0) > 0);
      if (hasLikes) {
        pool.push({ type: "interaction", render: () => renderInteractionFace() });
      }

      // 4. Activity pulse — only if 2+ posts in last 30 days
      const recentPosts = posts.filter((p) => isWithinDays(p.created_at, 30));
      if (recentPosts.length >= 2) {
        pool.push({ type: "pulse", render: () => renderPulseFace() });
      }

      // 5. Nostalgia — only if event_date posts exist
      const nostalgiaPosts = posts.filter((p) => p.event_date);
      if (nostalgiaPosts.length > 0) {
        pool.push({ type: "nostalgia", render: () => renderNostalgiaFace() });
      }

      // 6. Mention spotlight — only if posts with tagged_profiles exist
      const mentionPosts = posts.filter(
        (p) => p.tagged_profiles && p.tagged_profiles.length > 0
      );
      if (mentionPosts.length > 0) {
        pool.push({ type: "mention", render: () => renderMentionFace() });
      }
    }

    setFaces(pool);
    setCurrentFaceIndex(0);
    setNextFaceIndex(null);
    setTransition(null);
    setAnimating(false);
  }, [posts, profileName, renderCountFace, renderEmptyFace, renderInteractionFace, renderMentionFace, renderMessageFace, renderNostalgiaFace, renderPulseFace, isWithinDays]);

  // ─── Scheduler ───────────────────────────────────────────────────────

  useEffect(() => {
    if (activeDrawer !== null || faces.length <= 1) return;

    let timer;
    const tick = () => {
      const nextIndex = (currentFaceIndex + 1) % faces.length;

      // Guestbook tile uses gentler transitions — it's social content, not hard data
      const animations = ["fade", "slideUp", "slideLeft"];
      const randAnim = animations[Math.floor(Math.random() * animations.length)];

      setNextFaceIndex(nextIndex);
      setTransition(randAnim);
      setAnimating(true);

      const animDuration = 800;

      setTimeout(() => {
        setCurrentFaceIndex(nextIndex);
        setNextFaceIndex(null);
        setTransition(null);
        setAnimating(false);

        // Slower rotation for guestbook — 4 to 7 seconds feels right for reading snippets
        const nextDelay = Math.random() * 3000 + 4000;
        timer = setTimeout(tick, nextDelay);
      }, animDuration);
    };

    const startupDelay = Math.random() * 2000 + 1500;
    timer = setTimeout(tick, startupDelay);

    return () => clearTimeout(timer);
  }, [faces, activeDrawer, currentFaceIndex]);

  if (faces.length === 0) return null;

  const currentFace = faces[currentFaceIndex];
  const nextFace = nextFaceIndex !== null ? faces[nextFaceIndex] : null;

  return (
    <div className="live-tile-container">
      <div
        className={`tile-face active ${animating ? `${transition}-out` : ""}`}
      >
        {currentFace.render()}
      </div>
      {nextFace && (
        <div
          className={`tile-face incoming ${animating ? `${transition}-in` : ""}`}
        >
          {nextFace.render()}
        </div>
      )}
    </div>
  );
}
