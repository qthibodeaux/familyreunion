import React from "react";
import { Link } from "react-router-dom";
import { Button } from "antd";
import { PictureOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import "./RecentMediaPage.css";

const RecentMediaPage = () => {
  return (
    <div className="media-page-container" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: "80vh", textAlign: "center", padding: "2rem" }}>
      <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(234, 190, 169, 0.15)", borderRadius: "16px", padding: "3rem 2rem", maxWidth: "500px", backdropFilter: "blur(10px)" }}>
        <PictureOutlined style={{ fontSize: "4rem", color: "#F7DC92", marginBottom: "1.5rem", opacity: 0.8 }} />
        <h1 className="media-title" style={{ fontSize: "2rem", color: "#f3e7b1", marginBottom: "0.5rem" }}>Media Gallery</h1>
        <div style={{ color: "#d4af37", fontWeight: "bold", fontSize: "1.2rem", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "1rem" }}>Coming Soon</div>
        <p style={{ color: "#EABEA9", fontSize: "1rem", lineHeight: "1.6", marginBottom: "2rem" }}>
          We are currently transitioning our database hosting. The shared family media gallery is temporarily offline and will return soon with even better performance!
        </p>
        <Link to="/">
          <Button type="primary" icon={<ArrowLeftOutlined />} style={{ backgroundColor: "#F7DC92", color: "#873D62", fontWeight: "bold", border: "none", height: "40px", borderRadius: "8px" }}>
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default RecentMediaPage;
