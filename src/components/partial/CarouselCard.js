import React, { useEffect, useState } from 'react';
import { Swiper, Toast, Avatar, SpinLoading } from 'antd-mobile';
import { supabase } from './../../supabaseClient'; // Ensure this import is correct

const CarouselCard = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parentNames, setParentNames] = useState({});
  const [ancestorNames, setAncestorNames] = useState({});

  useEffect(() => {
    const fetchRandomProfiles = async () => {
      try {
        const { data, error } = await supabase.rpc('get_random_profiles');

        if (error) throw error;

        // Fetch parent names for all profiles
        const parentIds = data.filter(p => p.parent).map(p => p.parent);
        if (parentIds.length > 0) {
          const { data: parents, error: parentError } = await supabase
            .from('profile')
            .select('id, firstname, lastname')
            .in('id', parentIds);

          if (!parentError && parents) {
            const parentNameMap = {};
            parents.forEach(parent => {
              parentNameMap[parent.id] = `${parent.firstname} ${parent.lastname}`;
            });
            setParentNames(parentNameMap);
          }
        }

        // Fetch ancestor names for all profiles
        const ancestorIds = data.filter(p => p.ancestor).map(p => p.ancestor);
        if (ancestorIds.length > 0) {
          const { data: ancestors, error: ancestorError } = await supabase
            .from('profile')
            .select('id, firstname')
            .in('id', ancestorIds);

          if (!ancestorError && ancestors) {
            const ancestorNameMap = {};
            ancestors.forEach(ancestor => {
              ancestorNameMap[ancestor.id] = ancestor.firstname;
            });
            setAncestorNames(ancestorNameMap);
          }
        }

        setProfiles(data);
      } catch (error) {
        Toast.show({
          content: 'Error fetching random profiles',
          icon: 'fail',
        });
        console.error('Error fetching random profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRandomProfiles();
  }, []);

  if (loading) {
    return (
      <div className="carousel-card-loading">
        <SpinLoading size="large" />
      </div>
    );
  }

  const renderProfileDetails = (profile) => {
    const { firstname, lastname, nickname, avatar_url, ancestor, parent } =
      profile;

    return (
      <div className="profile-details">
        {avatar_url && <Avatar src={avatar_url} className="profile-avatar" />}
        <div className="profile-info">
          {nickname ? (
            <>
              <h3 className="profile-name">
                {firstname} ({nickname})
              </h3>
              <p className="profile-lastname">{lastname}</p>
            </>
          ) : (
            <h3 className="profile-name">
              {firstname} {lastname}
            </h3>
          )}
          {ancestor && (
            <p className="profile-relationship">House of {ancestorNames[ancestor] || 'Loading...'}</p>
          )}
          {parent && <p className="profile-relationship">Child of {parentNames[parent] || 'Loading...'}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="carousel-card-container">
      <Swiper autoplay loop interval={5000}>
        {profiles.map((profile) => (
          <Swiper.Item key={profile.id}>
            <div className="carousel-slide">
              {renderProfileDetails(profile)}
            </div>
          </Swiper.Item>
        ))}
      </Swiper>
    </div>
  );
};

export default CarouselCard;
