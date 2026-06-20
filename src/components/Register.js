import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Row, Col, Card, Typography, Input, Button } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { supabase } from "../supabaseClient";
import { buildMagicLinkRedirectUrl } from "../utils/authRedirect";
import "./Register.css";

function Register() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { Title } = Typography;
  const navigate = useNavigate();

  const isValidEmail = (emailAddress) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress);
  };

  const handleLogin = async () => {
    setErrorMsg("");

    if (!email) {
      setErrorMsg("Please enter your email address");
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMsg("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = buildMagicLinkRedirectUrl();
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) {
        setErrorMsg(error.error_description || error.message);
      } else {
        setSent(true);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to send magic link");
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
            Enter your email address to get a magic link to sign in
          </Title>
        </Col>
      </Row>

      {sent ? (
        <Row justify="center" style={{ width: "100%", margin: "32px 0" }}>
          <Col span={24} style={{ maxWidth: "440px", textAlign: "center" }}>
            <Title
              level={4}
              style={{ color: "#f3e7b1", textAlign: "center", margin: 0, marginBottom: "16px" }}
            >
              Magic link sent! Check your email.
            </Title>
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
              Return Home
            </Button>
          </Col>
        </Row>
      ) : (
        <Row justify="center" style={{ width: "100%" }}>
          <Col span={24} style={{ maxWidth: "440px" }}>
            <Input
              size="large"
              placeholder="Email Address (e.g. you@email.com)"
              prefix={<MailOutlined style={{ color: "#F7DC92", marginRight: 8 }} />}
              onChange={(event) => setEmail(event.target.value)}
              style={{
                background: "#6c254c",
                border: "2px solid #EABEA9",
                color: "#f3e7b1",
                fontWeight: "bold",
                fontSize: "1.25rem",
                borderRadius: "8px",
                marginBottom: errorMsg ? "4px" : "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                height: "48px",
              }}
              value={email}
              autoFocus
            />
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
            <Row gutter={[0, 12]} style={{ marginTop: "24px", marginBottom: "32px" }}>
              <Col span={24}>
                <Button
                  onClick={handleLogin}
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  style={{
                    color: "#873D62",
                    background: "#F7DC92",
                    border: "solid #EABEA9",
                    fontWeight: "bold",
                    height: "48px",
                    fontSize: "1rem",
                  }}
                >
                  {loading ? "Loading" : "Send Magic Link"}
                </Button>
              </Col>
              <Col span={24}>
                <Button
                  onClick={() => setEmail("")}
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
                  Reset
                </Button>
              </Col>
              <Col span={24}>
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
              The email address will be tied to your profile. Check your junk mail!
            </Title>
          </Col>
        </Row>
      )}
    </div>
  );
}

export default Register;
