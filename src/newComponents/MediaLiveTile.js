import { useEffect, useState, useCallback } from "react";
import { CameraOutlined } from "@ant-design/icons";

/**
 * MediaLiveTile
 * A Windows 8 / Phone inspired live tile for the Media Gallery drawer.
 * Rotates through stats, upload prompts, and actual family photos.
 */
export default function MediaLiveTile({
  mediaItems = [],
  getMediaImageSrc,
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
          width: "100%",
          padding: "0.75rem 1rem",
          gap: "0.4rem",
          textAlign: "center",
        }}
      >
        <CameraOutlined
          style={{ fontSize: "2rem", color: "#EABEA9", opacity: 0.5 }}
        />
        <span
          style={{
            fontSize: "0.9rem",
            color: "#f3e7b1",
            fontWeight: 600,
          }}
        >
          Media Gallery
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            color: "#EABEA9",
            opacity: 0.85,
          }}
        >
          Tap to upload historic photos & memories
        </span>
      </div>
    );
  }, []);

  // Face 1: Total Count + Subtitle
  const renderCountFace = useCallback(() => {
    const count = mediaItems.length;
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          width: "100%",
          padding: "0.75rem 1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <CameraOutlined
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
            {count === 1 ? "1 memory photo" : `${count} memory photos`}
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: "#f3e7b1",
              fontWeight: 600,
            }}
          >
            Browse Family Album
          </div>
        </div>
      </div>
    );
  }, [mediaItems.length]);

  // Face 2: Spotlight Image
  const renderPhotoFace = useCallback((index) => {
    const item = mediaItems[index];
    if (!item || !item.file_path || !getMediaImageSrc) return renderEmptyFace();

    const imgSrc = getMediaImageSrc(item.file_path);

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.7)), url(${imgSrc})`,
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
          Memory Spotlight
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
          {item.caption || "Family Photo"}
        </h3>
        {item.decade && (
          <span
            style={{
              fontSize: "0.65rem",
              color: "#d4af37",
              fontWeight: "bold",
              marginTop: "0.125rem",
            }}
          >
            {item.decade}
          </span>
        )}
      </div>
    );
  }, [mediaItems, getMediaImageSrc, renderEmptyFace]);

  // ─── Compile Faces ───────────────────────────────────────────────────

  useEffect(() => {
    const pool = [];

    if (!mediaItems || mediaItems.length === 0) {
      pool.push({ type: "empty", render: () => renderEmptyFace() });
    } else {
      // 1. General count summary face
      pool.push({ type: "count", render: () => renderCountFace() });

      // 2. Photo spotlight faces (rotate up to 3 recent media items)
      const spotlightCount = Math.min(mediaItems.length, 3);
      for (let i = 0; i < spotlightCount; i++) {
        pool.push({
          type: "photo",
          index: i,
          render: () => renderPhotoFace(i),
        });
      }
    }

    setFaces(pool);
    setCurrentFaceIndex(0);
    setNextFaceIndex(null);
    setTransition(null);
    setAnimating(false);
  }, [mediaItems, renderCountFace, renderEmptyFace, renderPhotoFace]);

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

        // Rotation timer: 5 to 9 seconds delay between shifts
        const nextDelay = Math.random() * 4000 + 5000;
        timer = setTimeout(tick, nextDelay);
      }, animDuration);
    };

    const startupDelay = Math.random() * 2000 + 2000;
    timer = setTimeout(tick, startupDelay);

    return () => clearTimeout(timer);
  }, [faces, activeDrawer, currentFaceIndex]);

  if (faces.length === 0) return null;

  const currentFace = faces[currentFaceIndex];
  const nextFace = nextFaceIndex !== null ? faces[nextFaceIndex] : null;

  return (
    <div className="live-tile-container">
      <div
        className={`tile-face active ${currentFace.type === "photo" ? "no-padding" : ""} ${animating ? `${transition}-out` : ""}`}
      >
        {currentFace.render()}
      </div>
      {nextFace && (
        <div
          className={`tile-face incoming ${nextFace.type === "photo" ? "no-padding" : ""} ${animating ? `${transition}-in` : ""}`}
        >
          {nextFace.render()}
        </div>
      )}
    </div>
  );
}
