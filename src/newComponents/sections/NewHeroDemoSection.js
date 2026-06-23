import React, { useState } from "react";
import NewHeroSection from "./NewHeroSection";
import "./NewHeroDemoSection.css";

const NewHeroDemoSection = () => {
  const [demoState, setDemoState] = useState("guest");

  const states = [
    { key: "guest", label: "1. Guest View" },
    { key: "unconnected", label: "2. Lineage Builder" },
    { key: "connected_no_photo", label: "3. Missing Photo" },
    { key: "connected_no_family", label: "4. Missing Relatives" },
    { key: "connected_complete", label: "5. Fully Complete" },
  ];

  return (
    <div className="new-hero-demo-section-wrapper">
      {/* State Switcher Header */}
      <div className="demo-switcher-bar">
        <span className="demo-bar-title">UI Simulator:</span>
        <div className="demo-buttons-group">
          {states.map((s) => (
            <button
              key={s.key}
              className={`demo-state-btn ${demoState === s.key ? "active" : ""}`}
              onClick={() => setDemoState(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Underneath, render the Hero Section in Demo Mode */}
      <div className="demo-hero-container">
        <NewHeroSection demoMode={demoState} />
      </div>
    </div>
  );
};

export default NewHeroDemoSection;
