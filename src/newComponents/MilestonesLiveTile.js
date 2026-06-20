import { useEffect, useState, useCallback } from "react";
import {
  CalendarOutlined,
  EnvironmentOutlined,
  BookOutlined,
  FlagOutlined,
  HeartOutlined,
  StarOutlined,
  ReadOutlined,
  TrophyOutlined,
  CompassOutlined,
  RocketOutlined,
  AuditOutlined,
} from "@ant-design/icons";

const truncate = (str, len) => {
  if (!str) return "";
  return str.length > len ? str.slice(0, len - 1) + "…" : str;
};

const getCategoryMeta = (category) => {
  switch (category) {
    case "school":
    case "education":
      return {
        icon: <BookOutlined style={{ fontSize: "1.5rem", color: "#F7DC92" }} />,
        label: "School Milestone",
      };
    case "career":
      return {
        icon: <AuditOutlined style={{ fontSize: "1.5rem", color: "#F7DC92" }} />,
        label: "Career Milestone",
      };
    case "sports":
      return {
        icon: <TrophyOutlined style={{ fontSize: "1.5rem", color: "#F7DC92" }} />,
        label: "Sports Milestone",
      };
    case "family":
    case "relationship":
      return {
        icon: <HeartOutlined style={{ fontSize: "1.5rem", color: "#F7DC92" }} />,
        label: "Family Moment",
      };
    case "adventures":
      return {
        icon: <RocketOutlined style={{ fontSize: "1.5rem", color: "#F7DC92" }} />,
        label: "Adventure",
      };
    case "travel":
      return {
        icon: <CompassOutlined style={{ fontSize: "1.5rem", color: "#F7DC92" }} />,
        label: "Travel Milestone",
      };
    case "military":
      return {
        icon: <FlagOutlined style={{ fontSize: "1.5rem", color: "#F7DC92" }} />,
        label: "Military Service",
      };
    case "faith":
      return {
        icon: <StarOutlined style={{ fontSize: "1.5rem", color: "#F7DC92" }} />,
        label: "Faith Milestone",
      };
    default:
      return {
        icon: <ReadOutlined style={{ fontSize: "1.5rem", color: "#F7DC92" }} />,
        label: "Life Event",
      };
  }
};

/**
 * MilestonesLiveTile
 * A Windows 8 / Windows Phone inspired live tile for the Milestones drawer.
 * Rotates through multiple faces showing milestones activity, specific category highlights,
 * stats, and photos — all in a compact layout.
 *
 * Props:
 *   milestones           — array of milestone records (newest first)
 *   profileName          — first name of the profile owner (for personalization)
 *   getMilestoneImageSrc — function(photo_url) => public image URL
 *   activeDrawer         — null when collapsed, string when any drawer is open
 */
