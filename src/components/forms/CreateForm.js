import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Row, Col, Card, Typography, DatePicker, Button, Input } from 'antd';
import { supabase } from '../../supabaseClient';
import AuthConsumer from '../../useSession';
import useParentDirector from '../director/useParentDirector';
import { v4 as uuidv4 } from 'uuid';

function CreateForm() {
  useParentDirector();
  const { type } = useParams();
  const navigate = useNavigate();

  const goToConnectionForm = () => navigate(`/connectionform/${type}`);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickName, setNickName] = useState('');
  const [sunrise, setSunrise] = useState('');
  const [sunset, setSunset] = useState(null);

  const [activeTab, setActiveTab] = useState('NameForm');

  const MainPage = ({ activeTab }) => {
    let comp = (
      <h1
        style={{
          backgroundColor: 'red',
          padding: '20px',
          fontWeight: 600,
          color: '#fff',
        }}
      >
        Developer Error: invalid tabId!
      </h1>
    );
    if (activeTab === 'NameForm')
      comp = (
        <NameForm
          type={type}
          setActiveTab={setActiveTab}
          goToConnectionForm={goToConnectionForm}
          setFirstName={setFirstName}
          setNickName={setNickName}
        />
      );
    else if (activeTab === 'FirstNameForm')
      comp = (
        <FirstNameForm
          setNickName={setNickName}
          setActiveTab={setActiveTab}
          setFirstName={setFirstName}
        />
      );
    else if (activeTab === 'LastNameForm')
      comp = (
        <LastNameForm
          setLastName={setLastName}
          setActiveTab={setActiveTab}
          setFirstName={setFirstName}
          setNickName={setNickName}
        />
      );
    else if (activeTab === 'NickNameForm')
      comp = (
        <NickNameForm
          setActiveTab={setActiveTab}
          setFirstName={setFirstName}
          setNickName={setNickName}
        />
      );
    else if (activeTab === 'SunriseForm')
      comp = (
        <SunriseForm
          setActiveTab={setActiveTab}
          setSunrise={setSunrise}
          setLastName={setLastName}
        />
      );
    else if (activeTab === 'SunsetForm')
      comp = <SunsetForm setActiveTab={setActiveTab} setSunset={setSunset} />;
    else if (activeTab === 'ConfirmCard')
      comp = (
        <ConfirmCard
          type={type}
          setActiveTab={setActiveTab}
          firstName={firstName}
          nickName={nickName}
          lastName={lastName}
          sunrise={sunrise}
          sunset={sunset}
        />
      );

    return (
      <Row
        justify="center"
        align="middle"
        style={{ height: '100vh', background: '#f0f2f5' }}
      >
        <Col span={24} style={{ padding: '8px' }}>
          {comp}
        </Col>
      </Row>
    );
  };

  return (
    <Row
      justify="center"
      align="middle"
      style={{ height: '100vh', background: '#f0f2f5' }}
    >
      <Col span={24}>
        <FormInfoBox
          firstName={firstName}
          nickName={nickName}
          lastName={lastName}
          sunrise={sunrise}
        />
        <MainPage activeTab={activeTab} />
      </Col>
    </Row>
  );
}

const FormInfoBox = ({ firstName, lastName, nickName, sunrise, sunset }) => {
  const { Title } = Typography;

  function formatDate(dateString) {
    const date = new Date(dateString);
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }

  let formattedDate = formatDate(sunrise);
  let formattedSunset = formatDate(sunset);

  return (
    <Row
      justify="center"
      style={{
        visibility: firstName || nickName ? 'visible' : 'hidden',
        padding: '8px',
      }}
    >
      <Col span={24}>
        <Card
          style={{
            background: '#1890ff',
            borderRadius: '8px',
            padding: '24px',
          }}
        >
          <Row justify="center" align="middle" gutter={16}>
            <Col>
              <Title level={3} style={{ color: '#fff' }}>
                {firstName}
              </Title>
            </Col>
            {nickName && (
              <Col>
                <Title level={3} style={{ color: '#fff' }}>
                  {nickName}
                </Title>
              </Col>
            )}
            <Col>
              <Title level={3} style={{ color: '#fff' }}>
                {lastName}
              </Title>
            </Col>
          </Row>
          {sunrise && (
            <Row justify="center" align="middle" gutter={16}>
              <Col>
                <Title level={3} style={{ color: '#f3e7b1' }}>
                  Sunrise:
                </Title>
              </Col>
              <Col>
                <Title level={3} style={{ color: '#fff' }}>
                  {formattedDate}
                </Title>
              </Col>
            </Row>
          )}
          {sunset && (
            <Row justify="center" align="middle" gutter={16}>
              <Col>
                <Title level={3} style={{ color: '#f3e7b1' }}>
                  Sunset:
                </Title>
              </Col>
              <Col>
                <Title level={3} style={{ color: '#fff' }}>
                  {formattedSunset}
                </Title>
              </Col>
            </Row>
          )}
        </Card>
      </Col>
    </Row>
  );
};

