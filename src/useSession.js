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

  // Check login session and listen to auth changes, loading profile details synchronously
  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        setSession(session);

        if (session?.user) {
          const { data, error } = await supabase
            .from("profile")
            .select("*")
            .eq("id", session.user.id);

          if (active) {
            if (!error && data && data.length > 0) {
              setProfile(data[0]);
            } else {
              setProfile(null);
            }
          }
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      setSession(session);

      if (session?.user) {
        setLoading(true);
        const { data, error } = await supabase
          .from("profile")
          .select("*")
          .eq("id", session.user.id);

        if (active) {
          if (!error && data && data.length > 0) {
            setProfile(data[0]);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

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
