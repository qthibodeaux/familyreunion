import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, useParams } from "react-router-dom";
import { Card, Typography } from "antd";
import FamilyTree from "./FamilyTree";
import "../newComponents/NewProfile.css";
import "../newComponents/NewHome.css";

import { getAvatarSrc } from "../utils/avatarHelper";

const { Title } = Typography;

function FirstBranchPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const { branchId: userId } = useParams();

  // Demo mode - set to false when done testing
  const DEMO_MODE = false;
  const demoData = {
    id: "demo-alma",
    firstname: "Alma",
    lastname: "Smith",
    avatar_url: "alma.jpg",
    sunrise: "1955-12-03",
    sunset: "2003-02-08",
    profilestate: {
      city: "Memphis",
      state: { state_name: "Tennessee" },
    },
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Use demo data if DEMO_MODE is true
        if (DEMO_MODE) {
          setData(demoData);
          return;
        }

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
  const avatarUrl = getAvatarSrc(data);

  return (
    <div className="new-home-container">
      {/* Slide 1: Profile Hero Card */}
      <section className="snap-section">
        <div className="new-slide-card">
          <div className="profile-bezel-card">
            {/* Hero Photo Section */}
            <div className="profile-hero-section" style={{ height: "100%" }}>
              <div className="profile-photo-container">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    onError={(e) => {
                      e.target.style.display = "none";
                      const placeholder = e.target.parentElement.querySelector(".profile-avatar-placeholder");
                      if (placeholder) placeholder.style.display = "flex";
                    }}
                  />
                ) : null}
                {!avatarUrl && (
                  <div className="profile-avatar-placeholder">
                    <div style={{ fontSize: "3rem", color: "#EABEA9", opacity: 0.35 }}>
                      {initials}
                    </div>
                  </div>
                )}
              </div>

              {/* Identity Overlay */}
              <div className="profile-identity-overlay">
                <div className="profile-badge">Family Member</div>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "#f3e7b1",
                    lineHeight: 1.2,
                    marginBottom: "0.75rem",
                  }}
                >
                  {data.firstname} {data.lastname}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "2rem",
                    fontSize: "0.875rem",
                    color: "#EABEA9",
                    flexWrap: "wrap",
                  }}
                >
                  {data.sunrise && (
                    <div>
                      <div
                        style={{
                          fontSize: "0.625rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.03125rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Sunrise
                      </div>
                      <div style={{ color: "#f3e7b1", fontSize: "0.875rem" }}>
                        {new Date(data.sunrise).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  )}
                  {data.sunset && (
                    <div>
                      <div
                        style={{
                          fontSize: "0.625rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.03125rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Sunset
                      </div>
                      <div style={{ color: "#f3e7b1", fontSize: "0.875rem" }}>
                        {new Date(data.sunset).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Scroll Indicator */}
                <div
                  style={{
                    marginTop: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.375rem",
                    animation: "bounce 2s infinite",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.03125rem",
                      color: "#EABEA9",
                      opacity: 0.7,
                      fontWeight: 500,
                    }}
                  >
                    Explore
                  </div>
                  <div
                    style={{
                      width: "0.625rem",
                      height: "0.625rem",
                      borderLeft: "0.125rem solid #EABEA9",
                      borderBottom: "0.125rem solid #EABEA9",
                      transform: "rotate(-45deg)",
                      opacity: 0.7,
                    }}
                  />
                </div>

                <style>{`
                  @keyframes bounce {
                    0%, 100% {
                      transform: translateY(0);
                      opacity: 0.7;
                    }
                    50% {
                      transform: translateY(0.375rem);
                      opacity: 0.4;
                    }
                  }
                `}</style>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slide 2: Family Tree */}
      <section className="snap-section">
        <div className="new-slide-card">
          <Card
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderRadius: "1.5rem",
              border: "0.09375rem solid #d4af37",
              boxShadow: "0 0.5rem 1.5rem rgba(91, 31, 64, 0.1)",
              backgroundColor: "#fffbf7",
            }}
          >
            <div
              style={{
                padding: "1.5rem 0.5rem",
                flex: 1,
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Title
                level={3}
                style={{
                  color: "#5b1f40",
                  marginBottom: "1.5rem",
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "1.75rem",
                }}
              >
                Family Tree
              </Title>
              <div style={{ flex: 1 }}>
                {DEMO_MODE ? (
                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0",
                    height: "100%",
                  }}>
                    {/* Pedigree Header - Fixed */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                      paddingBottom: "1rem",
                      borderBottom: "0.09375rem solid #d4af37",
                      flexShrink: 0,
                    }}>
                      <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#5b1f40" }}>
                        👤 FAMILY PEDIGREE
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button style={{
                          padding: "0.375rem 0.75rem",
                          fontSize: "0.75rem",
                          borderRadius: "0.25rem",
                          border: "0.09375rem solid #d4af37",
                          backgroundColor: "transparent",
                          color: "#5b1f40",
                          cursor: "pointer",
                        }}>
                          Expand All
                        </button>
                        <button style={{
                          padding: "0.375rem 0.75rem",
                          fontSize: "0.75rem",
                          borderRadius: "0.25rem",
                          border: "0.09375rem solid #d4af37",
                          backgroundColor: "transparent",
                          color: "#5b1f40",
                          cursor: "pointer",
                        }}>
                          Collapse All
                        </button>
                      </div>
                    </div>

                    {/* Lineage Trail - Fixed */}
                    <div style={{
                      fontSize: "0.75rem",
                      color: "#EABEA9",
                      textTransform: "uppercase",
                      letterSpacing: "0.03125rem",
                      fontWeight: 600,
                      paddingBottom: "1rem",
                      flexShrink: 0,
                    }}>
                      LINEAGE TRAIL: {data.firstname} {data.lastname}
                    </div>

                    {/* Scrollable Tree Content */}
                    <div style={{
                      flex: 1,
                      overflow: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.5rem",
                      paddingRight: "1rem",
                    }}>
                      {/* Descendants Tree Layout */}
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.5rem",
                        width: "100%",
                        paddingLeft: "0",
                      }}>
                      {/* Root: Current Member (Alma Smith) */}
                      <div style={{
                        display: "flex",
                        justifyContent: "flex-start",
                      }}>
                        <div
                          style={{
                            padding: "0.75rem",
                            border: "0.1875rem solid #d4af37",
                            borderRadius: "0.375rem",
                            backgroundColor: "#fffbf7",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            gap: "0.75rem",
                            width: "10rem",
                            boxShadow: "0 0.25rem 0.75rem rgba(212, 175, 55, 0.15)",
                          }}
                        >
                          <div style={{
                            width: "2.5rem",
                            height: "2.5rem",
                            borderRadius: "0.25rem",
                            backgroundImage: `url(${getAvatarSrc(data)})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            flexShrink: 0,
                            backgroundColor: "#5b1f40",
                            color: "#f3e7b1",
                          }}>
                            {!getAvatarSrc(data) && "AS"}
                          </div>
                          <div style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            gap: "0.25rem",
                          }}>
                            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#5b1f40" }}>
                              Alma Smith
                            </div>
                            <div style={{ fontSize: "0.6rem", color: "#EABEA9" }}>
                              1955–2003
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Generation 1: Children (Indented) */}
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        paddingLeft: "1.5rem",
                        borderLeft: "0.125rem solid #EABEA9",
                        paddingTop: "0.5rem",
                        marginLeft: "0",
                      }}>
                        <div style={{ fontSize: "0.65rem", color: "#EABEA9", fontWeight: 600, marginBottom: "0.25rem", textTransform: "uppercase" }}>
                          Children
                        </div>
                        {[
                          { initials: "BC", firstName: "Ben", lastName: "Child", gen: "Child", image: getAvatarSrc({ avatar_url: "ben.jpg" }) },
                          { initials: "JC", firstName: "Jane", lastName: "Child", gen: "Child", image: getAvatarSrc({ avatar_url: "joyce.jpg" }) },
                        ].map((child, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: "0.5rem",
                              border: "0.125rem solid #EABEA9",
                              borderRadius: "0.375rem",
                              backgroundColor: "#fffbf7",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              display: "flex",
                              gap: "0.75rem",
                              width: "10rem",
                            }}
                          >
                            <div style={{
                              width: "2.25rem",
                              height: "2.25rem",
                              borderRadius: "0.25rem",
                              backgroundImage: `url(${child.image})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              flexShrink: 0,
                              backgroundColor: "#5b1f40",
                              color: "#f3e7b1",
                            }}>
                              {!child.image && child.initials}
                            </div>
                            <div style={{
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              gap: "0.2rem",
                            }}>
                              <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#5b1f40" }}>
                                {child.firstName} {child.lastName}
                              </div>
                              <div style={{ fontSize: "0.6rem", color: "#EABEA9" }}>
                                {child.gen}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    </div>
                  </div>
                ) : (
                  <FamilyTree userId={userId} />
                )}
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

export default FirstBranchPage;