export default function MilestonesLiveTile({
  milestones,
  profileName,
  getMilestoneImageSrc,
  activeDrawer,
}) {
  const [faces, setFaces] = useState([]);
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [nextFaceIndex, setNextFaceIndex] = useState(null);
  const [transition, setTransition] = useState(null);
  const [animating, setAnimating] = useState(false);

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
        <CalendarOutlined
          style={{ fontSize: "2rem", color: "#EABEA9", opacity: 0.5 }}
        />
        <span
          style={{
            fontSize: "0.9rem",
            color: "#f3e7b1",
            fontWeight: 600,
          }}
        >
          No milestones yet
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            color: "#EABEA9",
            opacity: 0.8,
          }}
        >
          Tap to add life events and achievements
        </span>
      </div>
    );
  }, []);

  // Face 1: Total Count + Latest Highlight
  const renderCountFace = useCallback(() => {
    const count = milestones.length;
    const latest = milestones[0];
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
          <CalendarOutlined
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
            {count === 1 ? "1 life milestone" : `${count} life milestones`}
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
              Latest: {latest.title}
            </div>
          )}
        </div>
      </div>
    );
  }, [milestones]);

  // Face 2: Spotlight of a specific milestone text event
  const renderMilestoneSpotlightFace = useCallback((index) => {
    const milestone = milestones[index];
    if (!milestone) return renderEmptyFace();

    const { icon, label } = getCategoryMeta(milestone.category);
    const dateStr = milestone.event_date
      ? new Date(milestone.event_date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
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
            {label}
          </span>
          {icon}
        </div>

        <div style={{ marginTop: "0.5rem" }}>
          <h3
            style={{
              fontSize: "1.1rem",
              fontWeight: "700",
              color: "#fff",
              lineHeight: 1.3,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {milestone.title}
          </h3>
          {milestone.notes && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#EABEA9",
                opacity: 0.8,
                margin: "2px 0 0 0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {milestone.notes}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "auto",
            paddingTop: "0.25rem",
          }}
        >
          {dateStr && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "#f3e7b1",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <CalendarOutlined style={{ fontSize: "0.65rem" }} />
              {dateStr}
            </span>
          )}
          {milestone.location_text && (
            <span
              style={{
                fontSize: "0.7rem",
                color: "#EABEA9",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                minWidth: 0,
              }}
            >
              <EnvironmentOutlined style={{ fontSize: "0.65rem" }} />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {truncate(milestone.location_text, 18)}
              </span>
            </span>
          )}
        </div>
      </div>
    );
  }, [milestones, renderEmptyFace]);

  // Face 3: Photo display for milestones with images
  const renderPhotoFace = useCallback((index) => {
    const milestone = milestones[index];
    if (!milestone || !milestone.photo_url) return renderEmptyFace();

    const imgSrc = getMilestoneImageSrc(milestone.photo_url);

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.75)), url(${imgSrc})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "0.75rem 1rem",
        }}
      >
        <span
          style={{
            fontSize: "0.7rem",
            color: "#EABEA9",
            textTransform: "uppercase",
            letterSpacing: "0.06rem",
            opacity: 0.9,
          }}
        >
          Event Photo
        </span>
        <h3
          style={{
            fontSize: "0.95rem",
            fontWeight: "700",
            color: "#fff",
            lineHeight: 1.2,
            margin: "0.125rem 0 0 0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {milestone.title}
        </h3>
        {milestone.event_date && (
          <span
            style={{
              fontSize: "0.65rem",
              color: "#f3e7b1",
              opacity: 0.85,
              marginTop: "0.125rem",
            }}
          >
            {new Date(milestone.event_date).getFullYear()}
          </span>
        )}
      </div>
    );
  }, [getMilestoneImageSrc, milestones, renderEmptyFace]);

  // ─── Compile Faces ───────────────────────────────────────────────────

  useEffect(() => {
    const pool = [];

    if (milestones.length === 0) {
      pool.push({ type: "empty", render: () => renderEmptyFace() });
    } else {
      // 1. General count summary face
      pool.push({ type: "count", render: () => renderCountFace() });

      // 2. Specific event spotlight faces (rotate up to 3 recent milestones)
      const spotlightCount = Math.min(milestones.length, 3);
      for (let i = 0; i < spotlightCount; i++) {
        pool.push({
          type: "spotlight",
          index: i,
          render: () => renderMilestoneSpotlightFace(i),
        });
      }

      // 3. Photo faces (rotate up to 2 recent items containing photo)
      const photoItems = milestones.filter((m) => m.photo_url);
      const photoCount = Math.min(photoItems.length, 2);
      for (let i = 0; i < photoCount; i++) {
        const milestoneIndex = milestones.indexOf(photoItems[i]);
        if (milestoneIndex !== -1) {
          pool.push({
            type: "photo",
            index: milestoneIndex,
            render: () => renderPhotoFace(milestoneIndex),
          });
        }
      }
    }

    setFaces(pool);
    setCurrentFaceIndex(0);
    setNextFaceIndex(null);
    setTransition(null);
    setAnimating(false);
  }, [milestones, renderCountFace, renderEmptyFace, renderMilestoneSpotlightFace, renderPhotoFace]);

  // ─── Scheduler ───────────────────────────────────────────────────────

  useEffect(() => {
    if (activeDrawer !== null || faces.length <= 1) return;

    let timer;
    const tick = () => {
      const nextIndex = (currentFaceIndex + 1) % faces.length;

      // Select randomized animation for the live tile feel
      const animations = ["fade", "slideUp", "slideLeft", "peek", "flipX", "flipY"];
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

        // Rotation timer: 4.5 to 8.5 seconds delay between shifts
        const nextDelay = Math.random() * 4000 + 4500;
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
