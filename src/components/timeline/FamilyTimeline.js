import React, { useState, useEffect } from "react";
import { Card, Avatar, Spin, Empty, Button } from "antd";
import { 
  UserOutlined, 
  CalendarOutlined, 
} from "@ant-design/icons";
import { supabase } from "../../supabaseClient";
import "./FamilyTimeline.css";

const FamilyTimeline = () => {
  const [allMembers, setAllMembers] = useState([]);
  const [displayedCount, setDisplayedCount] = useState(35);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  useEffect(() => {
    if (loading || allMembers.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -12.5% 0px", // Trigger when 12.5% (1/8th) from bottom (7/8ths from top)
        threshold: 0.05
      }
    );

    const elements = document.querySelectorAll(".timeline-year-group");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [loading, allMembers, displayedCount]);

  const fetchFamilyMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("profile")
        .select("*")
        .order("sunrise", { ascending: true });

      if (error) throw error;
      setAllMembers(data || []);
    } catch (error) {
      console.error("Error fetching family members:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group current batch by birth year
  const timelineData = allMembers.slice(0, displayedCount).reduce((acc, member) => {
    if (!member.sunrise) return acc;
    const year = new Date(member.sunrise).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(member);
    return acc;
  }, {});

  const handleLoadMore = () => {
    setDisplayedCount((prev) => prev + 35);
  };

  const hasMore = allMembers.length > displayedCount;


  const getProfileAvatarSrc = (avatarUrl) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith("http")) return avatarUrl;
    return `${supabase.supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`;
  };

  if (loading) {
    return (
      <div className="timeline-container">
        <div className="timeline-spinner-wrap">
          <Spin size="large" tip="Loading Family History..." />
        </div>
      </div>
    );
  }

  const years = Object.keys(timelineData).sort((a, b) => a - b);

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h1 className="timeline-title">Family Timeline</h1>
        <p className="timeline-subtitle">Journey through generations of the Smith Family</p>
      </div>

      {years.length === 0 ? (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description={<span style={{ color: "#EABEA9" }}>No timeline data available.</span>} 
        />
      ) : (
        <div className="family-timeline-wrap">
          {years.map((year, index) => (
            <div
              key={year}
              className="timeline-year-group"
              style={{
                "--delay": index < 4 ? `${index * 0.08}s` : "0s",
              }}
            >
              <div className="timeline-year-marker">
                <div className="year-bubble">{year}</div>
              </div>
              
              <div className="timeline-members-grid">
                {timelineData[year].map((member) => (
                  <Card
                    key={member.id}
                    className="member-timeline-card"
                    bordered={false}
                  >
                    <div className="card-content-layout">
                      <Avatar
                        shape="square"
                        src={getProfileAvatarSrc(member.avatar_url)}
                        icon={<UserOutlined />}
                        className="member-timeline-avatar"
                      />
                      <div className="member-details">
                        <span className="member-name">
                          {member.firstname} {member.lastname}
                        </span>
                        <span className="member-date">
                          <CalendarOutlined /> {new Date(member.sunrise).toLocaleDateString()}
                        </span>
                        <span className="member-branch-tag">
                          Branch {member.branch || "Roots"}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {hasMore && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
              <Button 
                onClick={handleLoadMore} 
                className="timeline-load-more-btn"
                style={{
                  background: 'rgba(234, 190, 169, 0.1)',
                  color: '#EABEA9',
                  border: '1px solid rgba(234, 190, 169, 0.4)',
                  padding: '8px 32px',
                  height: 'auto',
                  borderRadius: '20px',
                  fontWeight: 600
                }}
              >
                Load More History
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FamilyTimeline;
