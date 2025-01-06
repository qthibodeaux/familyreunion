import { useEffect, useState } from 'react';
import { Row, Col, Card, Typography, Image } from 'antd';
import { supabase } from '../supabaseClient';

function ScrollTree() {
  const [profiles, setProfiles] = useState([]);
  const [names, setNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { Title, Text } = Typography;

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profile')
          .select('*')
          .order('sunrise', { ascending: true });

        if (error) {
          throw error;
        }

        setProfiles(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const groupedProfiles = profiles.reduce((acc, profile) => {
    (acc[profile.branch] = acc[profile.branch] || []).push(profile);
    return acc;
  }, {});

  // Sort profiles within each branch by sunrise date
  Object.keys(groupedProfiles).forEach((branch) => {
    groupedProfiles[branch].sort(
      (a, b) => new Date(a.sunrise) - new Date(b.sunrise)
    );
  });

  return (
    <Row justify="center" align="middle">
      <Col span={24}>
        <Card>
          <Title level={2}>Family Tree</Title>
          {Object.entries(groupedProfiles).map(([branch, profiles]) => {
            const displayedProfiles = profiles.slice(0, 10); // First 10 profiles
            const additionalProfilesCount = profiles.length - 10; // Count of additional profiles

            return (
              <Card key={branch} style={{ marginBottom: '16px' }}>
                <Title level={3}>Branch {branch}</Title>
                <Row gutter={8} style={{ marginBottom: '8px' }}>
                  {displayedProfiles.slice(0, 4).map((profile) => (
                    <Col key={profile.id} style={{ padding: '8px' }}>
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={`${profile.firstname} ${profile.lastname}`}
                          style={{
                            borderRadius: '8px',
                            width: '50px',
                            height: '50px',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '50px',
                            height: '50px',
                            background: '#f0f0f0',
                            borderRadius: '8px',
                          }}
                        />
                      )}
                    </Col>
                  ))}
                </Row>
                <Row gutter={8}>
                  {displayedProfiles.slice(5, 10).map((profile, index) => (
                    <Col key={profile.id} style={{ padding: '8px' }}>
                      {index === 4 && additionalProfilesCount > 0 ? (
                        <div
                          style={{
                            width: '50px',
                            height: '50px',
                            background: '#f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                          }}
                        >
                          <Text>+{additionalProfilesCount}</Text>
                        </div>
                      ) : profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={`${profile.firstname} ${profile.lastname}`}
                          style={{
                            borderRadius: '8px',
                            width: '50px',
                            height: '50px',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '50px',
                            height: '50px',
                            background: '#f0f0f0',
                            borderRadius: '8px',
                          }}
                        />
                      )}
                    </Col>
                  ))}
                </Row>
              </Card>
            );
          })}
        </Card>
      </Col>
    </Row>
  );
}

export default ScrollTree;
