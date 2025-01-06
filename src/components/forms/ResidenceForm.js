import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import {
  Button,
  Col,
  Card,
  Input,
  message,
  Row,
  Select,
  Typography,
} from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

function ResidenceForm() {
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [stateName, setStateName] = useState('');
  const [stateData, setStateData] = useState([]);
  const [showError, setShowError] = useState(false);
  const navigate = useNavigate();
  const { userid } = useParams();

  const goToProfile = () => {
    navigate(`/profile/${userid}`);
  };

  useEffect(() => {
    async function fetchStates() {
      const { data, error } = await supabase.from('state').select('*');
      if (error) {
        console.error('Error fetching state data:', error);
        return;
      }
      setStateData(data);
    }

    fetchStates();
  }, []);

  const handleStateChange = (value) => {
    setShowError(false);
    setState(value);
    var filteredState = stateData.filter((state) => state.id === value);
    setStateName(filteredState[0].state_name);
  };

  const handleReset = () => {
    setCity('');
    setState('');
    setStateName('');
  };

  const handleSubmit = async () => {
    if (!state || !city) {
      setShowError(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('profilestate')
        .insert([{ profile_id: userid, state_id: state, city: city }]);

      if (error) {
        console.error('Error inserting data:', error);
        message.error('Failed to submit the form.');
      } else {
        message.success('Form submitted successfully!');
        navigate(`/profile/${userid}`);
      }
    } catch (error) {
      console.error('Error inserting data:', error);
      message.error('Failed to submit the form.');
    }
  };

  return (
    <Row
      justify="center"
      align="start"
      style={{ padding: '1rem', height: '100%' }}
    >
      <Col span={24} style={{ backgroundColor: 'transparent' }}>
        <Card
          style={{
            padding: '24px',
            backgroundColor: '#5b1f40',
            border: 'none',
          }}
        >
          <Row>
            <Title
              level={3}
              style={{
                textAlign: 'center',
                color: '#f3e7b1',
                fontWeight: 'bold',
                fontSize: '2rem',
              }}
            >
              Where do you currently live?
            </Title>
          </Row>
          <Row gutter={8} style={{ paddingBottom: '.8rem' }}>
            {city && (
              <Col>
                <Text
                  style={{
                    textAlign: 'center',
                    color: '#f3e7b1',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                  }}
                >
                  {city} ,
                </Text>
              </Col>
            )}

            <Col>
              <Text
                style={{
                  textAlign: 'center',
                  color: '#f3e7b1',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                }}
              >
                {stateName}
              </Text>
            </Col>
          </Row>
          <Row>
            <Col style={{ width: '100%' }}>
              <Select
                placeholder="Select a state"
                onChange={handleStateChange}
                value={state}
                size="large"
                style={{ width: '100%' }}
              >
                {stateData.map((state) => (
                  <Option key={state.id} value={state.id}>
                    {state.state_name}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
          {state && (
            <Row justify="center" style={{ marginTop: '.8rem' }}>
              <Col>
                <Input
                  onChange={(e) => {
                    setCity(e.target.value);
                    setShowError(false);
                  }}
                  placeholder="Enter the city"
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
          )}
          {showError && (city === '' || state === '') && (
            <Row justify="center" style={{ marginTop: '1rem' }}>
              <Col>
                <Text type="danger">City & State cannot be blank.</Text>
              </Col>
            </Row>
          )}
          <Row justify="center" gutter={16} style={{ marginTop: '16px' }}>
            <Col>
              <Button
                style={{
                  color: '#873D62',
                  background: '#F7DC92',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
                onClick={handleReset}
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
                onClick={() => {
                  console.log('Submit Clicked');
                  if (!state || !city) {
                    setShowError(true); // Show error if city is blank
                    return;
                  }
                  handleSubmit();
                }}
              >
                Submit
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
              onClick={goToProfile}
            >
              Back
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
}

export default ResidenceForm;
