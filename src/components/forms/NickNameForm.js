import { useState } from 'react';
import { Button, Col, Card, Input, Row, Typography } from 'antd';
const { Title, Text } = Typography;

const NickNameForm = ({ setNickName, setActiveTab, setFirstName, type }) => {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);

  const onChange = (event) => {
    if (value === '') setShowError(true);
    else setShowError(false);
    setValue(event.target.value);
  };

  const noNickName = () => {
    setActiveTab('LastNameForm');
  };

  const checkValidNickName = () => {
    if (value === '') return setShowError(true);
    setActiveTab('LastNameForm');
    setNickName(value);
  };

  const getHeadingText = () => {
    if (type === 'self') return 'Do you have a nickname?';
    else return 'Do they have a nickname?';
  };

  return (
    <Row style={{ padding: '1rem' }}>
      <Col span={24}>
        <Card
          style={{
            background: '#5b1f40',
            border: 'none',
            borderRadius: '8px',
            padding: '16px',
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
                placeholder="Nickname"
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
                onClick={noNickName}
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
                onClick={checkValidNickName}
                style={{
                  color: '#873D62',
                  background: '#F7DC92',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
              >
                Submit
              </Button>
            </Col>
          </Row>
          <Row justify="center" style={{ marginTop: '3rem' }}>
            <Button
              onClick={() => {
                setFirstName('');
                setActiveTab('NameForm');
              }}
              style={{
                background: 'none',
                border: 'solid #EABEA9',
                color: '#F7DC92',
                fontWeight: 'bold',
              }}
            >
              Back
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

export default NickNameForm;
