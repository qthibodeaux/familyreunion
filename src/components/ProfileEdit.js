import { useEffect, useState } from "react";
import {
  Button,
  Row,
  Typography,
  Form,
  Input,
  Avatar,
  Space,
  message,
  Card,
  DatePicker,
  Switch,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import dayjs from "dayjs";
import "./ProfileEdit.css"; // Force rebuild trigger

const { Title } = Typography;

function ProfileEdit() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { userId } = useParams();
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState("");
  const [connections, setConnections] = useState([]);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    fetchProfileData();
    fetchConnections();
  }, [userId]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profile")
        .select(
          `
          id, 
          firstname, 
          nickname, 
          lastname, 
          avatar_url,
          ancestor,
          parent,
          sunrise,
          sunset,
          is_locked,
          lock_media_comments,
          parent_profile:parent (id, firstname, nickname, lastname),
          ancestor_profile:ancestor (id, firstname, nickname, lastname),
          profilestate (
            city,
            state:state_id (state_name)
          )
        `,
        )
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfileData(data);
        form.setFieldsValue({
          firstname: data.firstname,
          lastname: data.lastname,
          nickname: data.nickname,
          city: data.profilestate?.city,
          state: data.profilestate?.state?.state_name,
          sunrise: data.sunrise ? dayjs(data.sunrise) : null,
          sunset: data.sunset ? dayjs(data.sunset) : null,
          parent: data.parent_profile
            ? `${data.parent_profile.firstname} ${data.parent_profile.lastname}`
            : "No Parent",
          is_locked: data.is_locked,
          lock_media_comments: data.lock_media_comments,
        });

        if (data.avatar_url) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("avatars").getPublicUrl(data.avatar_url);
          setImageUrl(publicUrl);
        }
      }
    } catch (error) {
      message.error("Error fetching profile data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from("connection")
        .select(
          `
          profile_2 (id, firstname, lastname, avatar_url),
          connection_type
        `,
        )
        .eq("profile_1", userId);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      message.error("Error fetching connections");
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      const { error } = await supabase
        .from("profile")
        .update({
          firstname: values.firstname,
          lastname: values.lastname,
          nickname: values.nickname,
          sunrise: values.sunrise?.toISOString(),
          sunset: values.sunset?.toISOString(),
          is_locked: values.is_locked || false,
          lock_media_comments: values.lock_media_comments || false,
        })
        .eq("id", userId);

      if (error) throw error;

      message.success("Profile updated successfully");
      setIsEditing(false);
      fetchProfileData();
    } catch (error) {
      message.error("Error updating profile");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const removeConnection = async (connection) => {
    try {
      // Remove both directions of the connection
      const { error: error1 } = await supabase
        .from("connection")
        .delete()
        .eq("profile_1", userId)
        .eq("profile_2", connection.profile_2.id);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from("connection")
        .delete()
        .eq("profile_1", connection.profile_2.id)
        .eq("profile_2", userId);

      if (error2) throw error2;

      // If this was a parent-child relationship, clear the parent reference
      if (
        connection.connection_type === "parent" ||
        connection.connection_type === "child"
      ) {
        const { error: error3 } = await supabase
          .from("profile")
          .update({ parent: null })
          .eq(
            "id",
            connection.connection_type === "parent"
              ? userId
              : connection.profile_2.id,
          );

        if (error3) throw error3;
      }

      message.success("Connection removed successfully");
      fetchConnections();
    } catch (error) {
      message.error("Error removing connection");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="profile-bezel-card profile-edit-bezel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f3e7b1' }}>
        Loading Profile Info...
      </div>
    );
  }

  const handleBack = () => {
    navigate(`/profile/${userId}`);
  };

  const goToResidence = () => {
    navigate(`/residenceform/${userId}`);
  };

  return (
    <div className="profile-bezel-card profile-edit-bezel" style={{ padding: "24px", overflowY: "auto", height: "100%" }}>
      <div className="profile-edit-container" style={{ width: "100%", maxWidth: "480px", margin: "0 auto", paddingBottom: "40px" }}>
        <div className="profile-edit-header">
          <div className="profile-edit-header-left">
            <button className="profile-edit-back-btn" onClick={handleBack} title="Back to Profile">
              <ArrowLeftOutlined />
            </button>
            <Title level={2} className="profile-edit-title">Profile Info</Title>
          </div>
          <Button
            className={isEditing ? "profile-edit-cancel-btn" : "profile-edit-action-btn"}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        </div>

        <Form form={form} layout="vertical" style={{ width: "100%" }}>
          {/* Card 1: Personal Details */}
          <Card className="profile-edit-card" style={{ width: "100%", marginBottom: "2rem" }}>
            <Space direction="vertical" style={{ width: "100%" }} size="large">
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <Avatar
                  size={120}
                  src={imageUrl}
                  className="profile-edit-avatar-border"
                  style={{ marginBottom: "1.5rem" }}
                />
                {isEditing && (
                  <div>
                    <Button
                      onClick={() => navigate(`/antavatar/${userId}`)}
                      className="profile-edit-action-btn"
                    >
                      Change Avatar
                    </Button>
                  </div>
                )}
              </div>

              <Form.Item
                name="firstname"
                label="First Name"
                style={{ marginBottom: "1.5rem" }}
              >
                <Input
                  disabled={!isEditing}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="lastname"
                label="Last Name"
                style={{ marginBottom: "1.5rem" }}
              >
                <Input
                  disabled={!isEditing}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="nickname"
                label="Nickname"
                style={{ marginBottom: "1.5rem" }}
              >
                <Input
                  disabled={!isEditing}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="sunrise"
                label="Birth Date"
                style={{ marginBottom: "1.5rem" }}
              >
                <DatePicker
                  disabled={!isEditing}
                  style={{ width: "100%" }}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="sunset"
                label="Death Date"
                style={{ marginBottom: "1.5rem" }}
              >
                <DatePicker
                  disabled={!isEditing}
                  style={{ width: "100%" }}
                  size="large"
                />
              </Form.Item>
            </Space>
          </Card>

          {/* Card 2: Residence & Family Roots (Read Only, styled beautifully) */}
          <Card className="profile-edit-card" style={{ width: "100%", marginBottom: "2rem" }}>
            <h3 style={{ color: "#faeed6", fontSize: "1rem", fontWeight: "bold", marginBottom: "1.5rem", fontFamily: "'Titillium Web', sans-serif", borderBottom: "1px solid rgba(234, 190, 169, 0.15)", paddingBottom: "8px" }}>
              Residence & Family Roots
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ display: "block", color: "#eabea9", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                    Current Residence
                  </span>
                  <span style={{ color: "#fff", fontSize: "1rem", fontWeight: "600" }}>
                    {profileData?.profilestate?.[0]?.city && profileData?.profilestate?.[0]?.state?.state_name
                      ? `${profileData.profilestate[0].city}, ${profileData.profilestate[0].state.state_name}`
                      : profileData?.profilestate?.city && profileData?.profilestate?.state?.state_name
                      ? `${profileData.profilestate.city}, ${profileData.profilestate.state.state_name}`
                      : "No residence listed"}
                  </span>
                </div>
                <Button 
                  onClick={goToResidence} 
                  style={{ background: "rgba(255, 255, 255, 0.04)", borderColor: "#EABEA9", color: "#F7DC92", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600" }}
                >
                  Update
                </Button>
              </div>

              <div style={{ borderTop: "1px solid rgba(234, 190, 169, 0.15)", paddingTop: "1.25rem" }}>
                <span style={{ display: "block", color: "#eabea9", fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
                  Smithside Lineage Parent
                </span>
                <span style={{ color: "#fff", fontSize: "1rem", fontWeight: "600" }}>
                  {profileData?.parent_profile
                    ? `${profileData.parent_profile.firstname} ${profileData.parent_profile.lastname}`
                    : "No Parent Linked"}
                </span>
                <p style={{ color: "#eabea9", opacity: 0.6, fontSize: "0.75rem", margin: "6px 0 0 0" }}>
                  Lineage parent links can be added or updated via the Connections panel below.
                </p>
              </div>
            </div>
          </Card>

          {/* Card 3: Privacy & Page Controls */}
          <Card className="profile-edit-card" style={{ width: "100%", marginBottom: "2rem" }}>
            <h3 style={{ color: "#faeed6", fontSize: "1rem", fontWeight: "bold", marginBottom: "1.5rem", fontFamily: "'Titillium Web', sans-serif", borderBottom: "1px solid rgba(234, 190, 169, 0.15)", paddingBottom: "8px" }}>
              Privacy & Page Controls
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Lock Guestbook Switch Row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, paddingRight: "16px" }}>
                  <span style={{ display: "block", color: "#faeed6", fontSize: "0.85rem", fontWeight: "600" }}>
                    Lock Tribute Guestbook
                  </span>
                  <span style={{ display: "block", color: "#eabea9", opacity: 0.7, fontSize: "0.75rem", marginTop: "2px" }}>
                    Disable comments and posts on your profile's Guestbook wall.
                  </span>
                </div>
                <Form.Item name="is_locked" valuePropName="checked" style={{ margin: 0 }}>
                  <Switch disabled={!isEditing} />
                </Form.Item>
              </div>

              {/* Lock Media Comments Switch Row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dotted rgba(234, 190, 169, 0.15)", paddingTop: "1.25rem" }}>
                <div style={{ flex: 1, paddingRight: "16px" }}>
                  <span style={{ display: "block", color: "#faeed6", fontSize: "0.85rem", fontWeight: "600" }}>
                    Lock Media Comments
                  </span>
                  <span style={{ display: "block", color: "#eabea9", opacity: 0.7, fontSize: "0.75rem", marginTop: "2px" }}>
                    Prevent other family members from commenting on your uploaded photos.
                  </span>
                </div>
                <Form.Item name="lock_media_comments" valuePropName="checked" style={{ margin: 0 }}>
                  <Switch disabled={!isEditing} />
                </Form.Item>
              </div>
            </div>
          </Card>

          {isEditing && (
            <Form.Item style={{ marginTop: "1rem" }}>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                size="large"
                className="profile-edit-save-btn"
              >
                Save Changes
              </Button>
            </Form.Item>
          )}
        </Form>

        <Card title="Connections" className="profile-edit-card" style={{ width: "100%" }}>
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            {connections.map((connection) => (
              <Row
                key={connection.profile_2.id}
                justify="space-between"
                align="middle"
                className="connection-item-row"
              >
                <Space>
                  <Avatar src={connection.profile_2.avatar_url || undefined} className="profile-edit-avatar-border">
                    {connection.profile_2.firstname?.[0]}
                  </Avatar>
                  <span className="connection-name">
                    {connection.profile_2.firstname}{" "}
                    {connection.profile_2.lastname}
                  </span>
                  <span className="connection-type">
                    ({connection.connection_type})
                  </span>
                </Space>
                <Button danger className="remove-conn-btn" onClick={() => removeConnection(connection)}>
                  Remove
                </Button>
              </Row>
            ))}
            {connections.length === 0 && (
              <div
                style={{ textAlign: "center", color: "#eabea9", opacity: 0.6, fontSize: "16px", padding: "12px 0" }}
              >
                No connections found
              </div>
            )}
          </Space>
        </Card>
      </div>
    </div>
  );
}

export default ProfileEdit;
