import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Avatar } from 'antd';
import { supabase } from '../supabaseClient';

function YearTree() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profile')
        .select('id, firstname, avatar_url, sunrise'); // Adjust the select query based on your table structure

      if (error) {
        console.error('Error fetching profiles:', error);
      } else {
        setProfiles(data);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, []);

  const groupByYear = (profiles) => {
    return profiles.reduce((acc, profile) => {
      const year = profile.sunrise; // Adjust based on your date field
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(profile);
      return acc;
    }, {});
  };

  const groupedProfiles = groupByYear(profiles);

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        Object.keys(groupedProfiles).map((year) => (
          <div key={year} className="year-section">
            <h2>{year}</h2>
            {groupedProfiles[year].slice(0, 8).map((profile, index) => (
              <Row key={profile.id} gutter={[16, 16]}>
                {index % 4 === 0 && index !== 0 && (
                  <div className="row-break" />
                )}
                <Col span={6}>
                  <Card className="profile-card">
                    <Avatar src={profile.avatar_url} size={64} />
                    <div>{profile.firstname}</div>
                  </Card>
                </Col>
              </Row>
            ))}
            {groupedProfiles[year].length > 8 && (
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Card className="profile-card more-profiles">
                    <Avatar
                      src={groupedProfiles[year][7].avatar_url}
                      size={64}
                    />
                    <div>+{groupedProfiles[year].length - 8}</div>
                  </Card>
                </Col>
              </Row>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default YearTree;
