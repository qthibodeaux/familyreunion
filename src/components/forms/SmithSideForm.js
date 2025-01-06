import { useNavigate } from 'react-router-dom';
import { Button, Col, Card, Row, Typography } from 'antd';
const { Title } = Typography;

const NameForm = ({ setActiveTab, setSmithside }) => {
  const navigate = useNavigate();

  const setNo = () => {
    setSmithside(false);
    setActiveTab('SunriseForm');
  };

  const setYes = () => {
    setSmithside(true);
    setActiveTab('SunriseForm');
  };

  const goToHome = () => {
    navigate('/');
  };

  return (
    <Row
      justify="center"
      align="start"
      style={{ padding: '1rem' }}
    >
      <Col span={24} style={{ backgroundColor: 'transparent' }}>
        <Card
          style={{
            padding: '24px',
            backgroundColor: '#5b1f40',
            border: 'none',
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
            Are you their Smith side parent?
          </Title>
          <Row justify="center" gutter={16} style={{ marginTop: '16px' }}>
            <Col>
              <Button
                onClick={setNo}
                style={{
                  color: '#873D62',
                  background: '#F7DC92',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
              >
                No
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                onClick={setYes}
                style={{
                  color: '#873D62',
                  background: '#F7DC92',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
              >
                Yes
              </Button>
            </Col>
          </Row>
          <Row justify="center" style={{ paddingTop: '3rem' }}>
            <Button
              style={{
                background: 'none',
                border: 'solid #EABEA9',
                color: '#F7DC92',
                fontWeight: 'bold',
              }}
              onClick={goToHome}
            >
              Back
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

export default NameForm;
