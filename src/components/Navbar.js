import { Layout } from 'antd';
import { useNavigate } from 'react-router-dom';

function Navbar() {
  const { Header } = Layout;

  const navigate = useNavigate();

  const goToHome = () => {
    navigate('/');
  };

  return (
    <Header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#c3776d',
      }}
    >
      <div
        style={{ color: 'black', fontSize: '24px', fontWeight: 'bold' }}
        onClick={() => goToHome()}
      >
        Smith Family
      </div>
    </Header>
  );
}

export default Navbar;
