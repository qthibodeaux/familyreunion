import { useState, useEffect } from 'react';
import { Card, Button, message } from 'antd';
import { supabase } from '../../supabaseClient';

const ConnectionsInfo = ({ userId }) => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, [userId]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
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
        .select('id, firstname, nickname, lastname, avatar_url, sunrise, sunset')
        .in('id', profileIds);

      if (profileError) throw profileError;

      // Map connection data with profile details
      const connectionsWithDetails = connectionData.map((conn) => ({
        ...conn,
        profile_2: profileData.find((profile) => profile.id === conn.profile_2),
      }));

      setConnections(connectionsWithDetails);
    } catch (error) {
      message.error('Error fetching connections');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Connections" style={{ backgroundColor: '#f3e7b1', width: '100%' }}>
      {connections.length > 0 ? (
        connections.map((connection) => (
          <div key={connection.profile_2.id}>
            <p>
              {connection.profile_2.firstname} {connection.profile_2.lastname} -{' '}
              {connection.connection_type.connection_name}
            </p>
          </div>
        ))
      ) : (
        <p>No connections found</p>
      )}
    </Card>
  );
};

export default ConnectionsInfo;
