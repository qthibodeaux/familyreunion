import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Typography, Input, Button } from "antd";
import { MailOutlined, GoogleOutlined } from "@ant-design/icons";
import { supabase } from "../supabaseClient";
import { buildMagicLinkRedirectUrl } from "../utils/authRedirect";
import "./Register.css";

function Register() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { Title } = Typography;
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const redirectUrl = buildMagicLinkRedirectUrl();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) {
        setErrorMsg(error.message);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to initiate Google login");
    } finally {
      setLoading(false);
    }
  };

  const goHome = () => {
    navigate("/");
  };

  return (
    <div className="register-page-shell">
      <Row justify="center" style={{ width: "100%", marginBottom: "32px" }}>
        <Col span={24} style={{ maxWidth: "440px" }}>
          <Title
            level={2}
            style={{
              textAlign: "center",
              color: "#f3e7b1",
              fontWeight: "bold",
              fontSize: "2rem",
              margin: 0,
            }}
          >
            Sign in to your family account
          </Title>
        </Col>
      </Row>

      <Row justify="center" style={{ width: "100%" }}>
        <Col span={24} style={{ maxWidth: "440px" }}>
          {errorMsg && (
            <div
              style={{
                color: "#F7DC92",
                background: "#873D62",
                borderRadius: 4,
                padding: "8px 12px",
                marginBottom: 24,
                fontWeight: "bold",
                fontSize: "1rem",
                textAlign: "center",
              }}
            >
              {errorMsg}
            </div>
          )}
          <Row gutter={[0, 12]} style={{ marginTop: "12px", marginBottom: "32px" }}>
            <Col span={24}>
              <Button
                onClick={handleGoogleLogin}
                icon={<GoogleOutlined />}
                type="primary"
                loading={loading}
                block
                style={{
                  color: "#873D62",
                  background: "#F7DC92",
                  border: "solid #EABEA9",
                  fontWeight: "bold",
                  height: "56px",
                  fontSize: "1.2rem",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                {loading ? "Connecting to Google..." : "Sign in with Google"}
              </Button>
            </Col>

            <Col span={24} style={{ marginTop: "24px" }}>
              <Button
                onClick={goHome}
                block
                style={{
                  color: "#F7DC92",
                  background: "none",
                  border: "solid #EABEA9",
                  fontWeight: "bold",
                  height: "48px",
                  fontSize: "1rem",
                }}
              >
                Cancel
              </Button>
            </Col>
          </Row>
          <Title
            level={3}
            style={{ textAlign: "center", color: "#f3e7b1", margin: 0 }}
          >
            Access is restricted to family members.
          </Title>
        </Col>
      </Row>
    </div>
  );
}

export default Register;
