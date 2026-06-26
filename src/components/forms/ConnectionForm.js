import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { message } from "antd";
import { supabase } from "../../supabaseClient";
import AuthConsumer from "../../useSession";
import useParentDirector from "../director/useParentDirector";

function ConnectionForm() {
  useParentDirector();
  const { type, userid } = useParams();
  const [value, setValue] = useState("");
  const [showError, setShowError] = useState(false);
  const [profile, setProfile] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const navigate = useNavigate();
  const { session } = AuthConsumer();

  const goToProfile = () => navigate(`/profile/${session.user.id}`);
  const goToCreate = (createType) => navigate(`/createform/${createType}`);

  const onChange = (event) => {
    if (value === "") setShowError(true);
    else setShowError(false);

    setValue(event.target.value);
  };

  async function namesearch() {
    setProfile([]);
    setShowError(false); // Reset error state
    if (value === "") return setShowError(true);

    setLoading(true); // Set loading state to true before starting the search

    try {
      let query = supabase
        .from("profile")
        .select("*")
        .or(
          `firstname.ilike.%${value}%,nickname.ilike.%${value}%,lastname.ilike.%${value}%`,
        );

      // Exclude Branch 0 for parent/smithparent, exclude Branch 0 and 1 for spouse/child, but allow NULL branches for all
      if (type === "spouse" || type === "child") {
        query = query.or("branch.gt.1,branch.is.null");
      } else {
        query = query.or("branch.neq.0,branch.is.null");
      }

      let { data, error } = await query.order("sunrise", { ascending: true });

      if (error) {
        throw error;
      }

      if (data.length === 0) {
        setShowError(true); // Show error if no profiles are found
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error searching profiles:", error.message);
      setShowError(true); // Show error if an error occurs
    } finally {
      setLoading(false); // Set loading state to false after the search is complete
    }
  }

  async function getAllProfiles() {
    console.log("we gettin them all");
    setProfile([]);
    setLoading(true); // Set loading state to true before starting the search

    try {
      let query = supabase
        .from("profile")
        .select("*");

      // Exclude Branch 0 for parent/smithparent, exclude Branch 0 and 1 for spouse/child, but allow NULL branches for all
      if (type === "spouse" || type === "child") {
        query = query.or("branch.gt.1,branch.is.null");
      } else {
        query = query.or("branch.neq.0,branch.is.null");
      }

      let { data, error } = await query;

      if (error) {
        throw error;
      }

      console.log("data results", data);

      if (data.length === 0) {
        setShowError(true); // Show error if no profiles are found
        console.log("No profiles found");
      } else {
        setProfile(data);
        console.log("data results", data);
      }
    } catch (error) {
      console.error("Error searching profiles:", error.message);
      setShowError(true); // Show error if an error occurs
    } finally {
      setLoading(false); // Set loading state to false after the search is complete
    }
  }

  const handleShowMore = () => {
    setShowMore(true);
  };

  const displayProfile = showMore ? profile : profile.slice(0, 5);

  const handleProfileClick = (id) => {
    setSelectedProfileId(id);
  };

  const handleConfirm = async () => {
    try {
      const selectedProfile = profile.find((p) => p.id === selectedProfileId);
      const isClaimed = selectedProfile && selectedProfile.email;
      const isDeceased = selectedProfile && selectedProfile.sunset;
      const isBranch1 = selectedProfile && selectedProfile.branch === 1;

      // Auto-connect if not claimed, OR if deceased, OR if Branch 1 (admin/master branch)
      const autoConnect = !isClaimed || isDeceased || isBranch1;

      const childType = "child";
      const parentType = "parent";
      const spouseType = "spouse";

      if (type === "smithparent") {
        if (!autoConnect) {
          // Send consensual request, do NOT update parent field yet
          const { error: connError } = await supabase.from("connection").insert({
            profile_1: selectedProfileId,
            profile_2: userid,
            connection_type: childType,
            status: "pending",
            requested_by: userid,
          });
          if (connError) throw connError;

          // Insert notification
          await supabase.from("notification").insert({
            recipient_id: selectedProfileId,
            actor_id: userid,
            action_type: "connection_request",
            target_id: selectedProfileId
          });

          message.success("Parent request sent! Waiting for their approval.");
        } else {
          // Standard active connection and parent update
          const { error } = await supabase
            .from("profile")
            .update({ parent: selectedProfileId })
            .eq("id", userid);
          if (error) throw error;

          const { error: connError } = await supabase.from("connection").insert({
            profile_1: selectedProfileId,
            profile_2: userid,
            connection_type: childType,
            status: "active",
          });
          if (connError) throw connError;
          message.success("Connection added successfully!");
        }
      } else {
        const connStatus = autoConnect ? "active" : "pending";
        const requestedBy = autoConnect ? null : userid;

        if (type === "parent") {
          // Insert parent connection
          const { error: parentError } = await supabase
            .from("connection")
            .insert({
              profile_1: userid,
              profile_2: selectedProfileId,
              connection_type: parentType,
              status: connStatus,
              requested_by: requestedBy,
            });
          if (parentError) throw parentError;

          // Insert child connection
          const { error: childError } = await supabase
            .from("connection")
            .insert({
              profile_1: selectedProfileId,
              profile_2: userid,
              connection_type: childType,
              status: connStatus,
              requested_by: requestedBy,
            });
          if (childError) throw childError;
        } else if (type === "spouse") {
          // Insert spouse connection (both directions)
          const { error: spouseError1 } = await supabase
            .from("connection")
            .insert({
              profile_1: userid,
              profile_2: selectedProfileId,
              connection_type: spouseType,
              status: connStatus,
              requested_by: requestedBy,
            });
          if (spouseError1) throw spouseError1;

          const { error: spouseError2 } = await supabase
            .from("connection")
            .insert({
              profile_1: selectedProfileId,
              profile_2: userid,
              connection_type: spouseType,
              status: connStatus,
              requested_by: requestedBy,
            });
          if (spouseError2) throw spouseError2;
        } else if (type === "child") {
          // Insert child connection
          const { error: childError } = await supabase
            .from("connection")
            .insert({
              profile_1: userid,
              profile_2: selectedProfileId,
              connection_type: childType,
              status: connStatus,
              requested_by: requestedBy,
            });
          if (childError) throw childError;

          // Insert parent connection
          const { error: parentError } = await supabase
            .from("connection")
            .insert({
              profile_1: selectedProfileId,
              profile_2: userid,
              connection_type: parentType,
              status: connStatus,
              requested_by: requestedBy,
            });
          if (parentError) throw parentError;
        }

        if (connStatus === "pending") {
          // Insert notification
          await supabase.from("notification").insert({
            recipient_id: selectedProfileId,
            actor_id: userid,
            action_type: "connection_request",
            target_id: selectedProfileId
          });
          message.success("Connection request sent! Waiting for their approval.");
        } else {
          message.success("Connection added successfully!");
        }
      }

      goToProfile();
    } catch (error) {
      console.error("Error updating profile:", error.message);
      message.error("Failed to create connection: " + error.message);
    }
  };

  const getHeadingText = () => {
    switch (type) {
      case "smithparent":
        return "Does your Smith side parent have a profile?";
      case "parent":
        return "Does your parent have a profile?";
      case "spouse":
        return "Does your spouse have a profile?";
      case "child":
        return "Does your child have a profile?";
      default:
        return "Does the profile exist?";
    }
  };

  return (
    <div>
      <div>
        <div gap="medium">
          <h1 textAlign="center">{getHeadingText()}</h1>
          <div gap="medium">
            <input type="text" onChange={onChange} />
            <div style={{ visibility: showError ? "visible" : "hidden" }}>
              <p color="red" weight="bold">
                Required
              </p>
            </div>
            <div direction="row" justify="center" gap="medium">
              <div
                width="small"
                pad="medium"
                background="#84543C"
                round="small"
              >
                <button plain disabled={loading}>
                  <p color="#F7DC92" weight="bold" onClick={() => namesearch()}>
                    Search
                  </p>
                </button>
              </div>
              <div
                width="small"
                pad="medium"
                background="#84543C"
                round="small"
              >
                <button plain>
                  <p
                    color="#F7DC92"
                    weight="bold"
                    onClick={() => goToCreate(type)}
                  >
                    Create Profile
                  </p>
                </button>
              </div>
              <button label="getall" onClick={() => getAllProfiles()} />
            </div>

            <div>
              {loading ? (
                <p>Loading...</p>
              ) : (
                profile.length !== 0 && (
                  <div
                    pad="medium"
                    round="small"
                    height="medium"
                    overflow="auto"
                  >
                    {profile.length > 0 ? (
                      <>
                        <li
                          data={displayProfile}
                          primaryKey="firstname"
                          secondaryKey="nickname"
                        >
                          {(profile) => (
                            <div
                              direction="row"
                              justify="between"
                              align="center"
                              pad="small"
                              background={
                                selectedProfileId === profile.id
                                  ? "light-3"
                                  : "white"
                              }
                              onClick={() => handleProfileClick(profile.id)}
                              key={profile.id}
                            >
                              <p>
                                {profile.firstname} {profile.nickname}{" "}
                                {profile.lastname}
                              </p>
                              {selectedProfileId === profile.id && (
                                <button
                                  label="Confirm"
                                  onClick={handleConfirm}
                                />
                              )}
                            </div>
                          )}
                        </li>
                        {!showMore && profile.length > 5 && (
                          <div
                            margin={{ top: "medium" }}
                            width="small"
                            pad="medium"
                            background="#84543C"
                            round="small"
                            align="center"
                            alignSelf="center"
                          >
                            <button plain>
                              <p
                                color="#F7DC92"
                                weight="bold"
                                onClick={() => handleShowMore()}
                              >
                                {" "}
                                +{profile.length - 5} more{" "}
                              </p>
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p>
                        No results found. You can try to create the profile.
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
        <div pad="large" onClick={goToProfile}>
          <p textAlign="center" weight="bold" size="large">
            Back
          </p>
        </div>
      </div>
    </div>
  );
}

export default ConnectionForm;
