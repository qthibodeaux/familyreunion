import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient"
import { useNavigate } from "react-router-dom";

const AuthContext = createContext()

export function useSession () {
    const [session, setSession] = useState(null)
    const [profile, setProfile] = useState()
    const [channel, setChannel] = useState(null)
    const navigate = useNavigate()
    
    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut()

        if (error) {
            console.log(error)
        } 
        navigate('/')
    }

    useEffect(() => {
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                setSession(session)
            })

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setProfile(null)
        })
            
    }, [])

    useEffect(() => {
        if (session?.user && !profile?.firstname) {
            listenToProfileChanges(session.user.id)
            .then(
                (newChannel) => {
                    if (channel) {
                        channel.unsubscribe()
                    }
                    setChannel()
                }
            )
        } else if (session?.user) {
            channel?.unsubscribe()
            setChannel(null)
        }
    }, [session])

    async function listenToProfileChanges (userId) {
        const { data } = await supabase
            .from("profile")
            .select("*")
            .filter("id", "eq", userId)
        
        if (!data?.length) {
            navigate(`/profile/${userId}`)
        }
        setProfile(data?.[0])

        return supabase
            .channel(`public:profile`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "profiles",
                    filter: `id=eq.${userId}`,
                },
                (payload) => {
                    setProfile({ profile: payload.new })
                }
            )
            .subscribe()
    }
    return {
        session,
        profile,
        handleSignOut,
        setProfile,
    }
}

export function AuthProvider ({ children }) {
    const { profile, session, handleSignOut, setProfile } = useSession()

    return (
        <AuthContext.Provider value={{ profile, session, handleSignOut, setProfile }}>
            {children}
        </AuthContext.Provider>
    )
}

export default function AuthConsumer () {
    return useContext(AuthContext)
}
/*
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function useSession() {
    const [session, setSession] = useState(null);
    const [profile, setProfile] = useState();
    const [channel, setChannel] = useState(null);
    const navigate = useNavigate();
    
    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.log(error);
        } 
        navigate('/');
    };

    useEffect(() => {
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                setSession(session);
            });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setProfile(null);
        });
            
    }, []);

    const listenToProfileChanges = useCallback(async (userId) => {
        const { data } = await supabase
            .from("profile")
            .select("*")
            .filter("id", "eq", userId);
        
        if (!data?.length) {
            
        }
        setProfile(data?.[0]);

        return supabase
            .channel(`public:profile`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "profile",
                    filter: `id=eq.${userId}`,
                },
                (payload) => {
                    setProfile(payload.new);
                }
            )
            .subscribe();
    }, [navigate]);

    useEffect(() => {
        if (session?.user && !profile?.firstname) {
            listenToProfileChanges(session.user.id)
                .then((newChannel) => {
                    if (channel) {
                        channel.unsubscribe();
                    }
                    setChannel(newChannel);
                });
        } else if (session?.user) {
            channel?.unsubscribe();
            setChannel(null);
        }
    }, [session, profile?.firstname, listenToProfileChanges, channel]);

    return {
        session,
        profile,
        handleSignOut,
        setProfile,
    };
}

export function AuthProvider({ children }) {
    const { profile, session, handleSignOut, setProfile } = useSession();

    return (
        <AuthContext.Provider value={{ profile, session, handleSignOut, setProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export default function AuthConsumer() {
    return useContext(AuthContext);
}*/
