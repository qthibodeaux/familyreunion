import { useState } from 'react';
import { Card, Button, message } from 'antd';
import { supabase } from '../../supabaseClient';

const AncestorInfo = ({ ancestor, ancestor_profile, userId }) => {
  const [loading, setLoading] = useState(false);

  const handleRemoveAncestor = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profile')
        .update({ ancestor: null })
        .eq('id', userId);

      if (error) throw error;
      message.success('Ancestor removed successfully');
    } catch (error) {
      message.error('Error removing ancestor');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Ancestor" style={{ backgroundColor: '#f3e7b1', width: '100%' }}>
      {ancestor_profile ? (
        <>
          <p>
            {ancestor_profile.firstname} {ancestor_profile.lastname}
          </p>
          <Button onClick={handleRemoveAncestor} loading={loading}>
            Remove Ancestor
          </Button>
        </>
      ) : (
        <p>No ancestor set</p>
      )}
    </Card>
  );
};

export default AncestorInfo;
