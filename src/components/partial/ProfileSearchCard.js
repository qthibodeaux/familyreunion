import React, { useState, useRef, useEffect } from 'react';
import { Card, Avatar, List, Row, Col } from 'antd';
import { SearchBar } from 'antd-mobile';
import { supabase } from './../../supabaseClient';
import moment from 'moment';

const ProfileSearchCard = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debounceTimeout = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const fetchProfiles = async (searchTerm) => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    const { data, error } = await supabase
      .from('profile')
      .select('id, firstname, nickname, lastname, avatar_url, sunrise, ancestor')
      .or(
        `firstname.ilike.%${searchTerm}%,nickname.ilike.%${searchTerm}%,lastname.ilike.%${searchTerm}%`
      )
      .limit(10); // Limit the search results to 10 items

    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      // Fetch public URLs for avatars
      const updatedProfiles = await Promise.all(
        data.map(async (profile) => {
          if (profile.avatar_url) {
            const { data: avatarData, error: avatarError } = supabase.storage
              .from('avatars')
              .getPublicUrl(profile.avatar_url);

            if (avatarError) {
              console.error('Error fetching avatar URL:', avatarError);
            } else {
              profile.avatar_url = avatarData.publicUrl;
            }
          }
          return profile;
        })
      );
      setSearchResults(updatedProfiles);
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      await fetchProfiles(value);
    }, 300);
  };

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile);
    setSearchResults([]);
    setSearchTerm('');
  };

  return (
    <Card title="Find A Member" className="search-card"></Card>
      <SearchBar
        placeholder="Search for a member"
        value={searchTerm}
        onChange={handleSearchChange}
        onClear={() => setSearchTerm('')}
        style={{
          background: '#6c254c',
          border: 'none',
          color: '#f3e7b1',
          fontWeight: 'bold',
          fontSize: '1.5rem',
          borderRadius: '0',
          marginTop: '.5rem',
        }}
        inputStyle={{
          background: '#6c254c',
          color: '#f3e7b1',
          fontWeight: 'bold',
          fontSize: '1.5rem',
        }}
      />

      {searchResults.length > 0 && (
        <List className="search-results" style={{ marginTop: '.5rem' }}>
          {searchResults.map((profile) => (
            <List.Item
              key={profile.id}
              onClick={() => handleProfileSelect(profile)}
              style={{ color: '#f3e7b1' }}
            >
              <List.Item.Meta
                avatar={
                  profile.avatar_url ? (
                    <Avatar src={profile.avatar_url} />
                  ) : (
                    <Avatar icon={<UserOutlined />} />
                  )
                }
                title={profile.nickname
                  ? `${profile.firstname} (${profile.nickname}) ${profile.lastname}`
                  : `${profile.firstname} ${profile.lastname}`}
                description={profile.ancestor ? `House of ${profile.ancestor}` : ''}
              />
            </List.Item>
          ))}
        </List>
      )}

      {selectedProfile && (
        <Card style={{ marginTop: '1rem', background: '#5b1f40', color: '#f3e7b1' }}>
          <Row>
            <Col span={6}>
              <Avatar
                src={selectedProfile.avatar_url}
                icon={<UserOutlined />}
                shape="square"
                style={{ borderRadius: '8px', width: '5rem', height: '5rem' }}
              />
            </Col>
            <Col span={12}>
              <Row>
                <Col span={24} style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                  {selectedProfile.nickname
                    ? `${selectedProfile.firstname} (${selectedProfile.nickname})`
                    : `${selectedProfile.firstname} ${selectedProfile.lastname}`}
                </Col>
              </Row>
              <Row>
                <Col span={24} style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                  {selectedProfile.ancestor ? `House of ${selectedProfile.ancestor}` : ''}
                </Col>
              </Row>
            </Col>
            <Col span={6}>
              <Row>
                <Col span={24} style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                  {moment(selectedProfile.sunrise).format('MMMM D')}
                </Col>
              </Row>
              <Row>
                <Col span={24} style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                  {moment(selectedProfile.sunrise).format('YYYY')}
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>
      )}
    </Card>
  );
};

export default ProfileSearchCard;
