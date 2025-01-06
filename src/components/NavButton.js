import { FloatButton } from "antd"
import { HomeOutlined, LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons';
import AuthConsumer from "../useSession";
import { useNavigate } from "react-router-dom";

function NavButton() {
  const { session, profile, handleSignOut } = AuthConsumer()
  const navigate = useNavigate()
  
  const goToHome = () => navigate('/')
  const goToRegister = () => navigate('/register');
  const goToProfile = () => navigate(`/profile/${session.user.id}`)
  const goToProfileForm = () => navigate('/profileform')
  const signOut = () => handleSignOut()


if (!profile) return <FloatButton description="Join Us" shape="square" style={{ right: 24 }} onClick={goToRegister} />
else if (!profile.firstname){
    return (
        <FloatButton.Group
            trigger="click"
            style={{
                right: 24,
            }}
            icon={<MenuOutlined />}
            shape="square"
        >
            <FloatButton shape="square" icon={<HomeOutlined />} onClick={goToHome}  />
            <FloatButton shape="square" icon={<UserOutlined />} onClick={goToProfileForm} />
            <FloatButton shape="square" icon={<LogoutOutlined />} onClick={signOut} />
        </FloatButton.Group>
    )
} else {
    const firstInitial = profile.firstname[0] || '';
    const lastInitial = profile.lastname ? profile.lastname[0] : '';
    let initials = firstInitial+lastInitial
      
    return (
        <FloatButton.Group
            trigger="click"
            style={{
                right: 24,
            }}
            icon={<MenuOutlined />}
            shape="square"
        >
            <FloatButton shape="square" icon={<HomeOutlined />} onClick={goToHome} />
            <FloatButton shape="square" description={initials} onClick={goToProfile} />
            <FloatButton shape="square" icon={<LogoutOutlined />} onClick={signOut} />
        </FloatButton.Group>
    )
}
}

export default NavButton