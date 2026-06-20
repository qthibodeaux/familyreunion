import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Typography, Avatar, Divider } from "antd";
import { UserOutlined } from "@ant-design/icons";
import FamilyTree from "./FamilyTree";
const { Title, Text } = Typography;

function FirstBranchPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [connections, setConnections] = useState([]);
  const [error, setError] = useState(null);
  const { branchId: userId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profile")
          .select(
            `
            id, firstname, nickname, lastname, avatar_url, ancestor, parent, sunrise, sunset,
            parent_profile:parent (id, firstname, nickname, lastname, avatar_url),
            ancestor_profile:ancestor (id, firstname, nickname, lastname, avatar_url),
            profilestate (
              city,
              state:state_id (state_name)
            )
          `,
          )
          .eq("id", userId);

        if (error) throw error;
        if (data && data.length > 0) setData(data[0]);

        // Fetch connections with profile details in a single query
        const { data: connectionsData, error: connectionError } = await supabase
          .from("connection")
          .select(
            "profile_2, connection_type, profile_2:profile_2 (id, firstname, nickname, lastname, avatar_url, sunrise, sunset)",
          )
          .eq("profile_1", userId);

        if (connectionError) throw connectionError;

        setConnections(connectionsData || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No profile found</div>;

  const fullName = `${data.firstname} ${data.lastname}`;
  const initials = `${data.firstname[0]}${data.lastname[0]}`.toUpperCase();
  const avatarUrl = data.avatar_url
    ? `${supabase.supabaseUrl}/storage/v1/object/public/avatars/${data.avatar_url}`
    : null;

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <Card
        style={{
          backgroundColor: "#5b1f40",
          border: "none",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          overflow: "hidden",
        }}
        styles={{
          body: {
            padding: "24px",
          },
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              marginBottom: "24px",
              display: "flex",
              justifyContent: "center",
              width: "100%",
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "4px solid #f3e7b1",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
            ) : (
              <Avatar
                size={120}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: "#f3e7b1",
                  color: "#5b1f40",
                  fontSize: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "4px solid #f3e7b1",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                }}
              >
                {initials}
              </Avatar>
            )}
          </div>

          {/* Name */}
          <div style={{ marginBottom: "16px", textAlign: "center" }}>
            <div>
              <Title
                level={2}
                style={{
                  color: "#f3e7b1",
                  margin: "0 0 4px 0",
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  lineHeight: 1.2,
                }}
              >
                {data.firstname} {data.nickname && `"${data.nickname}"`}
              </Title>
              <Title
                level={2}
                style={{
                  color: "#f3e7b1",
                  margin: 0,
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  lineHeight: 1.2,
                }}
              >
                {data.lastname}
              </Title>
            </div>
          </div>

          {/* Birth/Death Dates */}
          <div
            style={{
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              maxWidth: "400px",
              gap: "20px",
            }}
          >
            {data.sunrise && (
              <div style={{ paddingLeft: "1.25rem" }}>
                <Text
                  style={{
                    color: "#f3e7b1",
                    fontSize: "16px",
                    fontWeight: 500,
                  }}
                >
                  Sunrise
                </Text>
                <Text
                  style={{
                    color: "#f3e7b1",
                    fontSize: "16px",
                    display: "block",
                  }}
                >
                  {new Date(data.sunrise).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </div>
            )}
            {data.sunset && (
              <div style={{ textAlign: "right", paddingRight: "1.25rem" }}>
                <Text
                  style={{
                    color: "#f3e7b1",
                    fontSize: "16px",
                    fontWeight: 500,
                  }}
                >
                  Sunset
                </Text>
                <Text
                  style={{
                    color: "#f3e7b1",
                    fontSize: "16px",
                    display: "block",
                  }}
                >
                  {new Date(data.sunset).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </div>
            )}
          </div>

          {/* Location */}
          {data.profilestate && (
            <div style={{ marginBottom: "16px" }}>
              <Text style={{ color: "#f3e7b1", fontSize: "16px" }}>
                {data.profilestate.city && `${data.profilestate.city}, `}
                {data.profilestate.state?.state_name || ""}
              </Text>
            </div>
          )}
        </div>
      </Card>

      {/* Family Tree Section */}
      <Card
        style={{
          backgroundColor: "#5b1f40",
          border: "none",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          marginTop: "24px",
          overflow: "hidden",
        }}
        styles={{
          body: {
            padding: "16px",
          },
        }}
      >
        <Title
          level={3}
          style={{
            color: "#f3e7b1",
            marginBottom: "16px",
            textAlign: "center",
          }}
        >
          Family Tree
        </Title>
        <FamilyTree userId={userId} />
      </Card>
    </div>
  );
}

export default FirstBranchPage;
