import { Avatar, Button, Card, Col, Flex, Row } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Alma from '../../assets/alma.jpg';
import Ben from '../../assets/ben.jpg';
import Bobbie from '../../assets/bobbie.jpg';
import Hazel from '../../assets/hazel.jpg';
import James from '../../assets/james.jpg';
import John from '../../assets/john.jpg';
import Joyce from '../../assets/joyce.jpg';
import Lorene from '../../assets/lorene.jpg';
import Loretta from '../../assets/loretta.jpg';
import Mary from '../../assets/mary.jpg';
import Sylvester from '../../assets/sylvester.jpg';

const images = [
  Alma,
  Ben,
  Bobbie,
  Hazel,
  James,
  John,
  Joyce,
  Lorene,
  Loretta,
  Mary,
  Sylvester,
];

const MainAncestorCard = ({ ancestor }) => {
  const navigate = useNavigate();

  const goToMainAncestorForm = () => navigate('/mainancestorform');

  return (
    <Card
      style={{
        backgroundColor: '#5B1F40',
        color: '#f3e7b1',
        fontWeight: 'bold',
      }}
    >
      {ancestor ? (
        <Flex>
          <Avatar shape="square" size={64} src={Mary} />
          <h2 style={{ marginLeft: '1rem' }}>House of Mary</h2>
        </Flex>
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

export default MainAncestorCard;
