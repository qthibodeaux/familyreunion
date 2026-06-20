import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { DownOutlined, RightOutlined } from "@ant-design/icons";
import "../theme/components/FamilyTree.css";

import { useNavigate } from "react-router-dom";

const ProfileBlock = ({ profile }) => {
  const navigate = useNavigate();
  const initials =
    `${profile.firstname?.[0] || ""}${profile.lastname?.[0] || ""}`.toUpperCase();

  const handleProfileClick = () => {
    if (Number(profile.branch) === 1) {
      navigate(`/branch/${profile.id}`);
    } else {
      navigate(`/profile/${profile.id}`);
    }
  };

  return (
    <div
      className="profile-block"
      onClick={handleProfileClick}
      style={{ cursor: "pointer" }}
    >
      <div className="avatar-container">
        {profile.avatar_url ? (
          <img
            src={`${supabase.supabaseUrl}/storage/v1/object/public/avatars/${profile.avatar_url}`}
            alt={profile.firstname}
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="initials"
          style={{ display: profile.avatar_url ? "none" : "flex" }}
        >
          {initials}
        </div>
      </div>
      <div className="name">{profile.firstname}</div>
    </div>
  );
};

// Recursive generation builder
const buildGenerations = (profiles, rootId, generation = 1, acc = {}) => {
  const children = profiles.filter((p) => p.parent === rootId);
  if (!children.length) return acc;

  if (!acc[generation]) acc[generation] = [];
  children.sort((a, b) => new Date(a.sunrise) - new Date(b.sunrise));
  acc[generation].push(...children);

  for (const child of children) {
    buildGenerations(profiles, child.id, generation + 1, acc);
  }

  return acc;
};

const FamilyTree = ({ userId }) => {
  const [rootProfile, setRootProfile] = useState(null);
  const [generations, setGenerations] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTree = async () => {
      setLoading(true);
      try {
        const { data: root, error: rootError } = await supabase
          .from("profile")
          .select("*")
          .eq("id", userId)
          .single();

        if (rootError) throw rootError;

        const { data: allProfiles, error: allError } = await supabase
          .from("profile")
          .select("*")
          .not("parent", "is", null);

        if (allError) throw allError;

        setRootProfile(root);
        const grouped = buildGenerations(allProfiles, root.id);
        setGenerations(grouped);

        const defaultExpanded = Object.keys(grouped).reduce((acc, gen) => {
          acc[gen] = true;
          return acc;
        }, {});
        setExpanded(defaultExpanded);
      } catch (err) {
        console.error(err);
        setError("Failed to load family tree");
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchTree();
  }, [userId]);

  const toggleGen = (gen) => {
    setExpanded((prev) => ({ ...prev, [gen]: !prev[gen] }));
  };

  if (loading)
    return <div className="tree-message">Loading family tree...</div>;
  if (error) return <div className="tree-message error">{error}</div>;

  return (
    <div className="family-tree-container">
      {Object.entries(generations).map(([gen, profiles]) => (
        <div key={gen} className="generation-section">
          <div className="generation-header" onClick={() => toggleGen(gen)}>
            {expanded[gen] ? <DownOutlined /> : <RightOutlined />}
            <span className="generation-title">Generation {gen}</span>
          </div>
          {expanded[gen] && (
            <div className="generation-grid">
              {profiles.map((profile) => (
                <ProfileBlock key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FamilyTree;
