import { useState } from 'react';
import { Card, Form, Input, Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';

const ProfileInfo = ({ data, formData, setFormData }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const handleEditClick = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
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
        {['firstname', 'nickname', 'lastname'].map((field) => (
          <Form.Item key={field} label={field.charAt(0).toUpperCase() + field.slice(1)}>
            {isEditing ? (
              <Input
                name={field}
                value={formData?.[field] || ''}
                onChange={handleChange}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span>{data?.[field]}</span>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={handleEditClick}
                />
              </div>
            )}
          </Form.Item>
        ))}
        {isEditing && (
          <Button type="primary" onClick={handleSave}>
            Save
          </Button>
        )}
      </Form>
    </Card>
  );
};

export default ProfileInfo;
