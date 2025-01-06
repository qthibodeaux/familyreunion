import { useRef, useState, useEffect } from 'react';
import {
  AutoComplete,
  Avatar,
  Button,
  Card,
  Col,
  Input,
  Row,
  Typography,
} from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { supabase } from '../../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import AuthConsumer from '../../useSession';
import useParentDirector from '../director/useParentDirector';
import moment from 'moment';

function ParentForm() {
  useParentDirector();
  const navigate = useNavigate();
  const { session } = AuthConsumer();
  const { Title } = Typography;
  const { userid } = useParams();

  const goToProfile = () => navigate(`/profile/${session.user.id}`);
  const goToProfileForm = () => navigate('/profileform/smithparent');

  const [options, setOptions] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [formattedSunrise, setFormattedSunrise] = useState('');
  const [formattedSunset, setFormattedSunset] = useState('');

  const debounceTimeout = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const handleSearch = (value) => {
    setInputValue(value);
    setSearchText(value);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      if (value) {
        const { data, error } = await supabase
          .from('profile')
          .select('*')
          .or(
            `firstname.ilike.%${value}%,nickname.ilike.%${value}%,lastname.ilike.%${value}%`
          )
          .or('branch.is.null,branch.neq.0')
          .order('sunrise', { ascending: true });

        if (!error) {
          const formattedOptions = data.map((profile) => ({
            value: `${profile.firstname} ${
              profile.nickname ? `(${profile.nickname})` : ''
            } ${profile.lastname}`,
            label: `${profile.firstname} ${
              profile.nickname ? `(${profile.nickname})` : ''
            } ${profile.lastname}`,
            profile: profile,
          }));
          setOptions(formattedOptions);
        }
      } else {
        setOptions([]);
      }
    }, 300);
  };

  const handleSelect = (value) => {
    const selected = options.find((option) => option.value === value);
    if (selected) {
      setSelectedProfile(selected.profile);

      let fSunrise = moment(selected.sunrise).format('MMMM D, YYYY');
      let fSunset = selected.profile.sunset
        ? moment(selected.profile.sunset).format('MMMM D, YYYY')
        : null;

      setFormattedSunrise(fSunrise);
      setFormattedSunset(fSunset);
    }
  };

  const handleReset = () => {
    setOptions([]);
    setSearchText('');
    setSelectedProfile(null);
    setInputValue('');
  };

  const handleConfirm = async () => {
    const { data: parentProfile, error: parentProfileError } = await supabase
      .from('profile')
      .select('branch')
      .eq('id', selectedProfile.id)
      .single();

    if (parentProfileError) {
      console.error('Error fetching parent profile:', parentProfileError);
      return;
    }

    let newBranch = null;

    if (parentProfile && parentProfile.branch !== null) {
      newBranch = parentProfile.branch + 1;
    }

    const updateProfile = async (profileId, branchValue) => {
      const { error: updateError } = await supabase
        .from('profile')
        .update({
          branch: branchValue,
        })
        .eq('id', profileId);

      if (updateError) {
        console.error(`Error updating profile ${profileId}:`, updateError);
        return;
      }

      const { data: descendants, error: descendantsError } = await supabase
        .from('profile')
        .select('id')
        .eq('parent', profileId);

      if (descendantsError) {
        console.error(
          `Error fetching descendants of profile ${profileId}:`,
          descendantsError
        );
        return;
      }

      for (const descendant of descendants) {
        await updateProfile(descendant.id, branchValue + 1);
      }
    };

    await updateProfile(userid, newBranch);

    const { error: parentUpdateError } = await supabase
      .from('profile')
      .update({ parent: selectedProfile.id })
      .eq('id', userid);

    if (parentUpdateError) {
      console.error('Error updating parent profile:', parentUpdateError);
      return;
    }

    const { data: selectedProfileData, error: selectedProfileError } =
      await supabase
        .from('profile')
        .select('ancestor')
        .eq('id', selectedProfile.id)
        .single();

    if (selectedProfileError) {
      console.error(
        'Error fetching selected profile ancestor:',
        selectedProfileError
      );
      return;
    }

    const selectedProfileAncestor = selectedProfileData.ancestor;

    const { data: userProfileData, error: userProfileError } = await supabase
      .from('profile')
      .select('ancestor')
      .eq('id', userid)
      .single();

    if (userProfileError) {
      console.error('Error fetching user profile ancestor:', userProfileError);
      return;
    }

    const userProfileAncestor = userProfileData.ancestor;

    if (!userProfileAncestor && selectedProfileAncestor) {
      const { error: updateAncestorError } = await supabase
        .from('profile')
        .update({ ancestor: selectedProfileAncestor })
        .eq('id', userid);

      if (updateAncestorError) {
        console.error(
          'Error updating user profile ancestor:',
          updateAncestorError
        );
        return;
      }
    }

    const { data: connectionTypeData, error: connectionTypeError } =
      await supabase
        .from('connection_type')
        .select('id')
        .eq('connection_name', 'child')
        .single();

    if (connectionTypeError) {
      console.error('Error fetching connection type:', connectionTypeError);
      return;
    }

    const childConnectionTypeId = connectionTypeData.id;

    const { error: insertError } = await supabase.from('connection').insert([
      {
        profile_1: selectedProfile.id,
        profile_2: userid,
        connection_type: childConnectionTypeId,
      },
    ]);

    if (insertError) {
      console.error('Error inserting connection:', insertError);
      return;
    }

    goToProfile();
  };

  return (
    <div
      style={{ backgroundColor: '#f3e7b1', height: '100%', padding: '1rem' }}
    >
      <Card
        style={{
          background: '#5b1f40',
          border: 'none',
          borderRadius: '8px',
          padding: '8px',
        }}
      >
        <Title level={3} style={{ textAlign: 'center', color: '#f3e7b1' }}>
          Who is your Smith family parent?
        </Title>

        {selectedProfile && (
          <Col>
            <Row>
              <Col>
                <div>
                  <Avatar
                    icon={<UserOutlined />}
                    shape="square"
                    style={{
                      borderRadius: '8px',
                      width: '5rem',
                      height: '5rem',
                    }}
                  />
                </div>
              </Col>
              <Col>
                <Row style={{ marginLeft: '1rem' }}>
                  <Col span={24}>
                    <div
                      style={{
                        fontWeight: 'bold',
                        fontSize: '1.5rem',
                        color: '#f3e7b1',
                      }}
                    >
                      {selectedProfile.nickname
                        ? `${selectedProfile.firstname} ${selectedProfile.nickname}`
                        : selectedProfile.firstname}
                    </div>
                  </Col>
                </Row>
                <Row style={{ marginLeft: '1rem' }}>
                  <Col span={24}>
                    <div
                      style={{
                        fontWeight: 'bold',
                        fontSize: '1.5rem',
                        color: '#f3e7b1',
                      }}
                    >
                      {selectedProfile.lastname}
                    </div>
                  </Col>
                </Row>
              </Col>
            </Row>
            <Row style={{ marginTop: '.3rem' }}>
              <Col span={12}>
                <Row style={{ color: '#f3e7b1' }}>Sunrise</Row>
                <Row style={{ color: 'white' }}>{formattedSunrise}</Row>
              </Col>
              <Col span={12}>
                {formattedSunset && (
                  <div>
                    <Row justify="end" style={{ color: '#f3e7b1' }}>
                      Sunset
                    </Row>
                    <Row justify="end" style={{ color: 'white' }}>
                      {formattedSunset}
                    </Row>
                  </div>
                )}
              </Col>
            </Row>
            <Row justify="center" style={{ marginTop: '.5rem' }}>
              <Col>
                <Button
                  type="primary"
                  style={{
                    color: '#873D62',
                    background: '#F7DC92',
                    border: '.15rem solid #EABEA9',
                    fontWeight: 'bold',
                  }}
                  onClick={handleConfirm}
                >
                  Choose {selectedProfile.nickname || selectedProfile.firstname}
                </Button>
              </Col>
            </Row>
          </Col>
        )}

        <AutoComplete
          options={options}
          onSearch={handleSearch}
          placeholder="Search for names"
          onSelect={handleSelect}
          value={inputValue}
          style={{ marginTop: '.5rem' }}
        >
          <Input
            ref={inputRef}
            style={{
              background: '#6c254c',
              border: 'none',
              color: '#f3e7b1',
              fontWeight: 'bold',
              fontSize: '1.5rem',
              borderRadius: '0',
            }}
          />
        </AutoComplete>

        <Row justify="center" gutter={16} style={{ marginTop: '2rem' }}>
          <Col>
            <Button
              style={{
                color: '#F7DC92',
                background: 'none',
                border: '.15rem solid #EABEA9',
                fontWeight: 'bold',
              }}
              onClick={handleReset}
            >
              Reset
            </Button>
          </Col>
          <Col>
            <Button
              type="primary"
              style={{
                color: '#873D62',
                background: '#F7DC92',
                border: '.15rem solid #EABEA9',
                fontWeight: 'bold',
              }}
              onClick={goToProfileForm}
            >
              Create Profile
            </Button>
          </Col>
        </Row>

        <Row justify="center" style={{ marginTop: '24px' }}>
          <Button
            onClick={goToProfile}
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
    </div>
  );
}

export default ParentForm;
