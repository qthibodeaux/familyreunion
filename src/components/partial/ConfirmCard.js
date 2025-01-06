import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Col, message, Row, Typography } from 'antd';
import { supabase } from '../../supabaseClient';
import AuthConsumer from '../../useSession';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

const { Text, Title } = Typography;

const ConfirmCard = ({
  setActiveTab,
  firstName,
  nickName,
  lastName,
  setSunrise,
  setSunset,
  smithside,
  sunrise,
  sunset,
  type,
}) => {
  const navigate = useNavigate();
  const { session } = AuthConsumer();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(false);
  const [connectionTypes, setConnectionTypes] = useState({});
  const [ancestor, setAncestor] = useState(null);

  let formattedSunrise = moment(sunrise).format('MMMM D, YYYY');
  let formattedSunset = sunset ? moment(sunset).format('MMMM D, YYYY') : null;

  useEffect(() => {
    const fetchConnectionTypes = async () => {
      const { data, error } = await supabase
        .from('connection_type')
        .select('id, connection_name');
      if (error) {
        message.error('Error fetching connection types: ' + error.message);
        return;
      }
      const connectionTypeMap = data.reduce((acc, { id, connection_name }) => {
        acc[connection_name] = id;
        return acc;
      }, {});
      setConnectionTypes(connectionTypeMap);
    };

    fetchConnectionTypes();
  }, []);

  useEffect(() => {
    const fetchAncestor = async () => {
      const { data, error } = await supabase
        .from('profile')
        .select('ancestor')
        .eq('id', userId);
      if (error) {
        message.error('Error fetching ancestor: ' + error.message);
        return;
      }
      if (data && data.length > 0) {
        setAncestor(data[0].ancestor);
      }
    };

    fetchAncestor();
  }, []);

  const goToBack = () => {
    if (sunset) {
      setSunset(null);
      setActiveTab('SunsetForm');
    } else {
      setSunrise(null);
      setActiveTab('SunriseForm');
    }
  };

  const createProfile = async () => {
    setLoading(true);

    const profileId = uuidv4();

    let profileData = {
      firstname: firstName,
      nickname: nickName,
      lastname: lastName,
      sunrise,
      sunset,
    };

    if (type !== 'self') {
      profileData.id = profileId;
    }

    if (ancestor && (type === 'smithparent' || type === 'child')) {
      profileData.ancestor = ancestor;
    }

    if (type === 'child') {
      // Fetch the parent profile to get the branch value
      const { data: parentProfile, error: parentProfileError } = await supabase
        .from('profile')
        .select('branch')
        .eq('id', userId)
        .single();

      if (parentProfileError) {
        message.error(
          'Error fetching parent profile: ' + parentProfileError.message
        );
        setLoading(false);
        return;
      }

      // If the parent profile has a branch, set the child's branch to parent branch + 1
      if (parentProfile && parentProfile.branch !== null) {
        profileData.branch = parentProfile.branch + 1;
      }

      profileData.parent = userId;
    }

    try {
      let profileError;
      if (type === 'self') {
        ({ error: profileError } = await supabase
          .from('profile')
          .update(profileData)
          .eq('id', userId));
      } else {
        ({ error: profileError } = await supabase
          .from('profile')
          .insert([profileData]));
      }

      if (profileError) throw profileError;

      let connectionData;
      switch (type) {
        case 'smithparent':
          connectionData = [
            {
              profile_1: profileId,
              profile_2: userId,
              connection_type: connectionTypes['child'],
            },
          ];
          const { error: updateError } = await supabase
            .from('profile')
            .update({ parent: profileId })
            .eq('id', userId);
          if (updateError) throw updateError;
          break;
        case 'spouse':
          connectionData = [
            {
              profile_1: userId,
              profile_2: profileId,
              connection_type: connectionTypes['spouse'],
            },
            {
              profile_1: profileId,
              profile_2: userId,
              connection_type: connectionTypes['spouse'],
            },
          ];
          break;
        case 'parent':
          connectionData = [
            {
              profile_1: userId,
              profile_2: profileId,
              connection_type: connectionTypes['parent'],
            },
            {
              profile_1: profileId,
              profile_2: userId,
              connection_type: connectionTypes['child'],
            },
          ];
          break;
        case 'child':
          connectionData = [
            {
              profile_1: userId,
              profile_2: profileId,
              connection_type: connectionTypes['child'],
            },
            {
              profile_1: profileId,
              profile_2: userId,
              connection_type: connectionTypes['parent'],
            },
          ];
          break;
        default:
          break;
      }

      if (connectionData) {
        let { error: connectionError } = await supabase
          .from('connection')
          .insert(connectionData);
        if (connectionError) throw connectionError;
      }

      message.success('Profile created successfully');
    } catch (error) {
      message.error('Error creating profile: ' + error.message);
    } finally {
      setLoading(false);
      navigate(`/profile/${userId}`);
    }
  };

  return (
    <Row
      justify="center"
      align="middle"
      style={{ padding: '1rem' }}
    >
      <Col span={24}>
        <Card
          style={{
            background: '#5b1f40',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
          }}
        >
          <Title
            level={3}
            style={{
              textAlign: 'center',
              color: '#f3e7b1',
              fontWeight: 'bold',
              fontSize: '2rem',
            }}
          >
            Is this information Correct?
          </Title>
          <Row justify="start" gutter={16}>
            <Col>
              <Text
                style={{
                  color: '#f3e7b1',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                }}
              >
                First Name:
              </Text>
            </Col>
            <Col>
              <Text
                style={{
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                }}
              >
                {firstName}
              </Text>
            </Col>
          </Row>
          {nickName && (
            <Row justify="start" gutter={16}>
              <Col>
                <Text
                  style={{
                    color: '#f3e7b1',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                  }}
                >
                  Nickname:
                </Text>
              </Col>
              <Col>
                <Text
                  style={{
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                  }}
                >
                  {nickName}
                </Text>
              </Col>
            </Row>
          )}
          <Row justify="start" gutter={16}>
            <Col>
              <Text
                style={{
                  color: '#f3e7b1',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                }}
              >
                Last Name:
              </Text>
            </Col>
            <Col>
              <Text
                style={{
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                }}
              >
                {lastName}
              </Text>
            </Col>
          </Row>
          <Row justify="start" gutter={16}>
            <Col>
              <Text
                style={{
                  color: '#f3e7b1',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                }}
              >
                Sunrise:
              </Text>
            </Col>
            <Col>
              <Text
                strong
                style={{
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                }}
              >
                {formattedSunrise}
              </Text>
            </Col>
          </Row>
          {sunset && (
            <Row justify="start" gutter={16}>
              <Col>
                <Text
                  style={{
                    color: '#f3e7b1',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                  }}
                >
                  Sunset:
                </Text>
              </Col>
              <Col>
                <Text
                  strong
                  style={{
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                  }}
                >
                  {formattedSunset}
                </Text>
              </Col>
            </Row>
          )}
          <Row justify="center" style={{ marginTop: '16px' }}>
            <Button
              style={{
                color: '#873D62',
                background: '#F7DC92',
                border: 'solid #EABEA9',
                fontWeight: 'bold',
              }}
              onClick={createProfile}
              loading={loading}
            >
              Create profile
            </Button>
          </Row>
          <Row justify="center" style={{ marginTop: '24px' }}>
            <Button
              style={{
                background: 'none',
                border: 'solid #EABEA9',
                color: '#F7DC92',
                fontWeight: 'bold',
              }}
              onClick={goToBack}
            >
              Back
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

export default ConfirmCard;
