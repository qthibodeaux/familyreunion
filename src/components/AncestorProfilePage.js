import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import RootCard from "./partial/RootCard";
import BranchSection from "./partial/BranchSection";
import "../theme/components/Root.css";

const AncestorProfilePage = () => {
  const [branches, setBranches] = useState({});
  const [profileLookup, setProfileLookup] = useState({});
  const [showMore, setShowMore] = useState({}); // State for individual branch show/hide

  useEffect(() => {
    const fetchBranchMembers = async () => {
      const { data, error } = await supabase
        .from("profile")
        .select("id, firstname, lastname, nickname, branch, avatar_url, parent");

      if (error) {
        console.error("Error fetching profiles:", error);
        return;
      }

      const profilesWithAvatars = await Promise.all(
        data.map(async (profile) => {
          if (profile.avatar_url) {
            try {
              const { data: avatarData } = await supabase.storage
                .from("avatars")
                .getPublicUrl(profile.avatar_url);

              return {
                ...profile,
                avatar_url: avatarData.publicUrl,
              };
            } catch (error) {
              console.error("Error fetching avatar URL:", error);
              return profile;
            }
          }
          return profile;
        }),
      );

      // Build lookup map for all profiles (roots + descendants)
      const lookup = {};
      profilesWithAvatars.forEach((p) => {
        lookup[p.id] = p;
      });
      setProfileLookup(lookup);

      // Group only branch members (exclude branch 0 / founders from main sections list)
      const branchMembers = profilesWithAvatars.filter(
        (p) => p.branch !== 0 && p.branch !== null && p.branch !== undefined
      );

      const grouped = branchMembers.reduce((acc, item) => {
        acc[item.branch] = [...(acc[item.branch] || []), item];
        return acc;
      }, {});

      setBranches(grouped);
    };

    fetchBranchMembers();
  }, []);

  return (
    <div className="root-container">
      <RootCard />

      {Object.entries(branches).map(([branch, members]) => (
        <BranchSection
          key={branch}
          branch={branch}
          members={members}
          profileLookup={profileLookup}
          showMore={showMore}
          setShowMore={setShowMore}
          initialOpen={branch === "1"}
        />
      ))}
    </div>
  );
};

export default AncestorProfilePage;
