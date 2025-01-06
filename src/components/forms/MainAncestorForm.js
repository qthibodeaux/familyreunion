import { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Row, Col, Card, Typography, Image, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import AuthConsumer from '../../useSession';
import useParentDirector from '../../components/director/useParentDirector';

import alma from '../../assets/alma.jpg';
import ben from '../../assets/ben.jpg';
import bobbie from '../../assets/bobbie.jpg';
import hazel from '../../assets/hazel.jpg';
import james from '../../assets/james.jpg';
import john from '../../assets/john.jpg';
import joyce from '../../assets/joyce.jpg';
import lorene from '../../assets/lorene.jpg';
import loretta from '../../assets/loretta.jpg';
import mary from '../../assets/mary.jpg';
import sylvester from '../../assets/sylvester.jpg';

const imageMap = {
  Alma: alma,
  Ben: ben,
  'Bobbie Jean': bobbie,
  Hazel: hazel,
  James: james,
  John: john,
  Joyce: joyce,
  Lorene: lorene,
  Loretta: loretta,
  Mary: mary,
  Sylvester: sylvester,
};

function MainAncestorForm() {
  useParentDirector();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAncestor, setSelectedAncestor] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();
  const { session } = AuthConsumer();
  const { Title, Text } = Typography;

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profile')
          .select('*')
          .eq('branch', 1)
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

  const goBack = () => navigate(`/profile/${session.user.id}`);

  const handleAvatarClick = (ancestor) => {
    const imageSrc =
      imageMap[ancestor.firstname] || 'https://via.placeholder.com/150';
    setSelectedAncestor({ ...ancestor, imageSrc });
    setShowWarning(false);
  };

  const handleConfirm = async () => {
    if (!selectedAncestor) {
      setShowWarning(true);
      return;
    }

    const { error } = await supabase
      .from('profile')
      .update({ ancestor: selectedAncestor.id })
      .eq('id', session.user.id);

    if (error) {
      console.log(error);
    }

    goToProfile();
  };

  const goToProfile = () => navigate(`/profile/${session.user.id}`);

  return (
    <Row justify="center" align="middle" style={{ padding: '16px' }}>
      <Col span={24}>
        <Card
          style={{
            background: '#C77875',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <Row justify="center" style={{ marginBottom: '16px' }}>
            {selectedAncestor && (
              <Col style={{ textAlign: 'center' }}>
                <Row>
                  <Image
                    src={selectedAncestor.imageSrc}
                    style={{
                      width: '5rem',
                      height: '5rem',
                      borderRadius: '10px',
                    }}
                  />
                </Row>
                <Row justify="center">
                  <Title level={4} strong>
                    {selectedAncestor.nickname || selectedAncestor.firstname}
                  </Title>
                </Row>
              </Col>
            )}
          </Row>
          <Row justify="center" style={{ marginBottom: '16px' }}>
            <Title
              level={2}
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                color: '#5b1f40',
              }}
            >
              Who is your first branch ancestor?
            </Title>
          </Row>
          <Row gutter={[16, 16]}>
            {profiles.map((profile, index) => {
              const imageSrc =
                imageMap[profile.firstname] ||
                'https://via.placeholder.com/150';
              return (
                <Col
                  key={index}
                  span={6}
                  onClick={() => handleAvatarClick(profile)}
                >
                  <Row
                    style={{
                      width: '100%',
                      paddingTop: '100%', // Makes the Row a square
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <img
                      src={imageSrc}
                      alt={profile.firstname}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </Row>
                  <Row justify="center">
                    <Text strong style={{ color: '#5b1f40' }}>
                      {profile.nickname || profile.firstname}
                    </Text>
                  </Row>
                </Col>
              );
            })}
            <Col span={6}>
              <Row
                align="middle"
                justify="center" // Center horizontally
                style={{
                  width: '100%',
                  paddingTop: '100%', // Makes the Row a square
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <Title
                  style={{
                    color: '#5b1f40',
                    position: 'absolute',
                    top: '50%', // Vertically center the text
                    left: 0,
                    transform: 'translateY(-50%)', // Adjust for vertical alignment
                    paddingLeft: '.25rem',
                    width: '100%',
                    height: '100%',
                    fontSize: '.8rem', // Enlarge the font size
                    fontWeight: 'bold', // Make the text bold
                  }}
                >
                  Friend of Family
                </Title>
              </Row>
            </Col>
          </Row>
          <Row justify="center" gutter={16} style={{ marginTop: '16px' }}>
            <Col>
              <Button
                style={{
                  color: '#F7DC92',
                  background: 'none',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
                onClick={() => setSelectedAncestor(null)}
              >
                Reset
              </Button>
            </Col>
            <Col>
              <Button
                style={{
                  color: '#873D62',
                  background: '#F7DC92',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
                onClick={handleConfirm}
              >
                Submit
              </Button>
            </Col>
          </Row>
          {showWarning && (
            <Row justify="center" style={{ marginTop: '16px' }}>
              <Text type="danger" strong>
                Please select an ancestor before pressing submit
              </Text>
            </Row>
          )}
          <Row justify="center" style={{ marginTop: '24px' }}>
            <Button
              style={{
                background: 'none',
                border: 'solid #EABEA9',
                color: '#F7DC92',
                fontWeight: 'bold',
              }}
              onClick={goBack}
            >
              Back
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
}

export default MainAncestorForm;
