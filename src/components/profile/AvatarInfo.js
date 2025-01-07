import { Card, Avatar } from 'antd';
import Mary from '../../assets/mary.jpg';

const AvatarInfo = ({ avatar_url, userId }) => {
  return (
    <Card title="Avatar" style={{ backgroundColor: '#f3e7b1', width: '100%' }}>
      <Avatar
        size={64}
        src={avatar_url || Mary}
        style={{ backgroundColor: '#87d068' }}
      />
    </Card>
  );
};

export default AvatarInfo;
