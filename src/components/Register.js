import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Typography, Input, Button } from 'antd';
import { supabase } from '../supabaseClient';

function Register() {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');
  const { Title } = Typography;
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: value,
    });

    if (error) {
      alert(error.error_description || error.message);
    } else {
      alert('Check your email for the login link!');
    }

    setLoading(false);
    goHome();
  };

  const goHome = () => {
    navigate('/');
  };

  return (
    <Row justify="center" align="start" style={{ padding: '16px' }}>
      <Col span={24} style={{ backgroundColor: 'transparent' }}>
        <Card
          style={{
            padding: '24px',
            backgroundColor: '#5b1f40',
            border: 'none',
          }}
        >
          <Row justify="center" style={{ marginBottom: '32px' }}>
            <Col>
              <Title
                level={2}
                style={{
                  textAlign: 'center',
                  color: '#f3e7b1',
                  fontWeight: 'bold',
                  fontSize: '2rem',
                }}
              >
                Enter your email to get a link to sign in
              </Title>
            </Col>
          </Row>
          <Input
            size="large"
            placeholder="Email"
            onChange={(event) => setValue(event.target.value)}
            style={{
              background: '#6c254c',
              border: 'none',
              color: '#f3e7b1',
              fontWeight: 'bold',
              fontSize: '1.5rem',
              borderRadius: '0',
            }}
            value={value}
          />
          <Row justify="space-between" style={{ marginTop: '16px' }}>
            <Col>
              <Button
                onClick={goHome}
                style={{
                  color: '#F7DC92',
                  background: 'none',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
              >
                Cancel
              </Button>
            </Col>
            <Col>
              <Button
                onClick={() => setValue('')}
                style={{
                  color: '#F7DC92',
                  background: 'none',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
              >
                Reset
              </Button>
            </Col>
            <Col>
              <Button
                onClick={handleLogin}
                type="primary"
                htmlType="submit"
                loading={loading}
                style={{
                  color: '#873D62',
                  background: '#F7DC92',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
              >
                {loading ? 'Loading' : 'Submit'}
              </Button>
            </Col>
          </Row>
          <Row justify="center" style={{ marginTop: '32px' }}>
            <Col>
              <Title
                level={3}
                style={{ textAlign: 'center', color: '#f3e7b1' }}
              >
                The email will be tied to your profile.
              </Title>
            </Col>
          </Row>
        </Card>
      </Col>
    </Row>
  );
}

export default Register;
