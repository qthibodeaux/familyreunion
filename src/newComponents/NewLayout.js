import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  MenuOutlined,
  HomeOutlined,
  CloseOutlined,
  UserOutlined,
  ApartmentOutlined,
  CalendarOutlined,
  SearchOutlined,
  LogoutOutlined,
  LockOutlined,
  PictureOutlined,
  BookOutlined,
  BellOutlined,
} from "@ant-design/icons";
import { Avatar, Button, Badge, Modal, Select, Input, message } from "antd";
import { AuthProvider } from "../useSession";
import AuthConsumer from "../useSession";
import { supabase } from "../supabaseClient";
import AuthCallbackHandler from "../components/AuthCallbackHandler";
import { getAvatarSrc } from "../utils/avatarHelper";
import "./NewLayout.css";

const NewLayoutContent = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Feedback Form states
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("suggestion");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Load auth session and profile data
  const { session, profile, handleSignOut } = AuthConsumer();

  // Fetch unread notifications count and subscribe to table updates
  useEffect(() => {
    if (!session) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from("notification")
          .select("*", { count: "exact", head: true })
          .eq("recipient_id", session.user.id)
          .eq("is_read", false);
        if (!error && count !== null) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.warn("Failed to fetch notification count:", err);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time notification changes
    const channel = supabase
      .channel(`notification-changes-${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification",
          filter: `recipient_id=eq.${session.user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Toggle menu open/close
  const handleFloatingButtonClick = () => {
    setIsMenuOpen((prev) => !prev);
  };

  // Determine button icon based on menu state
  const getIcon = () => {
    if (isMenuOpen) return <CloseOutlined />;
    return <MenuOutlined />;
  };

  const treeItems = [
    {
      key: "scroll-tree",
      label: "Interactive Tree",
      icon: <ApartmentOutlined />,
      path: "/scrolltree",
    },
    {
      key: "timeline",
      label: "Timeline Tree",
      icon: <CalendarOutlined />,
      path: "/timeline",
    },
    {
      key: "calendar-tree",
      label: "Calendar Tree",
      icon: <ApartmentOutlined />,
      path: "/tree",
    },
    {
      key: "search",
      label: "Search Members",
      icon: <SearchOutlined />,
      path: "/membersearch",
      requiresAuth: true,
    },
  ];

  const pulseItems = [
    {
      key: "milestones",
      label: "Family Milestones",
      icon: <CalendarOutlined />,
      path: "/milestones",
    },
    {
      key: "guestbook",
      label: "Family Guestbook",
      icon: <BookOutlined />,
      path: "/guestbook",
    },
    {
      key: "media",
      label: "Family Media",
      icon: <PictureOutlined />,
      path: "/media",
      comingSoon: true,
    },
    {
      key: "ancestor",
      label: "Family Profiles",
      icon: <UserOutlined />,
      path: "/ancestor",
      comingSoon: true,
    },
  ];

  // Route handler with authentication safeguard
  const handleItemClick = (item) => {
    if (item.comingSoon) return;
    if (item.requiresAuth && !session) {
      navigate("/register");
    } else {
      navigate(item.path);
    }
    setIsMenuOpen(false);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) {
      message.warning("Please enter a message before sending.");
      return;
    }
    setSubmittingFeedback(true);
    try {
      const { error } = await supabase.from("feedback").insert([
        {
          user_id: session?.user?.id || null,
          category: feedbackCategory,
          message: feedbackMessage.trim(),
        },
      ]);

      if (error) throw error;

      message.success("Thank you! Your feedback has been sent successfully.");
      setFeedbackMessage("");
      setFeedbackCategory("suggestion");
      setIsFeedbackOpen(false);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      message.error("Failed to send feedback. Please try again later.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Render User Identity Card (Guest vs Authenticated)
  const renderIdentityCard = () => {
    if (session) {
      const initials =
        `${profile?.firstname?.[0] || ""}${profile?.lastname?.[0] || ""}`.toUpperCase();
      const avatarUrl = getAvatarSrc(profile);

      return (
        <div className="identity-card large">
          <div className="user-info">
            <Avatar
              shape="square"
              src={avatarUrl}
              icon={!avatarUrl && <UserOutlined />}
              className="avatar-border-large responsive-menu-avatar"
            >
              {initials}
            </Avatar>
            <div className="user-details-large">
              <span className="welcome-text-large">Hello,</span>
              <span className="user-name-large">
                {profile?.firstname || "Family Member"}
              </span>
            </div>
          </div>
          <div className="user-actions">
            <Button
              type="primary"
              className="action-btn"
              onClick={() => {
                navigate(`/profile/${session.user.id}`);
                setIsMenuOpen(false);
              }}
            >
              View Profile
            </Button>
            
            <Badge count={unreadCount} size="small" offset={[-5, 5]}>
              <Button
                className={`notification-btn-square ${unreadCount > 0 ? 'has-unread' : ''}`}
                icon={<BellOutlined />}
                onClick={() => {
                  navigate("/notifications");
                  setIsMenuOpen(false);
                }}
              />
            </Badge>

            <button
              className="signout-link"
              onClick={() => {
                handleSignOut();
                setIsMenuOpen(false);
              }}
            >
              <LogoutOutlined /> Sign Out
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="identity-card large">
          <div className="user-info">
            <Avatar
              shape="square"
              icon={<UserOutlined />}
              className="avatar-border-large responsive-menu-avatar"
            />
            <div className="user-details-large">
              <span className="welcome-text-large">Welcome,</span>
              <span className="user-name-large">Guest</span>
            </div>
          </div>
          <div className="user-actions">
            <Button
              type="primary"
              className="action-btn"
              onClick={() => {
                navigate("/register");
                setIsMenuOpen(false);
              }}
            >
              Sign In / Join Us
            </Button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="new-app-container">
      {/* Floating Dynamic Action Button (Top-Right) */}
      <button
        className="floating-menu-btn"
        onClick={handleFloatingButtonClick}
        aria-label="Toggle menu"
      >
        {getIcon()}
      </button>

      {/* Main Page Content */}
      <main className="new-content-wrapper">
        <AuthCallbackHandler />
        <Outlet />

        {/* Custom sliding Overlay Menu (Aligned inside layout context) */}
        <div className={`custom-menu-overlay ${isMenuOpen ? "open" : ""}`}>
          <div className="menu-overlay-header">
            <span className="menu-overlay-title">Smith Family</span>
          </div>

          {/* Profile Card */}
          {renderIdentityCard()}

          {/* Links Navigation (Native mapped card-style list) */}
          <div className="custom-menu-list menu-grid-container">
            {/* Full-width Home Button */}
            <div
              className={`custom-menu-card-item full-width-item ${location.pathname === "/" ? "selected" : ""}`}
              onClick={() => {
                navigate("/");
                setIsMenuOpen(false);
              }}
            >
              <div className="menu-card-left">
                <span className="menu-card-icon"><HomeOutlined /></span>
                <span className="menu-card-label">Home</span>
              </div>
              <div className="menu-card-right">
                <span className="menu-card-arrow">&rarr;</span>
              </div>
            </div>

            {/* Grid Columns */}
            <div className="menu-columns">
              {/* Tree Column */}
              <div className="menu-column">
                <div className="menu-column-title">Tree</div>
                {treeItems.map((item) => {
                  const isSelected = location.pathname === item.path;
                  const isLocked = item.requiresAuth && !session;
                  return (
                    <div
                      key={item.key}
                      className={`custom-menu-card-item grid-card-item ${isSelected ? "selected" : ""} ${isLocked ? "locked" : ""}`}
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="menu-card-left">
                        <span className="menu-card-icon">{item.icon}</span>
                        <span className="menu-card-label">{item.label}</span>
                      </div>
                      <div className="menu-card-right">
                        {isLocked ? (
                          <LockOutlined className="menu-card-lock-icon" />
                        ) : (
                          <span className="menu-card-arrow">&rarr;</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pulse Column */}
              <div className="menu-column">
                <div className="menu-column-title">Pulse</div>
                {pulseItems.map((item) => {
                  const isSelected = location.pathname === item.path;
                  const isLocked = item.requiresAuth && !session;
                  const isComingSoon = item.comingSoon;
                  return (
                    <div
                      key={item.key}
                      className={`custom-menu-card-item grid-card-item ${isSelected ? "selected" : ""} ${isLocked ? "locked" : ""} ${isComingSoon ? "coming-soon" : ""}`}
                      onClick={() => handleItemClick(item)}
                      style={isComingSoon ? { cursor: "not-allowed", opacity: 0.6 } : {}}
                    >
                      <div className="menu-card-left" style={{ display: "flex", alignItems: "center", gap: "0.85rem", width: "100%" }}>
                        <span className="menu-card-icon">{item.icon}</span>
                        <span className="menu-card-label" style={{ flexGrow: 1 }}>{item.label}</span>
                        {item.hasBadge && unreadCount > 0 && (
                          <span className="menu-card-badge">{unreadCount}</span>
                        )}
                      </div>
                      <div className="menu-card-right">
                        {isComingSoon ? (
                          <span style={{ fontSize: "0.75rem", color: "#d4af37", fontWeight: "bold" }}>Soon</span>
                        ) : isLocked ? (
                          <LockOutlined className="menu-card-lock-icon" />
                        ) : (
                          <span className="menu-card-arrow">&rarr;</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Feedback Trigger Link */}
          <div className="menu-feedback-section">
            <Button
              type="link"
              onClick={() => setIsFeedbackOpen(true)}
              className="feedback-trigger-btn"
            >
              Want to leave feedback on how to improve the website?
            </Button>
          </div>

          {/* Brand Footer */}
          <div className="drawer-footer">
            <div className="footer-brand">Smith Family Reunion 2026</div>
            <div className="footer-tagline">"Preserving our legacy since 1885"</div>
            <div className="footer-version">v1.0.7</div>
          </div>
        </div>
      </main>

      {/* Feedback Modal */}
      <Modal
        title="Share Your Feedback"
        open={isFeedbackOpen}
        onCancel={() => {
          setIsFeedbackOpen(false);
          setFeedbackMessage("");
          setFeedbackCategory("suggestion");
        }}
        footer={null}
        className="feedback-modal-custom"
      >
        <div className="feedback-modal-body">
          <p className="feedback-subtitle-text">
            Let us know what we can improve, report bugs, or request features!
          </p>
          <div className="feedback-form-group">
            <label className="feedback-form-label">Category</label>
            <Select
              value={feedbackCategory}
              onChange={(value) => setFeedbackCategory(value)}
              className="feedback-form-select"
              popupClassName="feedback-form-dropdown"
              style={{ width: "100%" }}
            >
              <Select.Option value="suggestion">Suggestion / Improvement</Select.Option>
              <Select.Option value="bug">Report a Bug / Issue</Select.Option>
              <Select.Option value="question">Ask a Question</Select.Option>
              <Select.Option value="compliment">Send a Compliment</Select.Option>
              <Select.Option value="other">Other</Select.Option>
            </Select>
          </div>
          <div className="feedback-form-group">
            <label className="feedback-form-label">Message</label>
            <Input.TextArea
              rows={4}
              maxLength={1000}
              placeholder="Tell us what's on your mind..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              className="feedback-form-textarea"
              showCount
            />
          </div>
          <div className="feedback-form-actions">
            <Button
              onClick={() => {
                setIsFeedbackOpen(false);
                setFeedbackMessage("");
                setFeedbackCategory("suggestion");
              }}
              className="feedback-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleFeedbackSubmit}
              loading={submittingFeedback}
              className="feedback-submit-btn"
            >
              Send Feedback
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const NewLayout = () => {
  return (
    <AuthProvider>
      <NewLayoutContent />
    </AuthProvider>
  );
};

export default NewLayout;
