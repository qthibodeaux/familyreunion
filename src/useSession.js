import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function useSession() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true); // Tracks initial session loading
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log(error);
    }
    navigate("/");
  };

  // 1. Check current login session and listen to changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setProfile(null);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // 2. Fetch the profile details once the user session is active
  useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user) {
        setLoading(true);
        const { data, error } = await supabase
          .from("profile")
          .select("*")
          .eq("id", session.user.id);

        if (!error && data && data.length > 0) {
          setProfile(data[0]);
        } else {
          setProfile(null);
        }
        setLoading(false);
      } else {
        setProfile(null);
      }
    };

    fetchProfile();
  }, [session]);

  return {
    session,
    profile,
    loading, // Expose loading state to the app
    handleSignOut,
    setProfile,
  };
}

export function AuthProvider({ children }) {
  const { profile, session, loading, handleSignOut, setProfile } = useSession();

  return (
    <AuthContext.Provider
      value={{ profile, session, loading, handleSignOut, setProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default function AuthConsumer() {
  return useContext(AuthContext);
}
