import React from "react";
import FamilyFinder from "./FamilyFinder";

const InteractiveMemberSearch = () => {
  return (
    <div className="interactive-page-container">
      <section className="search-page-slide">
        <div className="search-page-content">
          <FamilyFinder />
        </div>
      </section>

      <style>{`
        .interactive-page-container {
            height: 100vh;
            background: #fff;
            display: flex;
            flex-direction: column;
        }
        .search-page-slide {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding: 20px;
            overflow: hidden;
        }
        .search-page-content {
            background: #fdfaf3;
            border-radius: 30px;
            padding: 20px 0;
            height: 100%;
            box-shadow: 0 10px 30px rgba(91, 31, 64, 0.05);
            display: flex;
            flex-direction: column;
        }
      `}</style>
    </div>
  );
};

export default InteractiveMemberSearch;

