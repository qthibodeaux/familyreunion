import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Card, Button, List, Typography, Divider } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

export default function ApiTestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const runDiagnostics = async () => {
    setLoading(true);
    const newResults = [];

    // Get current configured variables
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "http://192.168.1.144:8000";
    const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

    // Test 1: Basic HTTP connection to port 8000
    try {
      newResults.push({
        name: "Test 1: Network Ping to API Gateway",
        description: `HTTP GET request to root URL: ${supabaseUrl}`,
        status: "loading",
      });
      setResults([...newResults]);

      await fetch(supabaseUrl, { method: "GET" });
      newResults[0] = {
        ...newResults[0],
        status: "success",
        details: "Connection established successfully! Server is online and accepting requests on port 8000.",
      };
    } catch (err) {
      newResults[0] = {
        ...newResults[0],
        status: "error",
        details: `Failed to connect: ${err.message}. This means either the server is completely down, port 8000 is blocked by a firewall, or the IP address ${supabaseUrl} is incorrect.`,
      };
    }
    setResults([...newResults]);

    if (newResults[0].status === "error") {
      setLoading(false);
      return; // Stop here if network ping failed
    }

    // Test 2: REST Endpoint with apikey header (Kong test)
    try {
      const restUrl = `${supabaseUrl}/rest/v1/`;
      newResults.push({
        name: "Test 2: API Gateway API Key Authentication",
        description: `GET request to ${restUrl} checking Kong API key authorization`,
        status: "loading",
      });
      setResults([...newResults]);

      const res = await fetch(restUrl, {
        method: "GET",
        headers: {
          "apikey": anonKey,
        }
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        newResults[1] = {
          ...newResults[1],
          status: "success",
          details: `Kong authentication succeeded! HTTP Status: ${res.status}. Swagger spec received.`,
        };
      } else {
        newResults[1] = {
          ...newResults[1],
          status: "error",
          details: `Kong rejected the key: HTTP Status ${res.status} (${res.statusText}).\nResponse: ${JSON.stringify(data, null, 2)}`,
        };
      }
    } catch (err) {
      newResults[1] = {
        ...newResults[1],
        status: "error",
        details: `Failed to send request: ${err.message}`,
      };
    }
    setResults([...newResults]);

    if (newResults[1].status === "error") {
      setLoading(false);
      return;
    }

    // Test 3: Database query using Supabase client (End-to-End JWT Auth)
    try {
      newResults.push({
        name: "Test 3: End-to-End Database Fetch (JWT Authorization)",
        description: "Executing Supabase JS client query to fetch profile records",
        status: "loading",
      });
      setResults([...newResults]);

      const { data, error, status, statusText } = await supabase
        .from("profile")
        .select("id, firstname, lastname")
        .limit(1);

      if (error) {
        newResults[2] = {
          ...newResults[2],
          status: "error",
          details: `Database returned error: Code ${error.code} (${error.message}).\nHTTP Status: ${status} (${statusText})\nHint: ${error.hint || "No hint provided"}`,
        };
      } else {
        newResults[2] = {
          ...newResults[2],
          status: "success",
          details: `Database fetch succeeded! Records received:\n${JSON.stringify(data, null, 2)}`,
        };
      }
    } catch (err) {
      newResults[2] = {
        ...newResults[2],
        status: "error",
        details: `Error executing database call: ${err.message}`,
      };
    }
    setResults([...newResults]);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: "0 20px" }}>
      <Card bordered={false} className="glass-card" style={{ background: "rgba(255, 255, 255, 0.9)" }}>
        <Title level={2} style={{ color: "#873D62", textAlign: "center" }}>
          Supabase Connection Diagnostics
        </Title>
        <Paragraph style={{ textAlign: "center", color: "#666" }}>
          Use this interactive utility to test real-time connectivity, gateway authorization, and database JWT decryption with your upstairs server.
        </Paragraph>
        
        <Divider />

        <div style={{ padding: "10px 0" }}>
          <Text strong>Supabase Target URL: </Text>
          <Text code>{process.env.REACT_APP_SUPABASE_URL || "http://192.168.1.144:8000"}</Text>
        </div>
        <div style={{ padding: "5px 0 20px 0" }}>
          <Text strong>Anon Key (Truncated): </Text>
          <Text code>
            {process.env.REACT_APP_SUPABASE_ANON_KEY 
              ? `${process.env.REACT_APP_SUPABASE_ANON_KEY.substring(0, 15)}...${process.env.REACT_APP_SUPABASE_ANON_KEY.substring(process.env.REACT_APP_SUPABASE_ANON_KEY.length - 15)}`
              : "Not Configured!"}
          </Text>
        </div>

        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <Button 
            type="primary" 
            size="large"
            onClick={runDiagnostics} 
            loading={loading}
            style={{ backgroundColor: "#873D62", borderColor: "#873D62" }}
          >
            {loading ? "Testing Connection..." : "Run Connection Diagnostics"}
          </Button>
        </div>

        <List
          itemLayout="vertical"
          dataSource={results}
          renderItem={(item) => (
            <List.Item style={{ borderBottom: "1px solid #f0f0f0", padding: "20px 0" }}>
              <List.Item.Meta
                avatar={
                  item.status === "loading" ? (
                    <LoadingOutlined style={{ fontSize: 24, color: "#1890ff" }} />
                  ) : item.status === "success" ? (
                    <CheckCircleOutlined style={{ fontSize: 24, color: "#52c41a" }} />
                  ) : (
                    <CloseCircleOutlined style={{ fontSize: 24, color: "#ff4d4f" }} />
                  )
                }
                title={<Text strong style={{ fontSize: 16 }}>{item.name}</Text>}
                description={item.description}
              />
              {item.details && (
                <pre style={{
                  background: item.status === "success" ? "#f6ffed" : "#fff1f0",
                  border: `1px solid ${item.status === "success" ? "#b7eb8f" : "#ffa39e"}`,
                  padding: 12,
                  borderRadius: 6,
                  whiteSpace: "pre-wrap",
                  fontSize: 13,
                  marginTop: 10,
                  fontFamily: "monospace",
                }}>
                  {item.details}
                </pre>
              )}
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
