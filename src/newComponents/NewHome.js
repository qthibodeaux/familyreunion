import React, { useState, useEffect, useRef } from "react";
import NewHeroCompactSection from "./sections/NewHeroCompactSection";
import NewFoundationSection from "./sections/NewFoundationSection";
import NewFirstBranchSection from "./sections/NewFirstBranchSection";
import NewCombinedDemoSection from "./sections/NewCombinedDemoSection";
import NewBulletinBoardSection from "./sections/NewBulletinBoardSection";
import NewMosaicSection from "./sections/NewMosaicSection";
import FamilyFinder from "./FamilyFinder";
import { HomeCacheProvider } from "./sections/HomeCacheContext";
import "./NewHome.css";

const LazySlide = ({ children }) => {
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsMounted(true);
          observer.disconnect(); // Keep mounted after it has been seen once
        }
      },
      {
        root: null, // viewport
        rootMargin: "120px", // Pre-fetch slightly early before user arrives
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {isMounted ? children : <div className="slide-loading-placeholder">Loading slide content...</div>}
    </div>
  );
};

const NewHome = () => {

  return (
    <HomeCacheProvider>
      <div className="new-home-container">
        {/* Slide 1: Compact Hero Landing Slide (Loads immediately) */}
        <section className="snap-section">
          <div className="new-slide-card hero-slide-wrapper">
            <NewHeroCompactSection />
          </div>
        </section>

        {/* Slide 2: Root Ancestors Section (Dynamic Welcome & Tribute Plaque) */}
        <section className="snap-section">
          <div className="new-slide-card">
            <LazySlide>
              <NewFoundationSection />
            </LazySlide>
          </div>
        </section>

        {/* Slide 3: First Branch Members */}
        <section className="snap-section">
          <div className="new-slide-card">
            <LazySlide>
              <NewFirstBranchSection />
            </LazySlide>
          </div>
        </section>

        {/* Slide 4: Your Family Line + Heritage (Combined) */}
        <section className="snap-section">
          <div className="new-slide-card">
            <LazySlide>
              <NewCombinedDemoSection />
            </LazySlide>
          </div>
        </section>

        {/* Slide 5: Family Bulletin Board (Status Updates & Activity Feed) */}
        <section className="snap-section">
          <div className="new-slide-card">
            <LazySlide>
              <NewBulletinBoardSection />
            </LazySlide>
          </div>
        </section>

        {/* Slide 6: Family Mosaic */}
        <section className="snap-section">
          <div className="new-slide-card">
            <LazySlide>
              <NewMosaicSection />
            </LazySlide>
          </div>
        </section>

        {/* Slide 7: Family Finder — Carousel + Search/Filter */}
        <section className="snap-section">
          <div className="new-slide-card">
            <LazySlide>
              <FamilyFinder />
            </LazySlide>
          </div>
        </section>
      </div>
    </HomeCacheProvider>
  );
};

export default NewHome;

