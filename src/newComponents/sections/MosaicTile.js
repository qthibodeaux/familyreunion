import { useState, useEffect, useRef } from "react";
import "./MosaicTile.css";

const getInitials = (name = "") => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const FALLBACK_COLORS = ["#30041e", "#5b1f40", "#873d62", "#eabea9", "#f3e7b1"];
const getStableColor = (key = "") => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[index];
};

const getContentKey = (content = {}) =>
  [
    content.type,
    content.value,
    content.photoUrl,
    content.bg,
    content.label,
    content.text,
    content.name,
    content.number,
    content.icon,
  ].join("|");

const getPhotoUrl = (content = {}) => content.photoUrl || content.value || "";

const getDisplayName = (content = {}) => content.name || content.label || content.text || "";

const getTileBackground = (content = {}, tileId = "") => {
  if (content.type === "color") return content.bg || content.value || "#5b1f40";
  if (content.bg) return content.bg;
  if (content.type === "label") return "#30041e";
  return getStableColor(getDisplayName(content) || tileId);
};

const getIconGlyph = (icon) => {
  const glyphs = {
    cake: "BD",
    star: "IM",
    branch: "BR",
    tree: "TR",
  };
  return glyphs[icon] || "FR";
};

const MosaicTile = ({ tile }) => {
  const [animClass, setAnimClass] = useState("");
  const [displayContent, setDisplayContent] = useState(tile.content);
  const [displayCropLayout, setDisplayCropLayout] = useState(tile.cropLayout);
  const [imgError, setImgError] = useState(false);
  const prevContentRef = useRef(tile.content);
  const prevTransitionIdRef = useRef(tile.transition?.id);

  // Reset img error when content value changes
  useEffect(() => {
    setImgError(false);
  }, [tile.content]);

  // Watch for content changes from zone updates
  useEffect(() => {
    const prev = prevContentRef.current;
    const curr = tile.content;
    const transId = tile.transition?.id;
    const prevTransId = prevTransitionIdRef.current;

    if (
      getContentKey(curr) !== getContentKey(prev) ||
      (transId && transId !== prevTransId)
    ) {
      const { transition } = tile;
      
      // Slower duration for fade transitions (1000ms), standard for others (400ms)
      const duration = transition?.type === "fade" ? 1000 : (transition?.duration || 400);
      const direction = transition?.direction || "right";
      prevContentRef.current = curr;
      prevTransitionIdRef.current = transId;

      if (transition?.type === "flip") {
        setAnimClass(`flip-transition flip-out-${direction}`);
        
        const halfway = setTimeout(() => {
          setDisplayContent(curr);
          setDisplayCropLayout(tile.cropLayout);
          setAnimClass(`flip-in-${direction}`);
          
          const animateIn = setTimeout(() => {
            setAnimClass(`flip-transition`);
          }, 20);
          
          return () => clearTimeout(animateIn);
        }, duration / 2);

        const end = setTimeout(() => {
          setAnimClass("");
        }, duration);

        return () => {
          clearTimeout(halfway);
          clearTimeout(end);
        };
      } else if (transition?.type === "slide") {
        setAnimClass(`slide-transition slide-out-${direction}`);

        const halfway = setTimeout(() => {
          setDisplayContent(curr);
          setDisplayCropLayout(tile.cropLayout);
          setAnimClass(`slide-in-${direction}`);

          const animateIn = setTimeout(() => {
            setAnimClass(`slide-transition`);
          }, 20);

          return () => clearTimeout(animateIn);
        }, duration / 2);

        const end = setTimeout(() => {
          setAnimClass("");
        }, duration);

        return () => {
          clearTimeout(halfway);
          clearTimeout(end);
        };
      } else if (transition?.type === "fade") {
        setAnimClass("fade-transition fade-out");

        const halfway = setTimeout(() => {
          setDisplayContent(curr);
          setDisplayCropLayout(tile.cropLayout);
          setAnimClass("fade-in");

          const animateIn = setTimeout(() => {
            setAnimClass("fade-transition");
          }, 20);

          return () => clearTimeout(animateIn);
        }, duration / 2);

        const end = setTimeout(() => {
          setAnimClass("");
        }, duration);

        return () => {
          clearTimeout(halfway);
          clearTimeout(end);
        };
      } else if (transition?.type === "scale") {
        setAnimClass("scale-transition scale-out");

        const halfway = setTimeout(() => {
          setDisplayContent(curr);
          setDisplayCropLayout(tile.cropLayout);
          setAnimClass("scale-in");

          const animateIn = setTimeout(() => {
            setAnimClass("scale-transition");
          }, 20);

          return () => clearTimeout(animateIn);
        }, duration / 2);

        const end = setTimeout(() => {
          setAnimClass("");
        }, duration);

        return () => {
          clearTimeout(halfway);
          clearTimeout(end);
        };
      } else {
        setDisplayContent(curr);
        setDisplayCropLayout(tile.cropLayout);
      }

    }
  }, [tile.content, tile.transition, tile.cropLayout, tile.id, tile]);

  const content = displayContent;
  const isImage = content.type === "avatar" || content.type === "profile" || content.type === "slice";
  const isInitials = content.type === "initials" || content.type === "initial";
  const isLabel = content.type === "label";
  const isIcon = content.type === "icon";
  const isStat = content.type === "stat";
  const isSlice = content.type === "slice" && displayCropLayout;
  const photoUrl = getPhotoUrl(content);
  const displayName = getDisplayName(content);

  // Fallback color if no image, initials, or if image failed (uses stable hash picker)
  const bgColor = imgError ? getStableColor(displayName || tile.id) : getTileBackground(content, tile.id);

  const activeDuration = tile.transition?.type === "fade" ? 1000 : (tile.transition?.duration || 400);

  return (
    <div
      className="mosaic-tile"
      style={{
        backgroundColor: bgColor,
        boxSizing: "border-box",
      }}
    >
      <div
        className={`tile-content-wrapper ${animClass}`}
        style={{
          transitionDuration: `${activeDuration}ms`,
          transitionTimingFunction: tile.transition?.easing || "ease",
          overflow: "hidden", // Clip content at tile card level to prevent leakage during 3D flip
        }}
      >
        {isSlice && photoUrl && !imgError && (
          <img
            src={photoUrl}
            alt={displayName}
            className={content.mode === "silhouette" ? "tile-img-silhouette" : ""}
            onError={() => {
              console.log("Image failed to load:", photoUrl, "for tile", tile.id);
              setImgError(true);
            }}
            style={{
              position: "absolute",
              width: `${displayCropLayout.w * 100}%`,
              height: `${displayCropLayout.h * 100}%`,
              left: `${-displayCropLayout.x * 100}%`,
              top: `${-displayCropLayout.y * 100}%`,
              objectFit: "cover",
              maxWidth: "none",
              maxHeight: "none",
            }}
          />
        )}
        {isImage && !isSlice && photoUrl && !imgError && (
          <img
            src={photoUrl}
            alt={displayName}
            className={`tile-img ${content.mode === "silhouette" ? "tile-img-silhouette" : ""}`}
            onError={() => {
              console.log("Image failed to load:", photoUrl, "for tile", tile.id);
              setImgError(true);
            }}
            style={
              tile.cropRegion && tile.cropRegion !== "full"
                ? { objectPosition: getCropPosition(tile.cropRegion) }
                : {}
            }
          />
        )}
        {((isImage && (!photoUrl || imgError)) || isInitials) && (
          <span className="tile-initials">{content.initials || getInitials(displayName || tile.content.label)}</span>
        )}
        {isLabel && (
          <span className="tile-theme-label">{content.text || content.value || content.label}</span>
        )}
        {isIcon && (
          <span className="tile-icon-glyph">{getIconGlyph(content.icon)}</span>
        )}
        {isStat && (
          <span className="tile-stat">
            <strong>{content.number}</strong>
            <small>{content.label}</small>
          </span>
        )}
      </div>
    </div>
  );
};

const getCropPosition = (region) => {
  const positions = {
    "top-left": "0% 0%",
    "top-right": "100% 0%",
    "bottom-left": "0% 100%",
    "bottom-right": "100% 100%",
    full: "50% 50%",
  };
  return positions[region] || region || "50% 50%";
};

export default MosaicTile;
