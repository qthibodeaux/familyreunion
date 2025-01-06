import { Card, Row, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

function AddConnectionsCard({ userId, connectionGroups, parent }) {
  const navigate = useNavigate();

  const addParent = () => navigate(`/profileform/parent/${userId}`);
  const addSpouse = () => navigate(`/profileform/spouse/${userId}`);
  const addChild = () => navigate(`/profileform/child/${userId}`);

  const parentConnections = connectionGroups.parent || [];
  const spouseConnections = connectionGroups.spouse || [];
  const childConnections = connectionGroups.child || [];

  const hasParent = parent || parentConnections.length > 0;
  const hasSpouse = spouseConnections.length > 0;
  const hasChild = childConnections.length > 0;

  return (
    <Card
      style={{
        backgroundColor: '#5b1f40',
        border: 'none',
        color: '#f3e7b1',
      }}
    >
      <Row>
        <Title level={4} style={{ color: '#f3e7b1' }}>
          Connections
        </Title>
      </Row>

      {!hasParent && (
        <Row justify="center" style={{ marginBottom: '1rem', width: '100%' }}>
          <Button
            onClick={addParent}
            style={{
              backgroundColor: 'transparent',
              borderColor: '#EABEA9',
              fontWeight: 'bold',
              color: 'white',
              width: '100%'
            }}
          >
            Add Parent
          </Button>
        </Row>
      )}

      {!hasSpouse && (
        <Row justify="center" style={{ marginBottom: '1rem', width: '100%' }}>
          <Button
            onClick={addSpouse}
            style={{
              backgroundColor: 'transparent',
              borderColor: '#EABEA9',
              fontWeight: 'bold',
              color: 'white',
              width: '100%'
            }}
          >
            Add Spouse
          </Button>
        </Row>
      )}

      {!hasChild && (
        <Row justify="center" style={{ marginBottom: '1rem', width: '100%' }}>
          <Button
            onClick={addChild}
            style={{
              backgroundColor: 'transparent',
              borderColor: '#EABEA9',
              fontWeight: 'bold',
              color: 'white',
              width: '100%'
            }}
          >
            Add Child
          </Button>
        </Row>
      )}
    </Card>
  );
}

export default AddConnectionsCard;
