import { useState } from 'react';
import { Card, Button, message } from 'antd';
import { supabase } from '../../supabaseClient';

const SmithParentInfo = ({ parent, parent_profile, userId }) => {
  const [loading, setLoading] = useState(false);

  const handleRemoveParent = async () => {
    setLoading(true);
    try {
      // Function to recursively update the branch of all descendants to null
      const updateDescendantBranches = async (parentId) => {
        const { data: descendants, error } = await supabase
          .from('profile')
          .select('id')
          .eq('parent', parentId);

        if (error) throw error;

        for (const descendant of descendants) {
          const { error: updateDescendantError } = await supabase
            .from('profile')
            .update({ branch: null })
            .eq('id', descendant.id);

          if (updateDescendantError) throw updateDescendantError;
          await updateDescendantBranches(descendant.id);
        }
      };

      // Update the profile
      const { error: updateError } = await supabase
        .from('profile')
        .update({
          parent: null,
          branch: null,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update all descendants
      await updateDescendantBranches(userId);

      message.success('Parent removed successfully');
    } catch (error) {
      message.error('Error removing parent');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Parent" style={{ backgroundColor: '#f3e7b1', width: '100%' }}>
      {parent_profile ? (
        <>
          <p>
            {parent_profile.firstname} {parent_profile.lastname}
          </p>
          <Button onClick={handleRemoveParent} loading={loading}>
            Remove Parent
          </Button>
        </>
      ) : (
        <p>No parent set</p>
      )}
    </Card>
  );
};

export default SmithParentInfo;
