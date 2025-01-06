import { useEffect, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Row,
  Typography,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Mary from '../assets/mary.jpg';

const { Title } = Typography;

function ProfileEdit() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const { userId } = useParams();
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [connections, setConnections] = useState([]);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let { data, error } = await supabase
          .from('profile')
          .select(
            `
              id, firstname, nickname, lastname, avatar_url, ancestor, parent, sunrise, sunset,
              parent_profile:parent (id, firstname, nickname, lastname, avatar_url),
              ancestor_profile:ancestor (id, firstname, nickname, lastname, avatar_url),
              profilestate (
                city,
                state:state_id (state_name)
              )
            `
          )
          .eq('id', userId);

        if (error) throw error;
        if (data && data.length > 0) setData(data[0]);
        if (data && data.length > 0) setFormData(data[0]);

        // Fetch connections data
        const { data: connectionData, error: connectionError } = await supabase
          .from('connection')
          .select(
            `
            profile_2,
            connection_type:connection_type (connection_name)
          `
          )
          .eq('profile_1', userId);

        if (connectionError) throw connectionError;

        // Fetch profile details for connections
        const profileIds = connectionData.map((conn) => conn.profile_2);
        const { data: profileData, error: profileError } = await supabase
          .from('profile')
          .select(
            'id, firstname, nickname, lastname, avatar_url, sunrise, sunset'
          )
          .in('id', profileIds);

        if (profileError) throw profileError;

        // Map connection data with profile details
        const connectionsWithDetails = connectionData.map((conn) => ({
          ...conn,
          profile_2: profileData.find(
            (profile) => profile.id === conn.profile_2
          ),
        }));

        setConnections(connectionsWithDetails);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No profile found for this user.</div>;

  const { firstname } = data;

  return (
    <Row style={{ padding: '1rem' }}>
      <Title>Account Settings</Title>
      <Button onClick={() => console.log({ data })}>Get Data</Button>

      <ProfileInfo data={data} formData={formData} setFormData={setFormData} />
      <AvatarInfo avatar_url={data.avatar_url} userId={userId} />
      <AncestorInfo
        ancestor={data.ancestor}
        ancestor_profile={data.ancestor_profile}
        userId={userId}
      />
      <SmithParentInfo
        parent={data.parent}
        parent_profile={data.parent_profile}
        userId={userId}
      />

      <ConnectionsInfo userId={userId} />
    </Row>
  );
}

export default ProfileEdit;

