import React from "react";
import { DownOutlined } from "@ant-design/icons";
import ancestorsImg from "../../assets/anc1.png";
import "./NewHeroSection.css";

const NewHeroSection = () => {
  // Smooth scroll handler to next snap section
  const handleChevronClick = () => {
    const container = document.querySelector(".new-home-container");
    if (container) {
      container.scrollTo({
        top: window.innerHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="new-hero-section">
      {/* Top Title */}
      <div className="new-hero-title-container">
        <h1 className="new-hero-title">
          <span>Smith</span>
          <span>Family</span>
        </h1>
      </div>

      {/* Side-by-side Historic Photo */}
      <div className="new-hero-image-container">
        <img
          src={ancestorsImg}
          alt="Smith Family Ancestors"
          className="new-hero-image"
        />
      </div>

      {/* Down Chevron Anchor */}
      <div className="new-hero-chevron-container" onClick={handleChevronClick}>
        <DownOutlined className="new-hero-chevron" />
      </div>
    </div>
  );
};

export default NewHeroSection;
