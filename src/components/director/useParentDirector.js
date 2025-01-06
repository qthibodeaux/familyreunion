import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthConsumer from '../../useSession';

const useParentDirector = () => {
  const { session } = AuthConsumer();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      navigate('/register');
    }
  }, [session, navigate]);
};

export default useParentDirector;
