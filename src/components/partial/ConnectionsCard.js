import { Avatar, Card, Col, Row, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const { Text, Title } = Typography;

const ConnectionsCard = ({ userId, connectionGroups, parent }) => {
  const parentConnections = connectionGroups.parent || [];
  const spouseConnections = connectionGroups.spouse || [];
  const childConnections = connectionGroups.child || [];
  const [avatarUrls, setAvatarUrls] = useState({});

  const navigate = useNavigate();
  const addParent = () => navigate(`/profileform/parent/${userId}`);
  const addSpouse = () => navigate(`/profileform/spouse/${userId}`);
  const addChild = () => navigate(`/profileform/child/${userId}`);

  useEffect(() => {
    const fetchAvatarUrls = async () => {
      const profiles = [
        ...(parent ? [parent] : []),
        ...parentConnections.map(conn => conn.profile_2),
        ...spouseConnections.map(conn => conn.profile_2),
        ...childConnections.map(conn => conn.profile_2)
      ];

      const urls = {};
      for (const profile of profiles) {
        if (profile.avatar_url) {
          try {
            const { data } = supabase.storage
              .from('avatars')
              .getPublicUrl(profile.avatar_url);
            urls[profile.id] = data.publicUrl;
          } catch (error) {
            console.error('Error fetching public URL:', error);
          }
        }
      }
      setAvatarUrls(urls);
    };

    fetchAvatarUrls();
  }, [parent, parentConnections, spouseConnections, childConnections]);

  const hasConnections =
    parentConnections.length > 0 ||
    spouseConnections.length > 0 ||
    childConnections.length > 0 ||
    parent;

  if (!hasConnections) {
    return null;
  }

  const renderProfile = (profile) => {
    const { id, firstname, lastname, avatar_url } = profile;
    const initials = `${firstname[0]}${lastname[0]}`.toUpperCase();
    const publicUrl = avatarUrls[id];

    const goToProfile = () => navigate(`/profile/${id}`);
    const goToAvatar = (e) => {
      e.stopPropagation();
      navigate(`/profile/${id}`);
    };

    return (
      <Col span={6} style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <div 
          onClick={goToProfile} 
          style={{ cursor: 'pointer' }}
        >
          {publicUrl ? (
            <img
              src={publicUrl}
              alt={`${firstname} ${lastname}`}
              onClick={goToAvatar}
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '0.5rem',
                aspectRatio: '1/1',
                objectFit: 'cover',
                cursor: 'pointer'
              }}
            />
          ) : (
            <Avatar
              style={{
                backgroundColor: '#4E1237',
                width: '100%',
                height: 'auto',
                fontSize: '2rem',
                borderRadius: '0.5rem',
                aspectRatio: '1/1',
              }}
            >
              {initials}
            </Avatar>
          )}
          <Text 
            style={{ 
              color: '#f3e7b1', 
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {firstname}
          </Text>
        </div>
      </Col>
    );
  };

  return (
    <Card
      style={{
        backgroundColor: '#5b1f40',
        border: 'none',
        color: '#f3e7b1',
      }}
    >
      <Row>
        <Title level={4} style={{ color: '#f3e7b1' }}>
          Connections
        </Title>
      </Row>

      {(parent || parentConnections.length > 0) && (
        <>
          <Row justify="space-between">
            <Col>
              <Title level={4} style={{ color: '#f3e7b1' }}>
                Parents
              </Title>
            </Col>
            <Col>
              <PlusOutlined onClick={addParent} />
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            {parent && !parentConnections.some(conn => conn.profile_2.id === parent.id) && renderProfile(parent)}
            {parentConnections.map((conn, index) =>
              renderProfile(conn.profile_2)
            )}
          </Row>
        </>
      )}

      {spouseConnections.length > 0 && (
        <>
          <Row justify="space-between">
            <Col>
              <Title level={4} style={{ color: '#f3e7b1' }}>
                Spouse
              </Title>
            </Col>
            <Col>
              <PlusOutlined onClick={addSpouse} />
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            {spouseConnections.map((conn, index) =>
              renderProfile(conn.profile_2)
            )}
          </Row>
        </>
      )}

      {childConnections.length > 0 && (
        <>
          <Row justify="space-between">
            <Col>
              <Title level={4} style={{ color: '#f3e7b1' }}>
                Children
              </Title>
            </Col>
            <Col>
              <PlusOutlined onClick={addChild} />
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            {childConnections.map((conn, index) =>
              renderProfile(conn.profile_2)
            )}
          </Row>
        </>
      )}
    </Card>
  );
};

export default ConnectionsCard;
