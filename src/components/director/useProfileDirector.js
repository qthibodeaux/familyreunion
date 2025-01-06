import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthConsumer from '../../useSession';

const useProfileDirector = () => {
  const { session, profile } = AuthConsumer();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      navigate('/register');
    } else if (session && profile) {
      if (!profile.firstname) {
        navigate('/profileform');
      } else {
        navigate(`/profile/${session.user.id}`);
      }
    }
  }, [session, profile, navigate]);
};

export default useProfileDirector;
