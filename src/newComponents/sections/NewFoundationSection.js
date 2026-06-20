import React from "react";
import { useNavigate } from "react-router-dom";
import AuthConsumer from "../../useSession";
import "./NewFoundationSection.css";

const NewFoundationSection = () => {
  const { session, profile } = AuthConsumer();
  const navigate = useNavigate();

  // Determine dynamic portal contents based on authentication state
  const getPortalContent = () => {
    if (!session) {
      return {
        subtext: "Every member adds a leaf to our tree.",
        inviteText: "Join us in preserving their legacy.",
        buttonText: "Join Us",
        buttonClass: "portal-btn-join",
        action: () => navigate("/register"),
      };
    }

    if (!profile?.firstname) {
      return {
        subtext: "Thank you for creating an account!",
        inviteText: "Let's complete your family connection.",
        buttonText: "Update Profile",
        buttonClass: "portal-btn-update",
        action: () => navigate("/onboarding"),
      };
    }

    return {
      subtext: `Welcome back, ${profile.firstname}.`,
      inviteText: "Thank you for carrying our story forward.",
      buttonText: "View Profile",
      buttonClass: "portal-btn-view",
      action: () => navigate(`/profile/${session.user.id}`),
    };
  };

  const portal = getPortalContent();

  return (
    <div className="new-foundation-container">
      {/* Single Unified Plaque */}
      <div className="foundation-card">
        {/* Dynamic Invitation Flow (At the top) */}
        <div className="foundation-invite-flow">
          <span className="invite-subtext">{portal.subtext}</span>
          <span className="invite-highlight">{portal.inviteText}</span>
          <button className={`portal-action-btn ${portal.buttonClass}`} onClick={portal.action}>
            {portal.buttonText}
          </button>
        </div>

        {/* Soft elegant separator */}
        <div className="card-divider"></div>

        {/* Tribute Statement (Centered) */}
        <div className="foundation-tribute">
          <h3 className="foundation-title">Our Family's Foundation</h3>
          <p className="foundation-text">
            With unwavering love and enduring strength, John Henry and Birdie Mae
            planted the seeds of our family tree. Their legacy of love, resilience,
            and unity continues to grow through each generation, creating an
            unbreakable bond that time cannot diminish.
          </p>
          <div className="foundation-signature">
            ~ The Family of John Henry & Birdie Mae ~
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewFoundationSection;
