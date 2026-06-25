import React from "react";
import NewHeroCompactSection from "./sections/NewHeroCompactSection";
import NewFoundationSection from "./sections/NewFoundationSection";
import NewFirstBranchSection from "./sections/NewFirstBranchSection";
import NewCombinedDemoSection from "./sections/NewCombinedDemoSection";
import NewBulletinBoardSection from "./sections/NewBulletinBoardSection";
import NewMosaicSection from "./sections/NewMosaicSection";
import FamilyFinder from "./FamilyFinder";
import "./NewHome.css";

const NewHome = () => {

  return (
    <div className="new-home-container">
      {/* Slide 1: Compact Hero Landing Slide */}
      <section className="snap-section">
        <div className="new-slide-card hero-slide-wrapper">
          <NewHeroCompactSection />
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


    </div>
  );
};

export default NewHome;
