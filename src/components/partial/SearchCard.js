import React, { useState, useRef, useEffect } from 'react';
import { Card, Avatar, Button, SearchBar, List, Image } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { supabase } from './../../supabaseClient';

const SearchCard = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debounceTimeout = useRef(null);
  const navigate = useNavigate();

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
      .select('id, firstname, nickname, lastname, avatar_url, sunrise')
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

  const handleReset = () => {
    setSelectedProfile(null);
    setSearchTerm('');
  };

  const navigateToProfile = (profileId) => {
    navigate(`/profile/${profileId}`);
  };

  return (
    <Card title="Find A Member" className="search-card">
      <SearchBar
        placeholder="Search for a member"
        value={searchTerm}
        onChange={handleSearchChange}
        onClear={handleReset}
      />

      {searchResults.length > 0 && (
        <List className="search-results">
          {searchResults.map((profile) => (
            <List.Item
              key={profile.id}
              prefix={
                <Avatar src={profile.avatar_url} className="profile-avatar" />
              }
              description={
                profile.nickname
                  ? `${profile.firstname} (${profile.nickname}) ${profile.lastname}`
                  : `${profile.firstname} ${profile.lastname}`
              }
              onClick={() => handleProfileSelect(profile)}
            >
              {profile.firstname} {profile.nickname && `(${profile.nickname})`}
            </List.Item>
          ))}
        </List>
      )}

      {selectedProfile && (
        <List className="selected-profile">
          <List.Item
            prefix={
              <Image
                src={selectedProfile.avatar_url}
                className="selected-avatar"
              />
            }
            description={
              <>
                <div>
                  {selectedProfile.nickname
                    ? `${selectedProfile.firstname} (${selectedProfile.nickname})`
                    : `${selectedProfile.firstname} ${selectedProfile.lastname}`}
                </div>
                <div>{selectedProfile.lastname}</div>
                <div>
                  {new Date(selectedProfile.sunrise).toLocaleDateString()}
                </div>
              </>
            }
          />
        </List>
      )}

      {selectedProfile && (
        <div className="action-buttons">
          <Button onClick={handleReset} block className="reset-button">
            Reset
          </Button>
          <Button
            onClick={() => navigateToProfile(selectedProfile.id)}
            color="primary"
            block
            className="choose-button"
          >
            Choose {selectedProfile.nickname || selectedProfile.firstname}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default SearchCard;
