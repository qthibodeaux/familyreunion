import { useState, useRef, useEffect } from "react";
import { Button, Input, Avatar, message, Checkbox } from "antd";
import {
  SendOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { supabase } from "../supabaseClient";

/**
 * GuestbookComposer
 * Inline post composer with 240-char limit, @mention search, location, and event date.
 */
export default function GuestbookComposer({
  profileId,
  firstname,
  authorId,
  currentUser,
  onPostCreated,
  getAvatarSrc,
}) {
  const [content, setContent] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [isBroadcast, setIsBroadcast] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showMention, setShowMention] = useState(false);
  const [mentionResults, setMentionResults] = useState([]);
  const [taggedProfiles, setTaggedProfiles] = useState([]);
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [showEventDate, setShowEventDate] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const textareaRef = useRef(null);
  const mentionDropdownRef = useRef(null);

  const MAX_CHARS = 240;

  // Character counter color logic
  const getCounterColor = () => {
    if (charCount > 230) return "#ff4d4f"; // red
    if (charCount > 200) return "#faad14"; // amber
    return "#EABEA9"; // default muted
  };

  const isOverLimit = charCount > MAX_CHARS;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !submitting;

  // Handle content change with @mention detection
  const handleContentChange = (e) => {
    const text = e.target.value;
    setContent(text);
    setCharCount(text.length);

    // Detect @mention trigger
    const cursor = e.target.selectionStart;
    setCursorPosition(cursor);

    const beforeCursor = text.slice(0, cursor);
    const lastAtIndex = beforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.slice(lastAtIndex + 1);
      // Only trigger if no space after @ (still typing the name)
      if (!afterAt.includes(" ") && afterAt.length >= 0) {
        setShowMention(true);
        searchProfiles(afterAt);
      } else {
        setShowMention(false);
      }
    } else {
      setShowMention(false);
    }
  };

  // Search profiles for @mention
  const searchProfiles = async (query) => {
    try {
      const { data, error } = await supabase
        .from("profile")
        .select("id, firstname, lastname, avatar_url")
        .or(`firstname.ilike.%${query}%,lastname.ilike.%${query}%`)
        .limit(5);

      if (!error && data) {
        setMentionResults(data);
      }
    } catch (err) {
      console.error("Mention search error:", err);
    }
  };

  // Insert mention into content
  const insertMention = (profile) => {
    const beforeCursor = content.slice(0, cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf("@");
    const beforeAt = content.slice(0, lastAtIndex);
    const afterCursor = content.slice(cursorPosition);

    const mentionText = `@${profile.firstname} ${profile.lastname} `;
    const newContent = beforeAt + mentionText + afterCursor;

    setContent(newContent);
    setCharCount(newContent.length);
    setTaggedProfiles([...taggedProfiles, profile.id]);
    setShowMention(false);

    // Refocus textarea after selection
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtIndex + mentionText.length;
        const nativeTextArea = textareaRef.current.resizableTextArea?.textArea || textareaRef.current;
        if (nativeTextArea && typeof nativeTextArea.focus === "function") {
          nativeTextArea.focus();
        }
        if (nativeTextArea && typeof nativeTextArea.setSelectionRange === "function") {
          nativeTextArea.setSelectionRange(newCursorPos, newCursorPos);
        }
      }
    }, 0);
  };

  // Submit post
  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      if (!authorId) throw new Error("Must be logged in");
      const post = {
        profile_id: profileId,
        author_id: authorId,
        content: content.trim(),
        is_broadcast: isBroadcast,
      };

      if (taggedProfiles.length > 0) post.tagged_profiles = taggedProfiles;
      if (location.trim()) post.location = location.trim();
      if (eventDate) post.event_date = eventDate;

      const { data: postData, error } = await supabase
        .from("guestbook_post")
        .insert([post])
        .select(
          `
          id, content, location, event_date, likes_count, is_reported, created_at, tagged_profiles,
          author:author_id ( id, firstname, lastname, avatar_url )
        `
        );

      if (error) throw error;

      if (postData && postData.length > 0) {
        // Reset form
        setContent("");
        setCharCount(0);
        setTaggedProfiles([]);
        setLocation("");
        setEventDate("");
        setShowLocation(false);
        setShowEventDate(false);
        setIsBroadcast(true);

        // Notify parent
        if (onPostCreated) {
          onPostCreated(postData[0]);
        }

        message.success("Note posted!");
      }
    } catch (err) {
      console.error("Error posting guestbook note:", err);
      message.error("Failed to post note. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Close mention dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(e.target) &&
        textareaRef.current !== e.target
      ) {
        setShowMention(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        padding: "14px 16px",
        borderRadius: "12px",
        border: "1px solid rgba(234,190,169,0.15)",
        marginBottom: "16px",
      }}
    >
      {/* Input Row with Avatar */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
        <Avatar
          size="small"
          src={getAvatarSrc ? getAvatarSrc(currentUser) : null}
          icon={<UserOutlined />}
          style={{
            border: "1px solid rgba(234,190,169,0.3)",
            flexShrink: 0,
            marginTop: "2px",
          }}
        />
        <div style={{ flex: 1, position: "relative" }}>
          <Input.TextArea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder={profileId === authorId ? "Write a quick update or note on your wall..." : `Write a quick note for ${firstname}...`}
            autoSize={{ minRows: 1, maxRows: 3 }}
            maxLength={MAX_CHARS + 10} // soft limit, we enforce in logic
            style={{
              background: "#4e1237",
              border: "1px solid rgba(234,190,169,0.25)",
              color: "#fff",
              borderRadius: "8px",
              resize: "none",
            }}
          />

          {/* @mention dropdown */}
          {showMention && mentionResults.length > 0 && (
            <div
              ref={mentionDropdownRef}
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#4a1934",
                border: "1px solid rgba(234,190,169,0.2)",
                borderRadius: "8px",
                zIndex: 50,
                maxHeight: "200px",
                overflowY: "auto",
                marginTop: "4px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              {mentionResults.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => insertMention(profile)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "10px 14px",
                    background: "none",
                    border: "none",
                    borderBottom: "1px solid rgba(234,190,169,0.1)",
                    cursor: "pointer",
                    color: "#f3e7b1",
                    textAlign: "left",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(234,190,169,0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <Avatar
                    size="small"
                    src={getAvatarSrc ? getAvatarSrc(profile) : null}
                    icon={<UserOutlined />}
                  >
                    {`${profile.firstname?.[0] || ""}${profile.lastname?.[0] || ""}`.toUpperCase()}
                  </Avatar>
                  <span>
                    {profile.firstname} {profile.lastname}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Location Input (toggleable) */}
      {showLocation && (
        <div style={{ marginBottom: "8px", paddingLeft: "38px" }}>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add a location..."
            prefix={<EnvironmentOutlined style={{ color: "#EABEA9" }} />}
            style={{
              background: "#4e1237",
              border: "1px solid rgba(234,190,169,0.2)",
              color: "#fff",
              borderRadius: "6px",
            }}
          />
        </div>
      )}

      {/* Event Date Input (toggleable) */}
      {showEventDate && (
        <div style={{ marginBottom: "8px", paddingLeft: "38px" }}>
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            placeholder="Remembering a date..."
            style={{
              background: "#4e1237",
              border: "1px solid rgba(234,190,169,0.2)",
              color: "#fff",
              borderRadius: "6px",
              colorScheme: "dark",
            }}
          />
        </div>
      )}

      {/* Broadcast Switch Row */}
      <div style={{ marginBottom: "12px", paddingLeft: "38px", display: "flex", alignItems: "center" }}>
        <Checkbox
          checked={isBroadcast}
          onChange={(e) => setIsBroadcast(e.target.checked)}
          style={{ color: "#EABEA9", fontSize: "0.85rem" }}
        >
          Broadcast to Family Feed
        </Checkbox>
      </div>

      {/* Bottom Action Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: "38px",
        }}
      >
        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowMention(!showMention)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#EABEA9",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              fontSize: "1rem",
              transition: "color 0.15s ease, background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#F7DC92";
              e.currentTarget.style.background = "rgba(234,190,169,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#EABEA9";
              e.currentTarget.style.background = "none";
            }}
            title="Mention someone"
          >
            @
          </button>

          <button
            onClick={() => setShowLocation(!showLocation)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: showLocation ? "#F7DC92" : "#EABEA9",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              fontSize: "1rem",
              transition: "color 0.15s ease, background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!showLocation) {
                e.currentTarget.style.color = "#F7DC92";
                e.currentTarget.style.background = "rgba(234,190,169,0.08)";
              }
            }}
            onMouseLeave={(e) => {
              if (!showLocation) {
                e.currentTarget.style.color = "#EABEA9";
                e.currentTarget.style.background = "none";
              }
            }}
            title="Add location"
          >
            <EnvironmentOutlined />
          </button>

          <button
            onClick={() => setShowEventDate(!showEventDate)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: showEventDate ? "#F7DC92" : "#EABEA9",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              fontSize: "1rem",
              transition: "color 0.15s ease, background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!showEventDate) {
                e.currentTarget.style.color = "#F7DC92";
                e.currentTarget.style.background = "rgba(234,190,169,0.08)";
              }
            }}
            onMouseLeave={(e) => {
              if (!showEventDate) {
                e.currentTarget.style.color = "#EABEA9";
                e.currentTarget.style.background = "none";
              }
            }}
            title="Add a memory date"
          >
            <CalendarOutlined />
          </button>
        </div>

        {/* Character Counter + Post Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              fontSize: "0.8rem",
              color: getCounterColor(),
              fontWeight: charCount > 200 ? 600 : 400,
              transition: "color 0.2s ease",
              marginRight: "4px"
            }}
          >
            {charCount} / {MAX_CHARS}
          </span>

          <Button
            type="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
            icon={<SendOutlined />}
            style={{
              backgroundColor: canSubmit ? "#F7DC92" : "rgba(247,220,146,0.3)",
              color: "#873D62",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              transition: "all 0.2s ease",
            }}
          >
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
