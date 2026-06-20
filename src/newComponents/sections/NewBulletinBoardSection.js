import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Spin } from "antd";
import {
  UserOutlined,
  CalendarOutlined,
  CameraOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { supabase } from "../../supabaseClient";
import AuthConsumer from "../../useSession";
import { getAvatarSrc } from "../../utils/avatarHelper";
import "./NewBulletinBoardSection.css";

// Encapsulated Rotating Live Tile Card component
const BulletinLiveTile = ({ items, type, getAvatarSrc, getPhotoSrc, isVideoFile, onActiveItemChange }) => {
  const [faces, setFaces] = useState([]);
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [nextFaceIndex, setNextFaceIndex] = useState(null);
  const [transition, setTransition] = useState(null);
  const [animating, setAnimating] = useState(false);

  // Compile faces whenever items change
  useEffect(() => {
    if (items.length === 0) {
      setFaces([]);
      return;
    }

    const pool = [];

    // Face 1: Summary / Statistics face
    if (type === "milestone") {
      pool.push({
        type: "summary",
        render: () => (
          <div className="tile-face-content summary-face">
            <div className="summary-left">
              <CalendarOutlined className="summary-icon" />
              <div className="summary-title">Life Milestones</div>
            </div>
            <div className="summary-right">
              <div className="summary-count">{items.length}</div>
              <div className="summary-count-lbl">{items.length === 1 ? "milestone" : "milestones"}</div>
            </div>
          </div>
        )
      });
      
      // Spotlight faces for up to 3 recent milestones
      items.slice(0, 3).forEach((item) => {
        pool.push({
          type: "spotlight",
          item,
          render: () => (
            <div className="tile-face-content spotlight-face">
              <div className="face-header">
                <Avatar src={getAvatarSrc(item.profile)} icon={<UserOutlined />} size={24} className="face-avatar" />
                <span className="face-uploader-name">{item.profile?.firstname} {item.profile?.lastname}</span>
                <span className="face-tag milestone-tag">{item.category?.toUpperCase()}</span>
              </div>
              <div className="face-body">
                <div className="spotlight-title">{item.title}</div>
                {item.notes && <div className="spotlight-notes">{item.notes}</div>}
              </div>
            </div>
          )
        });

        // Photo face if photo exists
        if (item.photoUrl) {
          pool.push({
            type: "photo",
            item,
            render: () => (
              <div 
                className="tile-face-content photo-face"
                style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.75)), url(${getPhotoSrc(item.photoUrl)})` }}
              >
                <div className="photo-overlay-text">
                  <div className="photo-title">{item.title}</div>
                  <div className="photo-author">by {item.profile?.firstname}</div>
                </div>
              </div>
            )
          });
        }
      });
    } else if (type === "media") {
      pool.push({
        type: "summary",
        render: () => (
          <div className="tile-face-content summary-face">
            <div className="summary-left">
              <CameraOutlined className="summary-icon" />
              <div className="summary-title">Media Gallery</div>
            </div>
            <div className="summary-right">
              <div className="summary-count">{items.length}</div>
              <div className="summary-count-lbl">{items.length === 1 ? "upload" : "uploads"}</div>
            </div>
          </div>
        )
      });

      items.slice(0, 3).forEach((item) => {
        // Spotlight face (details)
        pool.push({
          type: "spotlight",
          item,
          render: () => (
            <div className="tile-face-content spotlight-face">
              <div className="face-header">
                <Avatar src={getAvatarSrc(item.profile)} icon={<UserOutlined />} size={24} className="face-avatar" />
                <span className="face-uploader-name">{item.profile?.firstname} {item.profile?.lastname}</span>
                <span className="face-tag media-tag">{item.decade}</span>
              </div>
              <div className="face-body">
                <div className="spotlight-notes">{item.caption || "Shared a photo in the family archive"}</div>
              </div>
            </div>
          )
        });

        // Photo face if file exists
        if (item.filePath) {
          const isVideo = isVideoFile(item.filePath);
          pool.push({
            type: "photo",
            item,
            render: () => (
              <div className="tile-face-content photo-face">
                {isVideo ? (
                  <video src={getPhotoSrc(item.filePath)} muted loop autoPlay className="tile-media-render" />
                ) : (
                  <img src={getPhotoSrc(item.filePath)} alt={item.caption} className="tile-media-render" />
                )}
                {item.caption && (
                  <div className="photo-overlay-text">
                    <div className="photo-title">{item.caption}</div>
                  </div>
                )}
              </div>
            )
          });
        }
      });
    } else if (type === "guestbook") {
      pool.push({
        type: "summary",
        render: () => (
          <div className="tile-face-content summary-face">
            <div className="summary-left">
              <BookOutlined className="summary-icon" />
              <div className="summary-title">Tribute Guestbook</div>
            </div>
            <div className="summary-right">
              <div className="summary-count">{items.length}</div>
              <div className="summary-count-lbl">{items.length === 1 ? "tribute" : "tributes"}</div>
            </div>
          </div>
        )
      });

      items.slice(0, 3).forEach((item) => {
        // Quote face
        pool.push({
          type: "quote",
          item,
          render: () => (
            <div className="tile-face-content quote-face">
              <blockquote className="tile-blockquote">"{item.content}"</blockquote>
              <div className="tile-quote-author">— {item.profile?.firstname} to {item.profileTarget?.firstname}</div>
            </div>
          )
        });

        // Spotlight details face
        pool.push({
          type: "spotlight",
          item,
          render: () => (
            <div className="tile-face-content spotlight-face">
              <div className="face-header">
                <Avatar src={getAvatarSrc(item.profile)} icon={<UserOutlined />} size={24} className="face-avatar" />
                <span className="face-uploader-name">{item.profile?.firstname} {item.profile?.lastname}</span>
                <span className="face-tag guestbook-tag">TRIBUTE</span>
              </div>
              <div className="face-body">
                <div className="spotlight-notes">
                  Left a tribute on <strong>{item.profileTarget?.firstname}&apos;s wall</strong>
                  {item.location && ` in ${item.location}`}
                </div>
              </div>
            </div>
          )
        });
      });
    }

    setFaces(pool);
    setCurrentFaceIndex(0);
    setNextFaceIndex(null);
    setTransition(null);
    setAnimating(false);
  }, [items, type, getAvatarSrc, getPhotoSrc, isVideoFile]);

  // Notify parent component of current active item for drawer routing
  useEffect(() => {
    const face = faces[currentFaceIndex];
    if (face && face.item) {
      onActiveItemChange?.(face.item);
    } else {
      onActiveItemChange?.(null);
    }
  }, [currentFaceIndex, faces, onActiveItemChange]);

  // Rotator timeout/scheduler
  useEffect(() => {
    if (faces.length <= 1) return;

    let timer;
    const tick = () => {
      const nextIndex = (currentFaceIndex + 1) % faces.length;
      const animations = ["fade", "slideUp", "slideLeft", "peek", "flipX", "flipY"];
      const randAnim = animations[Math.floor(Math.random() * animations.length)];

      setNextFaceIndex(nextIndex);
      setTransition(randAnim);
      setAnimating(true);

      const duration = randAnim === "peek" ? 1200 : 800;
      timer = setTimeout(() => {
        setCurrentFaceIndex(nextIndex);
        setNextFaceIndex(null);
        setTransition(null);
        setAnimating(false);

        // Schedule next tick
        const delay = Math.random() * 2000 + 4000; // 4 to 6 seconds
        timer = setTimeout(tick, delay);
      }, duration);
    };

    const startupDelay = Math.random() * 2000 + 1500;
    timer = setTimeout(tick, startupDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [faces, currentFaceIndex]);

  if (items.length === 0) {
    return (
      <div className="bulletin-live-tile-empty">
        <div className="empty-inner">
          <span className="empty-title">No recent updates</span>
          <span className="empty-sub">Tap to add first broadcast</span>
        </div>
      </div>
    );
  }

  const currentFace = faces[currentFaceIndex];
  const nextFace = nextFaceIndex !== null ? faces[nextFaceIndex] : null;

  if (!currentFace) return null;

  return (
    <div className="bulletin-live-tile-wrapper">
      <div className={`tile-face active ${animating ? `${transition}-out` : ""}`}>
        {currentFace.render()}
      </div>
      {nextFace && (
        <div className={`tile-face incoming ${animating ? `${transition}-in` : ""}`}>
          {nextFace.render()}
        </div>
      )}
    </div>
  );
};

const NewBulletinBoardSection = () => {
  const { session } = AuthConsumer();
  const currentUserId = session?.user?.id;
  const navigate = useNavigate();

  const [milestones, setMilestones] = useState([]);
  const [guestbook, setGuestbook] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Guestbook target tracker for dynamic drawer navigation
  const [activeGuestbookItem, setActiveGuestbookItem] = useState(null);

  // Fetch all data and compile feed
  const loadFeedData = useCallback(async () => {
    setLoading(true);
    try {
      let blockedIds = [];
      let relativeIds = [];

      if (currentUserId) {
        // Fetch blocked / muted ids
        const { data: rels } = await supabase
          .from("profile_relationship")
          .select("blocked_id")
          .eq("blocker_id", currentUserId);
        if (rels) {
          blockedIds = rels.map((r) => r.blocked_id);
        }

        // Fetch direct relations (parents, spouses, children) to respect is_locked
        const { data: conns } = await supabase
          .from("connection")
          .select("profile_2")
          .eq("profile_1", currentUserId)
          .eq("status", "active")
          .in("connection_type", ["parent", "spouse", "child"]);
        if (conns) {
          relativeIds = conns.map((c) =>
            typeof c.profile_2 === "object" ? c.profile_2.id : c.profile_2
          );
        }
      }

      // Query database view for unified broadcast feed
      const { data: queueData, error: queueErr } = await supabase
        .from("family_broadcast_queue")
        .select("*")
        .order("created_at", { ascending: false });

      if (queueErr) console.warn("Error fetching broadcast queue:", queueErr);

      // Privacy Filter helpers
      const isProfileVisible = (id, is_locked) => {
        if (!is_locked) return true;
        return currentUserId === id || relativeIds.includes(id);
      };

      const milestonesList = [];
      const guestbookList = [];

      (queueData || []).forEach((row) => {
        // Block & Mute Checks
        if (row.profile_id && blockedIds.includes(row.profile_id)) return;
        if (row.target_profile_id && blockedIds.includes(row.target_profile_id)) return;

        // Visibility Checks
        if (!isProfileVisible(row.profile_id, row.author_is_locked)) return;
        if (row.target_profile_id && !isProfileVisible(row.target_profile_id, row.target_is_locked)) return;

        // Construct virtual profile objects to align with rotator expectations
        const profile = {
          id: row.profile_id,
          firstname: row.author_firstname,
          lastname: row.author_lastname,
          avatar_url: row.author_avatar_url,
          branch: row.author_branch,
          is_locked: row.author_is_locked
        };

        if (row.item_type === "milestone") {
          milestonesList.push({
            id: `milestone-${row.item_id}`,
            dbId: row.item_id,
            type: "milestone",
            timestamp: new Date(row.created_at || Date.now()),
            profile,
            title: row.display_title,
            category: row.item_tag,
            notes: row.display_body,
            photoUrl: row.file_path,
          });
        } else if (row.item_type === "guestbook") {
          const profileTarget = {
            id: row.target_profile_id,
            firstname: row.target_firstname,
            lastname: row.target_lastname,
            is_locked: row.target_is_locked
          };
          guestbookList.push({
            id: `guestbook-${row.item_id}`,
            dbId: row.item_id,
            type: "guestbook",
            timestamp: new Date(row.created_at || Date.now()),
            profile, // author
            profileTarget, // recipient
            content: row.display_title,
            location: row.display_body,
          });
        }
      });

      setMilestones(milestonesList);
      setGuestbook(guestbookList);
    } catch (err) {
      console.error("Error loading combined bulletin feed:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadFeedData();
  }, [currentUserId, loadFeedData]);

  // Helper getter for milestone photos

  const getMilestonePhoto = useCallback((photoUrl) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith("http")) return photoUrl;
    const { data } = supabase.storage.from("milestones").getPublicUrl(photoUrl);
    return data.publicUrl;
  }, []);

  const isVideoFile = useCallback((filePath) => {
    if (!filePath) return false;
    const ext = filePath.split(".").pop().toLowerCase();
    return ["mp4", "webm", "ogg", "mov"].includes(ext);
  }, []);

  const handleGuestbookCardClick = () => {
    if (activeGuestbookItem?.profileTarget?.id) {
      navigate(`/profile/${activeGuestbookItem.profileTarget.id}?drawer=guestbook`);
    } else {
      navigate(`/profile?drawer=guestbook`);
    }
  };

  return (
    <div className="new-bulletin-container">
      {/* Header Plaque */}
      <div className="bulletin-header">
        <h2 className="bulletin-main-title">Family Bulletin Board</h2>
        <p className="bulletin-subtitle">Broadcasting updates from across the generations</p>
      </div>

      {loading ? (
        <div className="bulletin-spinner-wrap">
          <Spin size="large" />
        </div>
      ) : (
        <div className="bulletin-cards-stack">
          {/* Card 1: Milestones */}
          <div className="bulletin-horizontal-card milestone-row" onClick={() => navigate("/milestones")}>
            <div className="card-left-info">
              <CalendarOutlined className="card-main-icon" />
              <div className="card-info-text">
                <span className="card-label">Milestones</span>
                <span className="card-cta">Browse Milestones &rarr;</span>
              </div>
            </div>
            <div className="card-right-tile">
              <BulletinLiveTile
                items={milestones}
                type="milestone"
                getAvatarSrc={getAvatarSrc}
                getPhotoSrc={getMilestonePhoto}
                isVideoFile={isVideoFile}
              />
            </div>
          </div>

          {/* Card 2: Media */}
          <div className="bulletin-horizontal-card media-row" style={{ opacity: 0.7, cursor: "not-allowed" }}>
            <div className="card-left-info">
              <CameraOutlined className="card-main-icon" />
              <div className="card-info-text">
                <span className="card-label">Media Gallery</span>
                <span className="card-cta" style={{ color: "#d4af37", fontWeight: "bold" }}>Coming Soon</span>
              </div>
            </div>
            <div className="card-right-tile">
              <div className="bulletin-live-tile-empty">
                <div className="empty-inner">
                  <span className="empty-title">Media Gallery</span>
                  <span className="empty-sub" style={{ color: "#d4af37", fontWeight: "bold" }}>Coming Soon</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Tribute Guestbook */}
          <div className="bulletin-horizontal-card guestbook-row" onClick={handleGuestbookCardClick}>
            <div className="card-left-info">
              <BookOutlined className="card-main-icon" />
              <div className="card-info-text">
                <span className="card-label">Tribute Guestbook</span>
                <span className="card-cta">Write a Tribute &rarr;</span>
              </div>
            </div>
            <div className="card-right-tile">
              <BulletinLiveTile
                items={guestbook}
                type="guestbook"
                getAvatarSrc={getAvatarSrc}
                getPhotoSrc={getMilestonePhoto}
                onActiveItemChange={setActiveGuestbookItem}
                isVideoFile={isVideoFile}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewBulletinBoardSection;
