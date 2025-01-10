import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthConsumer from '../useSession';
import { supabase } from '../supabaseClient';
import { Button, Card, Grid, Image, Space } from 'antd-mobile';
import { CarouselCard, SearchCard } from '../components/partial/index';

import '../theme/components/Home.css';

import { DownOutline } from 'antd-mobile-icons';

import Ancestors from '../assets/anc1.png';
import Alma from '../assets/alma.jpg';
import Ben from '../assets/ben.jpg';
import Bobbie from '../assets/bobbie.jpg';
import Hazel from '../assets/hazel.jpg';
import James from '../assets/james.jpg';
import John from '../assets/john.jpg';
import Joyce from '../assets/joyce.jpg';
import Lorene from '../assets/lorene.jpg';
import Loretta from '../assets/loretta.jpg';
import Mary from '../assets/mary.jpg';
import Sylvester from '../assets/sylvester.jpg';
import Root from '../assets/root.png';
import Test from './Test';

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

function Home() {
  const navigate = useNavigate();
  const { session, profile } = AuthConsumer();
  const [open, setOpen] = useState(false);

  const goToRegister = () => navigate('/register');
  const goToProfile = () => navigate(`/profile/${session.user.id}`);
  const goToProfileForm = () => navigate('/profileform/self');
  const goToScroll = () => navigate('/scrolltree');
  const goToYear = () => navigate('/yeartree');
  const goToChat = () => navigate('/hero');
  const goToMSF = () => navigate('/membersearch');

  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (session && profile && !profile.firstname) {
      setOpen(true);
    }
  }, [session, profile]);

  async function setUserName() {
    console.log(
      supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data
        .publicUrl
    );
    setUrl(
      supabase.storage.from('avatars').getPublicUrl(profile.avatar_url).data
        .publicUrl
    );
  }

  return (
    <div>
      <Test />
      <Hero />
      <WelcomeBanner />
      <RootBranch />
      <FirstBranch />
      <CarouselCard />
      <SearchCard />
      <div>
        <button onClick={goToRegister}>Register</button>
        <button onClick={goToProfile}>Profile</button>
        <button onClick={goToProfileForm}>ProfileForm</button>
        <button onClick={goToScroll}>Scroll Tree</button>
        <button onClick={goToChat}>Chat</button>
        <button onClick={goToYear}>Year</button>
        <button onClick={goToMSF}>MSF</button>
      </div>
    </div>
  );
}

const Hero = () => {
  return (
    <div className="hero-container">
      <Space direction="vertical" align="center" style={{ width: '100%' }}>
        <h1 className="hero-title">Smith Family</h1>
        <Image
          src={Ancestors}
          alt="Ancestors"
          className="hero-image"
          fit="cover"
        />
        <DownOutline className="hero-icon" />
      </Space>
    </div>
  );
};

const WelcomeBanner = () => {
  const { session, profile } = AuthConsumer();
  const navigate = useNavigate();

  const goToJoin = () => navigate('/register');
  const goToProfileForm = () => navigate('/profileForm/self');
  const goToProfile = () => navigate(`/profile/${session.user.id}`);

  const renderContent = () => {
    if (!session) {
      return {
        title: 'Join Our Family Tree!',
        description:
          'If you are family or friend of a family, join our family tree by creating an account!',
        buttonLabel: 'Join Us',
        onClick: goToJoin,
      };
    } else if (!profile?.firstname) {
      return {
        title: 'Thank You for Creating an Account!',
        description: 'You can add your name and family ties to your profile!',
        buttonLabel: 'Add Info',
        onClick: goToProfileForm,
      };
    } else {
      return {
        title: `Welcome ${profile.firstname}`,
        buttonLabel: 'Visit Profile',
        onClick: goToProfile,
      };
    }
  };

  const { title, description, buttonLabel, onClick } = renderContent();

  return (
    <Card className="welcome-banner">
      <Space direction="vertical" block>
        <h2 className="banner-title">{title}</h2>
        {description && <p className="banner-description">{description}</p>}
        <Button onClick={onClick} className="banner-button" block>
          {buttonLabel}
        </Button>
      </Space>
    </Card>
  );
};

const RootBranch = () => {
  return (
    <div className="root-branch-container">
      <h2 className="banner-title">Root Branch</h2>
      <div className="root-image-container">
        <img src={Root} alt="root" className="root-image" />
      </div>
    </div>
  );
};

const FirstBranch = () => {
  return (
    <div className="first-branch-container">
      <h2>First Branch</h2>
      <Grid columns={4} gap={16}>
        {images.map((image, index) => (
          <Grid.Item key={index}>
            <div className="first-branch-image">
              <img src={image} alt={`Image ${index}`} />
            </div>
          </Grid.Item>
        ))}
      </Grid>
    </div>
  );
};

export default Home;
