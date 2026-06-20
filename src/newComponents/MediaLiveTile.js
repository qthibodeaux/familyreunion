import React from "react";
import { CameraOutlined } from "@ant-design/icons";

/**
 * MediaLiveTile
 * Render placeholder for Media Gallery showing "Coming Soon".
 */
export default function MediaLiveTile() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        padding: "1rem",
        textAlign: "center",
        background: "#451830",
        color: "#EABEA9",
        gap: "8px",
        cursor: "not-allowed",
      }}
    >
      <CameraOutlined style={{ fontSize: "2rem", opacity: 0.5 }} />
      <span style={{ fontSize: "0.9rem", color: "#f3e7b1", fontWeight: 600 }}>
        Media Gallery
      </span>
      <span style={{ fontSize: "0.75rem", color: "#d4af37", fontWeight: "bold" }}>
        Coming Soon
      </span>
    </div>
  );
}
