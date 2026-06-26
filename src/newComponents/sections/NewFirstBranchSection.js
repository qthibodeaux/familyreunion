import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import "./NewFirstBranchSection.css";

import DefaultAvatar from "../../assets/root.png";
import { getAvatarSrc } from "../../utils/avatarHelper";

import { useHomeCache } from "./HomeCacheContext";

const NewFirstBranchSection = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { branchLeaders, setBranchLeaders } = useHomeCache();

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);

      if (branchLeaders) {
        const sorted = [...branchLeaders].sort((a, b) =>
          (a.firstname || "").localeCompare(b.firstname || "")
        );
        setProfiles(sorted);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profile")
        .select("id, firstname, nickname, lastname, avatar_url, branch, sunrise, sunset")
        .eq("branch", 1)
        .order("firstname", { ascending: true });

      if (error) {
        console.error("Error fetching first branch profiles:", error.message);
      } else {
        setProfiles(data);
        const sortedBySunrise = [...data].sort((a, b) => {
          if (!a.sunrise) return 1;
          if (!b.sunrise) return -1;
          return new Date(a.sunrise) - new Date(b.sunrise);
        });
        setBranchLeaders(sortedBySunrise);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, [branchLeaders, setBranchLeaders]);

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
            const imageSrc = getAvatarSrc(profile) || DefaultAvatar;

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
