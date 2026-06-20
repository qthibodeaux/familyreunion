import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Spin, Result, Button } from "antd";

function parseHashParams(hash) {
  const params = {};
  hash
    .replace(/^#/, "")
    .split("&")
    .forEach((kv) => {
      const [key, value] = kv.split("=");
      if (key) params[key] = decodeURIComponent(value || "");
    });
  return params;
}

function parseQueryParams(search) {
  const params = {};
  const qs = search.replace(/^\?/, "");
  if (!qs) return params;
  qs.split("&").forEach((kv) => {
    const [key, value] = kv.split("=");
    if (key) params[key] = decodeURIComponent(value || "");
  });
  return params;
}

export default function AuthCallbackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const hash = window.location.hash;
      const queryParams = parseQueryParams(location.search);
      const magicToken = queryParams.magic_token || queryParams.token_hash;

      const isCallbackPath = location.pathname === "/auth/callback" || location.hash.includes("/auth/callback");
      const hasAccessToken = hash && hash.includes("access_token");
      const hasMagicToken = !!magicToken;

      if (!hasAccessToken && !hasMagicToken) {
        setLoading(false);
        if (isCallbackPath) {
          setErrorMsg("No authentication data found.");
        }
        return;
      }

      // Handle Supabase email magic link (access_token in hash)
      if (hasAccessToken) {
        const params = parseHashParams(hash);
        const { access_token, refresh_token } = params;
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            setErrorMsg(error.message);
            setLoading(false);
            return;
          }
          window.location.hash = "";
          navigate("/");
          return;
        }
      }


      // Fallback
      setLoading(false);
    };

    handleCallback();
  }, [navigate, location.search, location.pathname]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <Spin tip="Signing you in..." size="large">
          <div style={{ padding: "50px" }} />
        </Spin>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ padding: "24px" }}>
        <Result
          status="error"
          title="Sign-in failed"
          subTitle={errorMsg}
          extra={[
            <Button
              key="home"
              onClick={() => navigate("/")}
              style={{
                color: "#873D62",
                background: "#F7DC92",
                border: "solid #EABEA9",
                fontWeight: "bold",
              }}
            >
              Go Home
            </Button>,
            <Button
              key="retry"
              onClick={() => navigate("/register")}
              style={{
                color: "#F7DC92",
                background: "none",
                border: "solid #EABEA9",
                fontWeight: "bold",
              }}
            >
              Try Again
            </Button>,
          ]}
        />
      </div>
    );
  }

  return null;
}
