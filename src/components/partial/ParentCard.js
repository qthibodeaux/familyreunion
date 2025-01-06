import { Button, Card, Col, Row } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

function ParentCard({ data }) {
  const { id, parent } = data;
  const navigate = useNavigate();

  const handleOnClick = () => navigate(`/parentform/${id}`);

  if (parent) return null;

  return (
    <Card
      style={{
        backgroundColor: '#5B1F40',
        color: '#f3e7b1',
        fontWeight: 'bold',
      }}
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <h3>Click to add your Smith side parent!</h3>
          <Button
            icon={<EditOutlined />}
            style={{
              backgroundColor: 'transparent',
              borderColor: '#EABEA9',
              fontWeight: 'bold',
              color: 'white',
              marginTop: '8px',
            }}
            onClick={handleOnClick}
          >
            Edit
          </Button>
        </Col>
      </Row>
    </Card>
  );
}

export default ParentCard;
