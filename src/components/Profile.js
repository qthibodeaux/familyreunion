import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Col, Row, Flex } from 'antd';
import { supabase } from '../supabaseClient';
import {
  AddConnectionsCard,
  CompleteProfileCard,
  ConnectionsCard,
  MainAncestorCard,
  ParentCard,
  ProfileCard,
} from './partial/index';

function Profile() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [connections, setConnections] = useState([]);
  const [error, setError] = useState(null);
  const { userId } = useParams();
  const navigate = useNavigate();
  const [avatarUrls, setAvatarUrls] = useState([]);

  const goToAvatar = () => navigate(`/antavatar/${userId}`);
  const goToResidence = () => navigate(`/residenceform/${userId}`);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let { data, error } = await supabase
          .from('profile')
          .select(
            `
              id, firstname, nickname, lastname, avatar_url, ancestor, parent, sunrise, sunset,
              parent_profile:parent (id, firstname, nickname, lastname, avatar_url),
              ancestor_profile:ancestor (id, firstname, nickname, lastname, avatar_url),
              profilestate (
                city,
                state:state_id (state_name)
              )
            `
          )
          .eq('id', userId);

        if (error) throw error;
        if (data && data.length > 0) setData(data[0]);

        // Fetch connections data
        const { data: connectionData, error: connectionError } = await supabase
          .from('connection')
          .select(
            `
            profile_2,
            connection_type:connection_type (connection_name)
          `
          )
          .eq('profile_1', userId);

        if (connectionError) throw connectionError;

        // Fetch profile details for connections
        const profileIds = connectionData.map((conn) => conn.profile_2);
        const { data: profileData, error: profileError } = await supabase
          .from('profile')
          .select(
            'id, firstname, nickname, lastname, avatar_url, sunrise, sunset'
          )
          .in('id', profileIds);

        if (profileError) throw profileError;

        // Map connection data with profile details
        const connectionsWithDetails = connectionData.map((conn) => ({
          ...conn,
          profile_2: profileData.find(
            (profile) => profile.id === conn.profile_2
          ),
        }));

        setConnections(connectionsWithDetails);

        // Fetch avatar URLs for current user and connections
        const userIds = [userId, ...profileIds];
        const avatarFetchPromises = userIds.map(async (id) => {
          const { data: profileAvatar, error: avatarError } =
            await supabase.storage.from('avatars').getPublicUrl(`${id}.jpg`);

          if (avatarError) {
            console.error(
              `Error fetching avatar for ${id}:`,
              avatarError.message
            );
            return null;
          }

          return profileAvatar?.data?.publicUrl || null;
        });

        const avatarUrls = await Promise.all(avatarFetchPromises);
        setAvatarUrls(avatarUrls.filter((url) => url !== null));
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
  if (!data) return <div>No profile found for this user.</div>;

  // Group connections by type for rendering
  const connectionGroups = connections.reduce((acc, conn) => {
    const type = conn.connection_type.connection_name;
    if (!acc[type]) acc[type] = [];
    acc[type].push(conn);
    return acc;
  }, {});

  // Check if all connection types are present
  const hasParent = data.parent_profile || (connectionGroups.parent && connectionGroups.parent.length > 0);
  const hasSpouse = connectionGroups.spouse && connectionGroups.spouse.length > 0;
  const hasChild = connectionGroups.child && connectionGroups.child.length > 0;
  const needsConnections = !hasParent || !hasSpouse || !hasChild;

  return (
    <Flex
      vertical
      gap="small"
      style={{ padding: '1rem', height: '100%' }}
    >
      <ProfileCard data={data} />
      <CompleteProfileCard
        data={data}
        goToAvatar={goToAvatar}
        goToResidence={goToResidence}
      />
      <MainAncestorCard ancestor={data.ancestor} />
      <ParentCard data={data} />
      <ConnectionsCard
        userId={userId}
        connectionGroups={connectionGroups}
        parent={data.parent_profile}
      />

      {needsConnections && (
        <AddConnectionsCard
          userId={userId}
          connectionGroups={connectionGroups}
          parent={data.parent_profile}
        />
      )}

      <TreePlace />
    </Flex>
  );
}

export default Profile;

const TreePlace = () => {
  return (
    <Card
      style={{
        backgroundColor: '#5b1f40',
        color: '#f3e7b1',
        fontWeight: 'bold',
      }}
    >
      <Row justify="space-between">
        <Col>View place in family tree 🌳</Col>
        <Col> Arrow</Col>
      </Row>
    </Card>
  );
};
