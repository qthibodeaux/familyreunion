import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import "../../theme/components/Root.css";

const GoldArrowIcon = () => (
  <svg className="gold-arrow-svg" width="14" height="9" viewBox="0 0 14 9" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1.5L7 7.5L13 1.5" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BranchSection = ({ branch, members, profileLookup, initialOpen }) => {
  const navigate = useNavigate();
  const [isGridVisible, setIsGridVisible] = useState(initialOpen);
  const [isExpanded, setIsExpanded] = useState(false);

  const goToProfile = (member) => {
    if (member.branch === 1) {
      navigate(`/branch/${member.id}`);
    } else {
      navigate(`/profile/${member.id}`);
    }
  };

  const toggleGridVisibility = () => {
    setIsGridVisible((prev) => !prev);
  };

  const hasOverflow = members.length > 8;
  const visibleMembers = (hasOverflow && !isExpanded) ? members.slice(0, 7) : members;

  return (
    <div className="branch-section-accordion">
      {/* Branch Accordion Header */}
      <div className="branch-header-card" onClick={toggleGridVisibility}>
        <div className="branch-header-info">
          <span className="branch-title-text">
            {branch === "none" ? "Descendants" : `Branch ${branch}`}
          </span>
          <span className="branch-member-count">({members.length} members)</span>
        </div>
        <span className={`branch-accordion-arrow ${isGridVisible ? "open" : ""}`}>
          <GoldArrowIcon />
        </span>
      </div>

      {/* Branch Accordion Body */}
      <div className={`branch-content-wrapper ${isGridVisible ? "expanded" : "collapsed"}`}>
        {isGridVisible && (
          <>
            <div className="branch-members-grid">
              {visibleMembers.map((member) => {
                const initials =
                  (member.firstname?.[0] || "") + (member.lastname?.[0] || "");

                return (
                  <div
                    key={member.id}
                    className="descendant-profile-block"
                    onClick={() => goToProfile(member)}
                  >
                    <div className="descendant-avatar-container">
                      {member.avatar_url ? (
                        <img
                          className="descendant-avatar"
                          src={member.avatar_url}
                          alt={member.firstname}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="descendant-initials"
                        style={{ display: member.avatar_url ? "none" : "flex" }}
                      >
                        {initials.toUpperCase()}
                      </div>
                    </div>
                    <div className="descendant-name">
                      {member.firstname}
                      {member.nickname && (
                        <>
                          {" "}
                          <span className="nickname-text">'{member.nickname}'</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* "+More" Card */}
              {hasOverflow && !isExpanded && (
                <div
                  className="descendant-profile-block show-more-block"
                  onClick={() => setIsExpanded(true)}
                >
                  <div className="descendant-avatar-container show-more-avatar-container">
                    <div className="descendant-initials show-more-initials">
                      +{members.length - 7}
                    </div>
                  </div>
                  <div className="descendant-name show-more-name">More</div>
                </div>
              )}
            </div>

            {/* "Show Less" Button */}
            {hasOverflow && isExpanded && (
              <div className="show-less-container">
                <button
                  className="show-less-btn"
                  onClick={() => setIsExpanded(false)}
                >
                  Show Less
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BranchSection;
