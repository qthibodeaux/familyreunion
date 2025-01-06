import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Col, Card, Input, Row, Typography } from 'antd';
const { Title, Text } = Typography;

const NameForm = ({ setActiveTab, setFirstName, setNickName, type }) => {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();

  const onChange = (event) => {
    if (value === '') setShowError(true);
    else setShowError(false);
    setValue(event.target.value);
  };

  const checkValidFirstName = () => {
    if (value === '') return setShowError(true);
    setActiveTab('NickNameForm');
    setFirstName(value);
  };

  const checkValidNickName = () => {
    if (value === '') return setShowError(true);
    setActiveTab('NickNameForm');
    setNickName(value);
  };

  const goToHome = () => {
    navigate(-1);
  };

  const getHeadingText = () => {
    switch (type) {
      case 'self':
        return 'What does the family call you?';
      case 'smithparent':
        return 'What does the family call your Smith side parent?';
      case 'parent':
        return 'What does the family call your parent?';
      case 'spouse':
        return 'What does the family call your spouse?';
      case 'child':
        return 'What does the family call your child?';
      default:
        return 'Does the profile exist?';
    }
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
            {getHeadingText()}
          </Title>
          <Row justify="center" style={{ marginBottom: '16px' }}>
            <Col>
              <Input
                onChange={onChange}
                placeholder="Enter your name"
                size="large"
                style={{
                  background: '#6c254c',
                  border: 'none',
                  color: '#f3e7b1',
                  fontWeight: 'bold',
                  fontSize: '1.5rem',
                  borderRadius: '0',
                }}
              />
            </Col>
          </Row>
          {showError && (
            <Row justify="center" style={{ marginBottom: '16px' }}>
              <Text type="danger" strong>
                Required
              </Text>
            </Row>
          )}
          <Row justify="center" gutter={16} style={{ marginTop: '16px' }}>
            <Col>
              <Button
                onClick={checkValidFirstName}
                style={{
                  color: '#873D62',
                  background: '#F7DC92',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
              >
                First name?
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                onClick={checkValidNickName}
                style={{
                  color: '#873D62',
                  background: '#F7DC92',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
              >
                Nickname?
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
