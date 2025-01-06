import { Button, Card, Col, Row, Typography } from 'antd';
import { EditOutlined, UploadOutlined } from '@ant-design/icons';

const { Title } = Typography;

const CompleteProfileCard = ({ data, goToAvatar, goToResidence }) => {
  const { avatar_url, profilestate: [{ city } = {}] = [] } = data;
  const gta = () => {
    goToAvatar();
  };

  const gtr = () => {
    goToResidence();
  };

  if (avatar_url && city) return null;

  return (
    <Card
      style={{
        backgroundColor: '#5B1F40',
        color: '#f3e7b1',
        fontWeight: 'bold',
      }}
    >
      <Row>
        <Title level={3} style={{ color: '#F3E7B1' }}>
          Complete Your Profile
        </Title>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          {!avatar_url && (
            <div>
              <h3 style={{ marginBottom: '8px' }}>Upload a picture</h3>
              <Button
                icon={<UploadOutlined />}
                style={{
                  backgroundColor: 'transparent',
                  borderColor: '#EABEA9',
                  fontWeight: 'bold',
                  color: 'white',
                }}
                onClick={gta}
              >
                Upload
              </Button>
            </div>
          )}
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        {!city && (
          <Col span={24}>
            <h3>Where do you currently live?</h3>
            <Button
              icon={<EditOutlined />}
              style={{
                backgroundColor: 'transparent',
                borderColor: '#EABEA9',
                fontWeight: 'bold',
                color: 'white',
                marginTop: '8px',
              }}
              onClick={gtr}
            >
              Edit
            </Button>
          </Col>
        )}
      </Row>
    </Card>
  );
};

export default CompleteProfileCard;
