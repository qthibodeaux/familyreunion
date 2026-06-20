import { useRef, useState, useEffect } from "react";
import { AutoComplete, Button, Card, Col, Input, Row, Typography } from "antd";
import {
  updateFamilyBranch,
  updateAncestorReference,
} from "../../utils/familyTree";
import { getAvatarSrc } from "../../utils/avatarHelper";
import { supabase } from "../../supabaseClient";
import { useNavigate, useParams } from "react-router-dom";
import AuthConsumer from "../../useSession";
import useParentDirector from "../director/useParentDirector";
import { format } from "date-fns";

const connectionTitles = {
  smithparent: "Who is your Smith family parent?",
  parent: "Who is your parent?",
  spouse: "Who is your spouse/partner?",
  child: "Who is your child?",
};

const connectionMessages = {
  smithparent: "Search for your Smith family parent",
  parent: "Search for your parent",
  spouse: "Who is your spouse/partner?",
  child: "Who is your child?",
};

const isSmithParent = (type) => type === "smithparent";

function ParentForm() {
  useParentDirector();
  const navigate = useNavigate();
  const { session } = AuthConsumer();
  const { Title } = Typography;
  const { type, userid } = useParams();

  const goToProfile = () => navigate(`/profile/${session.user.id}`);
  const goToProfileForm = () => navigate(`/profileform/${type}/${userid}`);

  const [options, setOptions] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState("");
  const [formattedSunrise, setFormattedSunrise] = useState("");
  const [formattedSunset, setFormattedSunset] = useState("");

  const debounceTimeout = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const handleSearch = (value) => {
    setInputValue(value);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      if (value) {
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

        const { data, error } = await query.order("sunrise", { ascending: true });

        if (!error) {
          const formattedOptions = data.map((profile) => ({
            value: `${profile.firstname} ${
              profile.nickname ? `(${profile.nickname})` : ""
            } ${profile.lastname}`,
            label: `${profile.firstname} ${
              profile.nickname ? `(${profile.nickname})` : ""
            } ${profile.lastname}`,
            profile: profile,
          }));
          setOptions(formattedOptions);
        }
      } else {
        setOptions([]);
      }
    }, 300);
  };

  const handleSelect = (value) => {
    const selected = options.find((option) => option.value === value);
    if (selected) {
      setSelectedProfile(selected.profile);

      let fSunrise = selected.sunrise ? format(new Date(selected.sunrise), "MMMM d, yyyy") : "Unknown";
      let fSunset = selected.profile.sunset
        ? format(new Date(selected.profile.sunset), "MMMM d, yyyy")
        : null;

      setFormattedSunrise(fSunrise);
      setFormattedSunset(fSunset);
    }
  };

  const handleReset = () => {
    setOptions([]);
    setSelectedProfile(null);
    setInputValue("");
  };

  const handleConfirm = async () => {
    try {
      // Check if a connection already exists
      const { data: existingConnections, error: checkError } = await supabase
        .from("connection")
        .select("*")
        .or(
          `and(profile_1.eq.${selectedProfile.id},profile_2.eq.${userid},connection_type.eq.child),and(profile_1.eq.${userid},profile_2.eq.${selectedProfile.id},connection_type.eq.parent)`,
        );

      if (checkError) throw checkError;

      // Only create new connections if they don't exist
      if (existingConnections.length === 0) {
        // Determine the correct connection direction based on type
        let connectionData;

        if (type === "child") {
          // For child connections:
          // - profile_1 is the parent
          // - profile_2 is the child
          connectionData = [
            {
              profile_1: userid,
              profile_2: selectedProfile.id,
              connection_type: "child",
            },
            {
              profile_1: selectedProfile.id,
              profile_2: userid,
              connection_type: "parent",
            },
          ];
        } else {
          // For parent and smithparent connections:
          // - profile_1 is the parent
          // - profile_2 is the child
          connectionData = [
            {
              profile_1: selectedProfile.id,
              profile_2: userid,
              connection_type: "child",
            },
            {
              profile_1: userid,
              profile_2: selectedProfile.id,
              connection_type: "parent",
            },
          ];
        }

        // Insert connections
        const { error: connectionError } = await supabase
          .from("connection")
          .insert(connectionData);

        if (connectionError) throw connectionError;
      }

      // For smithparent connections, update the profile's parent field and handle branches
      if (isSmithParent(type) || type === "parent") {
        // 1. Get the parent's branch and ancestor info
        const { data: parentProfile, error: parentProfileError } =
          await supabase
            .from("profile")
            .select("branch, ancestor")
            .eq("id", selectedProfile.id)
            .single();

        if (parentProfileError) throw parentProfileError;

        // 2. Determine the new branch number
        let newBranch = null;
        if (parentProfile.branch !== null && parentProfile.branch !== undefined) {
          newBranch = parentProfile.branch + 1;
        }

        // 3. Update the current user's profile with parent, branch, and ancestor info
        const { error: updateError } = await supabase
          .from("profile")
          .update({
            parent: selectedProfile.id,
            branch: newBranch,
            ancestor: parentProfile.ancestor || selectedProfile.id, // If parent has no ancestor, use parent's ID as ancestor
          })
          .eq("id", userid);

        if (updateError) throw updateError;

        // 4. If this is a new branch, update all descendants with the new branch numbers
        if (parentProfile.ancestor === null) {
          // This is a new branch, so update all descendants
          await updateFamilyBranch(userid, newBranch);
        }

        // 5. Update ancestor reference for all descendants if this is a new root
        await updateAncestorReference(
          userid,
          parentProfile.ancestor || selectedProfile.id,
        );
      }

      goToProfile();
    } catch (error) {
      console.error("Error creating connection:", error);
      // Handle error (show toast/notification)
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <Card
        style={{
          background: "#5b1f40",
          border: "none",
          borderRadius: "8px",
          padding: "8px",
        }}
      >
        <Title level={3} style={{ textAlign: "center", color: "#f3e7b1" }}>
          {connectionTitles[type] || "Add Connection"}
        </Title>
        <p
          style={{
            textAlign: "center",
            color: "#f3e7b1",
            marginBottom: "1rem",
          }}
        >
          {connectionMessages[type] || "Search for this person in the family"}
        </p>

        {selectedProfile && (
          <Col>
            <Row>
              <Col>
                <div
                  style={{
                    width: "5rem",
                    height: "5rem",
                    borderRadius: "8px",
                    overflow: "hidden",
                    backgroundColor: selectedProfile.avatar_url
                      ? "transparent"
                      : "#EABEA9",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {getAvatarSrc(selectedProfile) ? (
                    <img
                      src={getAvatarSrc(selectedProfile)}
                      alt={`${selectedProfile.firstname} ${selectedProfile.lastname}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      display: getAvatarSrc(selectedProfile) ? "none" : "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "100%",
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#5B1F40",
                    }}
                  >
                    {`${selectedProfile.firstname?.[0] || ""}${selectedProfile.lastname?.[0] || ""}`.toUpperCase()}
                  </div>
                </div>
              </Col>
              <Col>
                <Row style={{ marginLeft: "1rem" }}>
                  <Col span={24}>
                    <div
                      style={{
                        fontWeight: "bold",
                        fontSize: "1.5rem",
                        color: "#f3e7b1",
                      }}
                    >
                      {selectedProfile.nickname
                        ? `${selectedProfile.firstname} ${selectedProfile.nickname}`
                        : selectedProfile.firstname}
                    </div>
                  </Col>
                </Row>
                <Row style={{ marginLeft: "1rem" }}>
                  <Col span={24}>
                    <div
                      style={{
                        fontWeight: "bold",
                        fontSize: "1.5rem",
                        color: "#f3e7b1",
                      }}
                    >
                      {selectedProfile.lastname}
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
            <Row style={{ marginTop: ".3rem" }}>
              <Col span={12}>
                <Row style={{ color: "#f3e7b1" }}>Sunrise</Row>
                <Row style={{ color: "white" }}>{formattedSunrise}</Row>
              </Col>
              <Col span={12}>
                {formattedSunset && (
                  <div>
                    <Row justify="end" style={{ color: "#f3e7b1" }}>
                      Sunset
                    </Row>
                    <Row justify="end" style={{ color: "white" }}>
                      {formattedSunset}
                    </Row>
                  </div>
                )}
              </Col>
            </Row>
            <Row justify="center" style={{ marginTop: ".5rem" }}>
              <Col>
                <Button
                  type="primary"
                  style={{
                    color: "#873D62",
                    background: "#F7DC92",
                    border: ".15rem solid #EABEA9",
                    fontWeight: "bold",
                  }}
                  onClick={handleConfirm}
                >
                  {type === "parent" ? "Choose" : "Connect with"}{" "}
                  {selectedProfile.nickname || selectedProfile.firstname}
                </Button>
              </Col>
            </Row>
          </Col>
        )}

        <AutoComplete
          options={options}
          onSearch={handleSearch}
          placeholder={connectionMessages[type] || "Search for names"}
          onSelect={handleSelect}
          value={inputValue}
          style={{ marginTop: ".5rem", width: "100%" }}
          filterOption={(inputValue, option) =>
            option.value.toLowerCase().includes(inputValue.toLowerCase())
          }
        >
          <Input
            ref={inputRef}
            style={{
              background: "#6c254c",
              border: "none",
              color: "#f3e7b1",
              fontWeight: "bold",
              fontSize: "1.5rem",
              borderRadius: "0",
            }}
          />
        </AutoComplete>

        <Row justify="center" gutter={16} style={{ marginTop: "2rem" }}>
          <Col>
            <Button
              style={{
                color: "#F7DC92",
                background: "none",
                border: ".15rem solid #EABEA9",
                fontWeight: "bold",
              }}
              onClick={handleReset}
            >
              Reset
            </Button>
          </Col>
          <Col>
            <Button
              type="primary"
              style={{
                color: "#873D62",
                background: "#F7DC92",
                border: ".15rem solid #EABEA9",
                fontWeight: "bold",
              }}
              onClick={goToProfileForm}
            >
              Create Profile
            </Button>
          </Col>
        </Row>

        <Row justify="center" style={{ marginTop: "24px" }}>
          <Button
            onClick={goToProfile}
            style={{
              background: "none",
              border: "solid #EABEA9",
              color: "#F7DC92",
              fontWeight: "bold",
            }}
          >
            Back
          </Button>
        </Row>
      </Card>
    </div>
  );
}

export default ParentForm;