const NameForm = ({
  type,
  goToConnectionForm,
  setActiveTab,
  setFirstName,
  setNickName,
}) => {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);
  const { Title, Text } = Typography;

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
    setActiveTab('FirstNameForm');
    setNickName(value);
  };

  const getHeadingText = () => {
    switch (type) {
      case 'self':
        return 'What do we call your Smith side parent?';
      case 'smithparent':
        return 'What do we call your Smith side parent?';
      case 'parent':
        return 'What do we call your parent?';
      case 'spouse':
        return 'What do we call your spouse?';
      case 'child':
        return 'What do we call your child?';
      default:
        return 'Does the profile exist?';
    }
  };

  return (
    <Row
      justify="center"
      align="middle"
      style={{ height: '100vh', background: '#f0f2f5' }}
    >
      <Col>
        <Card
          style={{
            borderRadius: '8px',
            padding: '24px',
            background: '#fafafa',
          }}
        >
          <Title level={3} style={{ textAlign: 'center' }}>
            {getHeadingText()}
          </Title>
          <Row justify="center" style={{ marginBottom: '16px' }}>
            <Col>
              <Input onChange={onChange} />
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
              <Button shape="round" onClick={checkValidFirstName}>
                First name?
              </Button>
            </Col>
            <Col>
              <Button type="primary" shape="round" onClick={checkValidNickName}>
                Nickname?
              </Button>
            </Col>
          </Row>
          <Row justify="center" style={{ marginTop: '24px' }}>
            <Button type="link" onClick={goToConnectionForm}>
              <Text strong>Back</Text>
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

const FirstNameForm = ({ setNickName, setActiveTab, setFirstName }) => {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);
  const { Title, Text } = Typography;

  const onChange = (event) => {
    if (value === '') setShowError(true);
    else setShowError(false);
    setValue(event.target.value);
  };

  const checkValidFirstName = () => {
    if (value === '') return setShowError(true);
    setActiveTab('LastNameForm');
    setFirstName(value);
  };

  return (
    <Row
      justify="center"
      align="middle"
      style={{ height: '100vh', background: '#f0f2f5' }}
    >
      <Col>
        <Card
          style={{
            borderRadius: '8px',
            padding: '24px',
            background: '#fafafa',
          }}
        >
          <Title level={3} style={{ textAlign: 'center' }}>
            What is their first name?
          </Title>
          <Row justify="center" style={{ marginBottom: '16px' }}>
            <Col>
              <Input onChange={onChange} />
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
              <Button shape="round" onClick={checkValidFirstName}>
                Submit
              </Button>
            </Col>
          </Row>
          <Row justify="center" style={{ marginTop: '24px' }}>
            <Button
              type="link"
              onClick={() => {
                setNickName('');
                setActiveTab('NameForm');
              }}
            >
              <Text strong>Back</Text>
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

const NickNameForm = ({ setNickName, setActiveTab, setFirstName }) => {
  const { Title, Text } = Typography;

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

  return (
    <Row
      justify="center"
      align="middle"
      style={{ height: '100vh', background: '#f0f2f5' }}
    >
      <Col>
        <Card
          style={{
            borderRadius: '8px',
            padding: '24px',
            background: '#fafafa',
          }}
        >
          <Title level={3} style={{ textAlign: 'center' }}>
            Do they have a nickname?
          </Title>
          <Row justify="center" style={{ marginBottom: '16px' }}>
            <Col>
              <Input onChange={onChange} />
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
              <Button shape="round" onClick={noNickName}>
                No
              </Button>
            </Col>
            <Col>
              <Button type="primary" shape="round" onClick={checkValidNickName}>
                Submit
              </Button>
            </Col>
          </Row>
          <Row justify="center" style={{ marginTop: '24px' }}>
            <Button
              type="link"
              onClick={() => {
                setFirstName('');
                setActiveTab('NameForm');
              }}
            >
              <Text strong>Back</Text>
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

const LastNameForm = ({
  setLastName,
  setActiveTab,
  setFirstName,
  setNickName,
}) => {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);
  const { Title, Text } = Typography;

  const onChange = (event) => {
    if (value === '') setShowError(true);
    else setShowError(false);
    setValue(event.target.value);
  };

  const checkValidLastName = () => {
    if (value === '') return setShowError(true);
    setActiveTab('SunriseForm');
    setLastName(value);
  };

  return (
    <Row
      justify="center"
      align="middle"
      style={{ height: '100vh', background: '#f0f2f5' }}
    >
      <Col>
        <Card
          style={{
            borderRadius: '8px',
            padding: '24px',
            background: '#fafafa',
          }}
        >
          <Title level={3} style={{ textAlign: 'center' }}>
            What is their last name?
          </Title>
          <Row justify="center" style={{ marginBottom: '16px' }}>
            <Col>
              <Input onChange={onChange} />
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
              <Button shape="round" onClick={checkValidLastName}>
                Submit
              </Button>
            </Col>
          </Row>
          <Row justify="center" style={{ marginTop: '24px' }}>
            <Button
              type="link"
              onClick={() => {
                setFirstName('');
                setNickName('');
                setActiveTab('NameForm');
              }}
            >
              <Text strong>Back</Text>
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

const SunriseForm = ({ setLastName, setActiveTab, setSunrise }) => {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);
  const { Title, Text } = Typography;

  const onChange = (event) => {
    const nextValue = event.value;
    setValue(nextValue);
  };

  const checkValid = () => {
    if (value === '') return setShowError(true);
    setActiveTab('SunsetForm');
    setSunrise(value);
  };

  return (
    <Row
      justify="center"
      align="middle"
      style={{ height: '100vh', background: '#f0f2f5' }}
    >
      <Col>
        <Card
          style={{
            borderRadius: '8px',
            padding: '24px',
            background: '#fafafa',
          }}
        >
          <Title level={3} style={{ textAlign: 'center' }}>
            When is their birthday?
          </Title>
          <Row justify="center" style={{ marginBottom: '16px' }}>
            <Col>
              <DatePicker format="MM/DD/YY" value={value} onChange={onChange} />
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
              <Button shape="round" onClick={checkValid}>
                Submit
              </Button>
            </Col>
          </Row>
          <Row justify="center" style={{ marginTop: '24px' }}>
            <Button
              type="link"
              onClick={() => {
                setLastName('');
                setActiveTab('LastNameForm');
              }}
            >
              <Text strong>Back</Text>
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

const ConfirmCard = ({
  type,
  setActiveTab,
  firstName,
  nickName,
  lastName,
  sunrise,
  sunset,
}) => {
  const navigate = useNavigate();
  const { session } = AuthConsumer();
  const { Title, Text } = Typography;
  const userId = session?.user.id;

  function formatDate(dateString) {
    const date = new Date(dateString);

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month} ${day}, ${year}`;
  }

  let formattedDate = formatDate(sunrise);
  let formattedSunset = formatDate(sunset);

  const createProfile = async () => {
    try {
      const profileId = uuidv4(); // Generate UUID for profile

      const profileData = {
        id: profileId,
        firstname: firstName,
        nickname: nickName,
        lastname: lastName,
        sunrise,
      };

      // Set parent for child profiles
      if (type === 'child') {
        profileData.parent = userId; // Set parent as current user
      }

      // Insert profile into 'profile' table
      const { data: profileInsertData, error: profileInsertError } =
        await supabase.from('profile').insert(profileData).select();

      if (profileInsertError) {
        console.error('Error updating profile:', profileInsertError);
        return { success: false, error: profileInsertError };
      }

      console.log('Profile successfully created:', profileInsertData);

      // Ensure profileInsertData is an array and get the profile ID
      const newProfileId = profileInsertData[0]?.id;
      if (!newProfileId) {
        console.error('Error: Profile ID not found after insert');
        return { success: false, error: 'Profile ID not found' };
      }

      if (['parent', 'spouse', 'child'].includes(type)) {
        const connectionTypeId = await getConnectionTypeId(type); // Implement this function to get connection type ID based on type
        let parentTypeId, childTypeId;

        if (type === 'parent' || type === 'child') {
          parentTypeId = await getConnectionTypeId('parent');
          childTypeId = await getConnectionTypeId('child');
        }

        if (connectionTypeId) {
          let connectionData = [];

          if (type === 'parent') {
            // Parent connection
            connectionData = [
              {
                profile_1: userId,
                profile_2: newProfileId,
                connection_type: parentTypeId,
              },
              {
                profile_1: newProfileId,
                profile_2: userId,
                connection_type: childTypeId,
              },
            ];
          } else if (type === 'child') {
            // Child connection
            connectionData = [
              {
                profile_1: userId,
                profile_2: newProfileId,
                connection_type: childTypeId,
              },
              {
                profile_1: newProfileId,
                profile_2: userId,
                connection_type: parentTypeId,
              },
            ];
          } else {
            // Spouse connection
            connectionData = [
              {
                profile_1: userId,
                profile_2: newProfileId,
                connection_type: connectionTypeId,
              },
              {
                profile_1: newProfileId,
                profile_2: userId,
                connection_type: connectionTypeId,
              },
            ];
          }

          // Insert connection into 'connection' table
          const { error: connectionInsertError } = await supabase
            .from('connection')
            .insert(connectionData);

          if (connectionInsertError) {
            console.error('Error inserting connection:', connectionInsertError);
            return { success: false, error: connectionInsertError };
          }

          console.log('Connection inserted successfully.');
        } else {
          console.error('Connection type ID not found for:', type);
        }
      }

      navigate(`/profile/${newProfileId}`);
      return { success: true, data: profileInsertData };
    } catch (error) {
      console.error('Error updating profile:', error.message);
      return { success: false, error: error.message };
    }
  };

  const getConnectionTypeId = async (typeName) => {
    // Implement logic to fetch connection type ID based on typeName from 'connection_type' table
    try {
      const { data, error } = await supabase
        .from('connection_type')
        .select('id')
        .eq('connection_name', typeName)
        .single();

      if (error) {
        console.error('Error fetching connection type:', error);
        return null;
      }

      return data?.id;
    } catch (error) {
      console.error('Error fetching connection type:', error.message);
      return null;
    }
  };

  return (
    <Row
      justify="center"
      align="middle"
      style={{ height: '100vh', background: '#f0f2f5' }}
    >
      <Col>
        <Card
          style={{
            borderRadius: '8px',
            padding: '24px',
            background: '#fafafa',
          }}
        >
          <Title level={3} style={{ textAlign: 'center' }}>
            Is this information Correct?
          </Title>
          <Row justify="start" gutter={16} style={{ padding: '0 24px' }}>
            <Col>
              <Text size="large">First Name:</Text>
            </Col>
            <Col>
              <Text strong size="large">
                {firstName}
              </Text>
            </Col>
          </Row>
          {nickName && (
            <Row justify="start" gutter={16} style={{ padding: '0 24px' }}>
              <Col>
                <Text size="large">Nickname:</Text>
              </Col>
              <Col>
                <Text strong size="large">
                  {nickName}
                </Text>
              </Col>
            </Row>
          )}
          <Row justify="start" gutter={16} style={{ padding: '0 24px' }}>
            <Col>
              <Text size="large">Last Name:</Text>
            </Col>
            <Col>
              <Text strong size="large">
                {lastName}
              </Text>
            </Col>
          </Row>
          <Row justify="start" gutter={16} style={{ padding: '0 24px' }}>
            <Col>
              <Text size="large">Sunrise:</Text>
            </Col>
            <Col>
              <Text strong size="large">
                {formattedDate}
              </Text>
            </Col>
          </Row>
          {formattedSunset && (
            <Row justify="start" gutter={16} style={{ padding: '0 24px' }}>
              <Col>
                <Text size="large">Sunset:</Text>
              </Col>
              <Col>
                <Text strong size="large">
                  {formattedSunset}
                </Text>
              </Col>
            </Row>
          )}
          <Row justify="center" gutter={16} style={{ marginTop: '16px' }}>
            <Col>
              <Button shape="round" onClick={createProfile}>
                Confirm
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                shape="round"
                onClick={() => setActiveTab('NameForm')}
              >
                Edit
              </Button>
            </Col>
          </Row>
          <Row justify="center" style={{ marginTop: '24px' }}>
            <Button type="link" onClick={() => setActiveTab('SunsetForm')}>
              <Text strong>Back</Text>
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

const SunsetForm = ({ setActiveTab, setSunset }) => {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);
  const { Title, Text } = Typography;

  const onChange = (event) => {
    const nextValue = event.value;
    setValue(nextValue);
  };

  const checkValid = () => {
    if (value === '') return setShowError(true);
    setActiveTab('ConfirmCard');
    setSunset(value);
  };

  const goToConfirm = () => {
    setActiveTab('ConfirmCard');
  };

  return (
    <Row
      justify="center"
      align="middle"
      style={{ height: '100vh', background: '#f0f2f5' }}
    >
      <Col>
        <Card
          style={{
            borderRadius: '8px',
            padding: '24px',
            background: '#fafafa',
          }}
        >
          <Title level={3} style={{ textAlign: 'center' }}>
            Have they passed away?
          </Title>
          <Row justify="center" style={{ marginBottom: '16px' }}>
            <DatePicker format="MM/DD/YY" value={value} onChange={onChange} />
          </Row>
          {showError && (
            <Text type="danger" strong>
              Required
            </Text>
          )}
          <Row justify="center" gutter={16} style={{ marginTop: '16px' }}>
            <Col>
              <Button shape="round" onClick={goToConfirm}>
                No
              </Button>
            </Col>
            <Col>
              <Button type="primary" shape="round" onClick={checkValid}>
                Submit
              </Button>
            </Col>
          </Row>
          <Row justify="center" style={{ marginTop: '24px' }}>
            <Button
              type="link"
              onClick={() => {
                setValue('');
                setShowError(false);
              }}
            >
              <Text strong>Back</Text>
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
};

export default CreateForm;
