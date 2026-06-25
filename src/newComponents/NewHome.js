import React, { useState } from "react";
import NewHeroCompactSection from "./sections/NewHeroCompactSection";
import NewFoundationSection from "./sections/NewFoundationSection";
import NewFirstBranchSection from "./sections/NewFirstBranchSection";
import NewCombinedDemoSection from "./sections/NewCombinedDemoSection";
import NewBulletinBoardSection from "./sections/NewBulletinBoardSection";
import NewMosaicSection from "./sections/NewMosaicSection";
import FamilyFinder from "./FamilyFinder";
import "./NewHome.css";

const NewHome = () => {
  const [demoMode, setDemoMode] = useState("none"); // "none" | "guest" | "unclaimed" | "unconnected" | "connected_no_photo" | "connected_no_family" | "connected_complete"
  const [showDevPanel, setShowDevPanel] = useState(false);

  return (
    <div className="new-home-container">
      {/* Slide 1: Compact Hero Landing Slide */}
      <section className="snap-section">
        <div className="new-slide-card hero-slide-wrapper">
          <NewHeroCompactSection demoMode={demoMode !== "none" ? demoMode : undefined} />
        </div>
      </section>

      {/* Slide 2: Root Ancestors Section (Dynamic Welcome & Tribute Plaque) */}
      <section className="snap-section">
        <div className="new-slide-card">
          <NewFoundationSection />
        </div>
      </section>

      {/* Slide 3: First Branch Members */}
      <section className="snap-section">
        <div className="new-slide-card">
          <NewFirstBranchSection />
        </div>
      </section>

      {/* Slide 4: Your Family Line + Heritage (Combined) */}
      <section className="snap-section">
        <div className="new-slide-card">
          <NewCombinedDemoSection />
        </div>
      </section>

      {/* Slide 5: Family Bulletin Board (Status Updates & Activity Feed) */}
      <section className="snap-section">
        <div className="new-slide-card">
          <NewBulletinBoardSection />
        </div>
      </section>

      {/* Slide 6: Family Mosaic */}
      <section className="snap-section">
        <div className="new-slide-card">
          <NewMosaicSection />
        </div>
      </section>

      {/* Slide 7: Family Finder — Carousel + Search/Filter */}
      <section className="snap-section">
        <div className="new-slide-card">
          <FamilyFinder />
        </div>
      </section>

      {/* Floating Demo Mode Controller (Local/Dev testing HUD) */}
      <div className="dev-mode-controller">
        {!showDevPanel ? (
          <button className="dev-toggle-trigger-btn" onClick={() => setShowDevPanel(true)}>
            🛠️ Demo Modes ({demoMode === "none" ? "Live" : demoMode.replace("connected_", "")})
          </button>
        ) : (
          <div className="dev-control-panel-card">
            <div className="dev-panel-header">
              <span className="dev-panel-title">🛠️ Demo Profile HUD</span>
              <button className="dev-panel-close-btn" onClick={() => setShowDevPanel(false)}>×</button>
            </div>
            <div className="dev-panel-buttons">
              <button className={demoMode === "none" ? "active" : ""} onClick={() => setDemoMode("none")}>
                Live Database
              </button>
              <button className={demoMode === "guest" ? "active" : ""} onClick={() => setDemoMode("guest")}>
                Guest View
              </button>
              <button className={demoMode === "unclaimed" ? "active" : ""} onClick={() => setDemoMode("unclaimed")}>
                Onboarding View
              </button>
              <button className={demoMode === "unconnected" ? "active" : ""} onClick={() => setDemoMode("unconnected")}>
                Unconnected View
              </button>
              <button className={demoMode === "connected_no_photo" ? "active" : ""} onClick={() => setDemoMode("connected_no_photo")}>
                Profile (No Photo)
              </button>
              <button className={demoMode === "connected_no_family" ? "active" : ""} onClick={() => setDemoMode("connected_no_family")}>
                Profile (Checklist)
              </button>
              <button className={demoMode === "connected_complete" ? "active" : ""} onClick={() => setDemoMode("connected_complete")}>
                Profile (Hub Mode)
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default NewHome;