const ProfileInfo = ({ data, formData, setFormData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const handleEditClick = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    // Implement save logic here
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <Card
      title="Profile Information"
      style={{ backgroundColor: '#f3e7b1', width: '100%' }}
    >
      <Form
        layout="vertical"
        style={{ backgroundColor: '#f3e7b1', width: '100%' }}
      >
        {[
          'firstname',
          'nickname',
          'lastname',
          'sunrise',
          'sunset',
          'email',
        ].map((field) => (
          <Form.Item
            key={field}
            label={field.charAt(0).toUpperCase() + field.slice(1)}
          >
            {isEditing ? (
              <Input
                name={field}
                value={formData[field]}
                onChange={handleChange}
              />
            ) : (
              <span>{formData[field]}</span>
            )}
          </Form.Item>
        ))}
        <Row justify="end">
          <Col>
            <Button
              type="primary"
              onClick={isEditing ? handleSave : handleEditClick}
            >
              {isEditing ? 'Save' : 'Edit'}
            </Button>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

const AvatarInfo = ({ avatar_url, userId }) => {
  const [url, setUrl] = useState(null);
  const navigate = useNavigate();

  const goToAvatar = () => navigate(`/antavatar/${userId}`);

  useEffect(() => {
    const fetchPublicUrl = async () => {
      try {
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(avatar_url);
        setUrl(data.publicUrl);
      } catch (error) {
        console.error('Error fetching public URL:', error);
      }
    };

    if (avatar_url) {
      fetchPublicUrl();
    }
  }, [avatar_url]);

  return (
    <Row>
      <Col>
        <img
          src={url}
          alt={url}
          style={{ width: '5rem', borderRadius: '10%' }}
        />
      </Col>
      <Col>
        <Button onClick={goToAvatar}>Ant Avatar</Button>
      </Col>
    </Row>
  );
};

const AncestorInfo = ({ ancestor, ancestor_profile, userId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const removeAncestor = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile')
        .update({ ancestor: null })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      console.log('Ancestor removed successfully');
      window.location.reload();
    } catch (error) {
      console.error('Error removing ancestor:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const goToMainAncestorForm = () => navigate('/mainancestorform');

  return (
    <Card style={{ backgroundColor: '#f3e7b1', width: '100%' }}>
      {ancestor ? (
        <Col>
          <Row>
            <Avatar shape="square" size={64} src={Mary} />
            <h2 style={{ marginLeft: '1rem' }}>{ancestor_profile.firstname}</h2>
          </Row>
          <Row>
            <Button onClick={removeAncestor} disabled={isLoading}>
              {isLoading ? 'Removing...' : 'Remove Ancestor'}
            </Button>
          </Row>
        </Col>
      ) : (
        <Row justify="space-between">
          <Col>Which branch do you belong to?</Col>
          <Col>
            <Button
              icon={<EditOutlined />}
              style={{
                backgroundColor: 'transparent',
                borderColor: '#EABEA9',
                fontWeight: 'bold',
                color: 'white',
              }}
              onClick={() => goToMainAncestorForm()}
            ></Button>
          </Col>
        </Row>
      )}
    </Card>
  );
};

const SmithParentInfo = ({ parent, parent_profile, userId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const removeParent = async () => {
    setIsLoading(true);
    try {
      // Remove the parent from the profile
      const { error: profileError } = await supabase
        .from('profile')
        .update({ parent: null })
        .eq('id', userId);

      if (profileError) {
        throw profileError;
      }

      // Get the connection type ID for 'child'
      const { data: connectionTypeData, error: connectionTypeError } =
        await supabase
          .from('connection_type')
          .select('id')
          .eq('connection_name', 'child')
          .single();

      if (connectionTypeError) {
        throw connectionTypeError;
      }

      const connectionTypeId = connectionTypeData.id;

      // Remove the association from the connection table
      const { error: connectionError } = await supabase
        .from('connection')
        .delete()
        .eq('profile_1', parent)
        .eq('profile_2', userId)
        .eq('connection_type', connectionTypeId);

      if (connectionError) {
        throw connectionError;
      }

      // Check if the userId profile has a branch
      const { data: userProfile, error: userProfileError } = await supabase
        .from('profile')
        .select('branch')
        .eq('id', userId)
        .single();

      if (userProfileError) {
        throw userProfileError;
      }

      if (userProfile.branch !== null) {
        // Update the userId profile's branch to null
        const { error: updateUserProfileError } = await supabase
          .from('profile')
          .update({ branch: null })
          .eq('id', userId);

        if (updateUserProfileError) {
          throw updateUserProfileError;
        }

        // Function to recursively update the branch of all descendants to null
        const updateDescendantBranches = async (parentId) => {
          const { data: descendants, error: descendantsError } = await supabase
            .from('profile')
            .select('id')
            .eq('parent', parentId);

          if (descendantsError) {
            throw descendantsError;
          }

          for (const descendant of descendants) {
            const { error: updateDescendantError } = await supabase
              .from('profile')
              .update({ branch: null })
              .eq('id', descendant.id);

            if (updateDescendantError) {
              throw updateDescendantError;
            }

            // Recursively update the branch of the descendant's descendants
            await updateDescendantBranches(descendant.id);
          }
        };

        // Update the branches of all descendants
        await updateDescendantBranches(userId);
      }

      console.log('Parent removed successfully');
      window.location.reload();
    } catch (error) {
      console.error('Error removing parent:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const goToSmithParent = () => navigate('/mainancestorform');

  return (
    <Card
      title="Who is your Smith Parent?"
      style={{ backgroundColor: '#f3e7b1', width: '100%' }}
    >
      {parent ? (
        <Col>
          <Row>
            <Avatar shape="square" size={64} src={Mary} />
            <h2 style={{ marginLeft: '1rem' }}>{parent_profile.firstname}</h2>
          </Row>
          <Row>
            <Button onClick={removeParent} disabled={isLoading}>
              {isLoading ? 'Removing...' : 'Remove Parent'}
            </Button>
          </Row>
        </Col>
      ) : (
        <Row justify="space-between">
          <Col>Who is your Smith Parent?</Col>
          <Col>
            <Button
              icon={<EditOutlined />}
              style={{
                backgroundColor: 'transparent',
                borderColor: '#EABEA9',
                fontWeight: 'bold',
                color: 'white',
              }}
              onClick={() => goToSmithParent()}
            ></Button>
          </Col>
        </Row>
      )}
    </Card>
  );
};

const ConnectionsInfo = ({ userId }) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchConnections = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('connection')
          .select(
            `
            profile_2 (id, firstname, nickname, lastname, avatar_url),
            connection_type (id, connection_name)
          `
          )
          .eq('profile_1', userId);

        if (error) throw error;
        console.log('Fetched connections:', data); // Debug statement
        setConnections(data);
      } catch (error) {
        console.error('Error fetching connections:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, [userId]);

  const removeConnection = async (connection) => {
    setLoading(true);
    try {
      const { connection_name, id: connectionTypeId } =
        connection.connection_type;
      const { id: profile2Id } = connection.profile_2;

      let error;

      switch (connection_name) {
        case 'parent':
          ({ error } = await supabase
            .from('connection')
            .delete()
            .or(`profile_1.eq.${userId},profile_1.eq.${profile2Id}`)
            .and(`profile_2.eq.${userId},profile_2.eq.${profile2Id}`)
            .eq('connection_type', connectionTypeId));
          if (!error) {
            ({ error } = await supabase
              .from('profile')
              .update({ parent: null })
              .eq('id', userId));
            ({ error } = await supabase
              .from('profile')
              .update({ parent: null })
              .eq('id', profile2Id));
          }
          break;
        case 'spouse':
          ({ error } = await supabase
            .from('connection')
            .delete()
            .or(`profile_1.eq.${userId},profile_1.eq.${profile2Id}`)
            .and(`profile_2.eq.${userId},profile_2.eq.${profile2Id}`)
            .eq('connection_type', connectionTypeId));
          break;
        case 'child':
          const { data: childProfile, error: childError } = await supabase
            .from('profile')
            .select('parent, ancestor, branch')
            .eq('id', profile2Id)
            .single();
          if (childError) throw childError;

          if (childProfile.parent === userId) {
            const { error: updateError } = await supabase
              .from('profile')
              .update({ parent: null, ancestor: null })
              .eq('id', profile2Id);
            if (updateError) throw updateError;
          }

          // Remove the connection from the connection table where userId is profile_1
          let { error: deleteError1 } = await supabase
            .from('connection')
            .delete()
            .eq('profile_1', userId)
            .eq('profile_2', profile2Id)
            .eq('connection_type', connectionTypeId);
          if (deleteError1) throw deleteError1;

          // Remove the connection from the connection table where userId is profile_2
          let { error: deleteError2 } = await supabase
            .from('connection')
            .delete()
            .eq('profile_1', profile2Id)
            .eq('profile_2', userId)
            .eq('connection_type', connectionTypeId);
          if (deleteError2) throw deleteError2;

          // Remove the connection from the connection table where profile_1 is the child, profile_2 is userId, and connection type is 'parent'
          const {
            data: parentConnectionType,
            error: parentConnectionTypeError,
          } = await supabase
            .from('connection_type')
            .select('id')
            .eq('connection_name', 'parent')
            .single();
          if (parentConnectionTypeError) throw parentConnectionTypeError;

          const parentConnectionTypeId = parentConnectionType.id;

          let { error: deleteError3 } = await supabase
            .from('connection')
            .delete()
            .eq('profile_1', profile2Id)
            .eq('profile_2', userId)
            .eq('connection_type', parentConnectionTypeId);
          if (deleteError3) throw deleteError3;

          // If the child has a branch, recursively update all descendants
          if (childProfile.branch) {
            const updateDescendantsBranch = async (profileId) => {
              const { data: descendants, error } = await supabase
                .from('profile')
                .select('id')
                .eq('parent', profileId);

              if (error) throw error;

              for (const descendant of descendants) {
                const { error: updateDescendantError } = await supabase
                  .from('profile')
                  .update({ branch: null })
                  .eq('id', descendant.id);
                if (updateDescendantError) throw updateDescendantError;

                await updateDescendantsBranch(descendant.id);
              }
            };

            await updateDescendantsBranch(profile2Id);

            // Update the child's branch to null
            const { error: updateChildBranchError } = await supabase
              .from('profile')
              .update({ branch: null })
              .eq('id', profile2Id);
            if (updateChildBranchError) throw updateChildBranchError;
          }
          break;

        default:
          break;
      }

      if (error) throw error;

      setConnections(
        connections.filter((conn) => conn.profile_2.id !== profile2Id)
      );
      message.success('Connection removed successfully');
    } catch (error) {
      console.error('Error removing connection:', error.message);
      message.error('Error removing connection: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (connections.length === 0) return <div>No connections found.</div>;

  const parents = connections.filter(
    (conn) => conn.connection_type.connection_name === 'parent'
  );
  const spouses = connections.filter(
    (conn) => conn.connection_type.connection_name === 'spouse'
  );
  const children = connections.filter(
    (conn) => conn.connection_type.connection_name === 'child'
  );

  const renderConnections = (connectionsList, title) => (
    <Card title={title} style={{ marginBottom: '1rem' }}>
      {connectionsList.map((conn) => (
        <Row
          key={conn.profile_2.id}
          align="middle"
          style={{ marginBottom: '1rem' }}
        >
          <Avatar
            shape="square"
            size={64}
            src={conn.profile_2.avatar_url || 'default_avatar.png'}
          />
          <Col style={{ marginLeft: '1rem' }}>
            <Title level={5}>
              {conn.profile_2.firstname} {conn.profile_2.lastname}
            </Title>
            <Button onClick={() => removeConnection(conn)}>Remove</Button>
          </Col>
        </Row>
      ))}
    </Card>
  );

  return (
    <Card
      title="Connections"
      style={{ backgroundColor: '#f3e7b1', width: '100%' }}
    >
      {renderConnections(parents, 'Parents')}
      {renderConnections(spouses, 'Spouses')}
      {renderConnections(children, 'Children')}
    </Card>
  );
};
