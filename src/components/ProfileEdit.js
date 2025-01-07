import { useEffect, useState } from 'react';
import {
  Button,
  Row,
  Typography,
  Form,
  Input,
  Avatar,
  Space,
  message,
  Card,
  DatePicker,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { EditOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import dayjs from 'dayjs';

const { Title } = Typography;

function ProfileEdit() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { userId } = useParams();
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState('');
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    fetchProfileData();
    fetchConnections();
  }, [userId]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile')
        .select(`
          id, 
          firstname, 
          nickname, 
          lastname, 
          avatar_url,
          ancestor,
          parent,
          sunrise,
          sunset,
          parent_profile:parent (id, firstname, lastname),
          ancestor_profile:ancestor (id, firstname, lastname),
          profilestate (
            city,
            state:state_id (state_name)
          )
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        form.setFieldsValue({
          firstname: data.firstname,
          lastname: data.lastname,
          nickname: data.nickname,
          city: data.profilestate?.city,
          state: data.profilestate?.state?.state_name,
          sunrise: data.sunrise ? dayjs(data.sunrise) : null,
          sunset: data.sunset ? dayjs(data.sunset) : null,
          parent: data.parent_profile ? `${data.parent_profile.firstname} ${data.parent_profile.lastname}` : 'No Parent'
        });
        
        if (data.avatar_url) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(data.avatar_url);
          setImageUrl(publicUrl);
        }
      }
    } catch (error) {
      message.error('Error fetching profile data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('connection')
        .select(`
          profile_2 (id, firstname, lastname, avatar_url),
          connection_type (connection_name)
        `)
        .eq('profile_1', userId);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      message.error('Error fetching connections');
      console.error(error);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      const { error } = await supabase
        .from('profile')
        .update({
          firstname: values.firstname,
          lastname: values.lastname,
          nickname: values.nickname,
          sunrise: values.sunrise?.toISOString(),
          sunset: values.sunset?.toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      message.success('Profile updated successfully');
      setIsEditing(false);
      fetchProfileData();
    } catch (error) {
      message.error('Error updating profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const removeConnection = async (connection) => {
    try {
      const { error } = await supabase
        .from('connection')
        .delete()
        .eq('profile_1', userId)
        .eq('profile_2', connection.profile_2.id);

      if (error) throw error;

      message.success('Connection removed successfully');
      fetchConnections();
    } catch (error) {
      message.error('Error removing connection');
      console.error(error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Row justify="space-between" align="middle">
          <Title level={2}>Profile Information</Title>
          <Button 
            type="primary" 
            onClick={() => setIsEditing(!isEditing)}
            style={{
              backgroundColor: '#5b1f40',
              borderColor: '#873D62'
            }}
          >
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </Button>
        </Row>

        <Form
          form={form}
          layout="vertical"
          style={{ width: '100%' }}
        >
          <Card style={{ width: '100%', marginBottom: '2rem' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <Avatar 
                  size={120} 
                  src={imageUrl}
                  style={{ marginBottom: '1rem' }}
                />
                {isEditing && (
                  <div>
                    <Button 
                      onClick={() => navigate(`/antavatar/${userId}`)}
                      style={{
                        backgroundColor: '#5b1f40',
                        borderColor: '#873D62',
                        color: 'white'
                      }}
                    >
                      Change Avatar
                    </Button>
                  </div>
                )}
              </div>

              <Form.Item
                name="firstname"
                label="First Name"
                style={{ marginBottom: '1.5rem' }}
              >
                <Input 
                  disabled={!isEditing} 
                  size="large"
                  style={{ backgroundColor: 'white' }}
                />
              </Form.Item>

              <Form.Item
                name="lastname"
                label="Last Name"
                style={{ marginBottom: '1.5rem' }}
              >
                <Input 
                  disabled={!isEditing} 
                  size="large"
                  style={{ backgroundColor: 'white' }}
                />
              </Form.Item>

              <Form.Item
                name="nickname"
                label="Nickname"
                style={{ marginBottom: '1.5rem' }}
              >
                <Input 
                  disabled={!isEditing} 
                  size="large"
                  style={{ backgroundColor: 'white' }}
                />
              </Form.Item>

              <Form.Item
                name="sunrise"
                label="Birth Date"
                style={{ marginBottom: '1.5rem' }}
              >
                <DatePicker 
                  disabled={!isEditing} 
                  style={{ width: '100%' }}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="sunset"
                label="Death Date"
                style={{ marginBottom: '1.5rem' }}
              >
                <DatePicker 
                  disabled={!isEditing} 
                  style={{ width: '100%' }}
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="city"
                label="City"
                style={{ marginBottom: '1.5rem' }}
              >
                <Input 
                  disabled 
                  size="large"
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>

              <Form.Item
                name="state"
                label="State"
                style={{ marginBottom: '1.5rem' }}
              >
                <Input 
                  disabled 
                  size="large"
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>

              <Form.Item
                name="parent"
                label="Parent"
                style={{ marginBottom: '1.5rem' }}
              >
                <Input 
                  disabled
                  size="large"
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>

              {isEditing && (
                <Form.Item>
                  <Button 
                    type="primary"
                    onClick={handleSubmit} 
                    loading={loading}
                    size="large"
                    style={{
                      width: '100%',
                      backgroundColor: '#5b1f40',
                      borderColor: '#873D62'
                    }}
                  >
                    Save Changes
                  </Button>
                </Form.Item>
              )}
            </Space>
          </Card>
        </Form>

        <Card 
          title="Connections" 
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {connections.map((connection) => (
              <Row key={connection.profile_2.id} justify="space-between" align="middle" style={{ width: '100%' }}>
                <Space>
                  <Avatar src={connection.profile_2.avatar_url} size="large" />
                  <span style={{ fontSize: '16px' }}>
                    {connection.profile_2.firstname} {connection.profile_2.lastname}
                  </span>
                  <span style={{ fontSize: '16px', color: '#666' }}>
                    ({connection.connection_type.connection_name})
                  </span>
                </Space>
                <Button 
                  danger 
                  onClick={() => removeConnection(connection)}
                >
                  Remove
                </Button>
              </Row>
            ))}
            {connections.length === 0 && (
              <div style={{ textAlign: 'center', color: '#666', fontSize: '16px' }}>
                No connections found
              </div>
            )}
          </Space>
        </Card>
      </Space>
    </div>
  );
}

export default ProfileEdit;
