import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "./NewFirstBranchSection.css";

// Local Images
import Alma from "../../assets/alma.jpg";
import Ben from "../../assets/ben.jpg";
import Bobbie from "../../assets/bobbie.jpg";
import Hazel from "../../assets/hazel.jpg";
import James from "../../assets/james.jpg";
import John from "../../assets/john.jpg";
import Joyce from "../../assets/joyce.jpg";
import Lorene from "../../assets/lorene.jpg";
import Loretta from "../../assets/loretta.jpg";
import Mary from "../../assets/mary.jpg";
import Sylvester from "../../assets/sylvester.jpg";
import DefaultAvatar from "../../assets/root.png";

// Firstname-to-image map
const imageMap = {
  alma: Alma,
  ben: Ben,
  bobbie: Bobbie,
  hazel: Hazel,
  james: James,
  john: John,
  joyce: Joyce,
  lorene: Lorene,
  loretta: Loretta,
  mary: Mary,
  sylvester: Sylvester,
};

const NewFirstBranchSection = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profile")
        .select("id, firstname")
        .eq("branch", 1)
        .order("firstname", { ascending: true });

      if (error) {
        console.error("Error fetching first branch profiles:", error.message);
      } else {
        setProfiles(data);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, []);

  const goToProfile = (id) => {
    navigate(`/branch/${id}`);
  };

  return (
    <div className="new-first-branch-container">
      {/* Decorative Tree Branch Ornament */}
      <div className="branch-ornament">
        <svg viewBox="0 0 100 30" className="ornament-svg">
          <path
            d="M 10,15 C 30,10 40,20 50,15 C 60,10 70,20 90,15"
            fill="none"
            stroke="#5b1f40"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M 30,12 C 28,6 34,4 36,10 C 38,16 32,18 30,12 Z" fill="#5b1f40" />
          <path d="M 50,15 C 52,9 58,7 60,13 C 62,19 56,21 50,15 Z" fill="#5b1f40" />
          <path d="M 70,17 C 68,23 62,25 60,19 C 58,13 64,11 70,17 Z" fill="#5b1f40" />
        </svg>
      </div>

      <div className="new-first-branch-header">
        <h2 className="new-first-branch-title">The First Branch</h2>
        <p className="new-first-branch-subtitle">
          The children of John Henry and Birdie Mae, whose branches continue to blossom.
        </p>
      </div>

      {loading ? (
        <div className="new-first-branch-loading">
          <div className="custom-loader"></div>
        </div>
      ) : (
        <div className="new-first-branch-grid">
          {profiles.map((profile) => {
            const firstWord = (profile.firstname || "").trim().split(/\s+/)[0].toLowerCase();
            const imageSrc = imageMap[firstWord] || DefaultAvatar;

            return (
              <div
                key={profile.id}
                className="new-first-branch-item"
                onClick={() => goToProfile(profile.id)}
              >
                <div className="new-first-branch-avatar-wrapper">
                  <img
                    src={imageSrc}
                    alt={profile.firstname}
                    className="new-first-branch-avatar"
                  />
                </div>
                <span className="new-first-branch-name">{profile.firstname}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NewFirstBranchSection;
