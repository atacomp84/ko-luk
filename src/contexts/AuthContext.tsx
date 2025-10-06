import { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  role: string;
  first_name: string;
  last_name: string;
  username: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // Start loading as true

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (currentUser) {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      if (profileError) {
        setProfile(null);
        console.error("Error fetching profile:", profileError.message);
      } else {
        setProfile(userProfile);
      }
    } else {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    await fetchProfile(currentUser);
  }, [fetchProfile]);

  // Effect for initial load: This runs once on component mount to establish the initial auth state.
  useEffect(() => {
    const initialLoad = async () => {
      console.log("[AuthContext] Initial load started.");
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      const currentUser = initialSession?.user ?? null;
      setUser(currentUser);
      await fetchProfile(currentUser);
      setLoading(false); // Set loading to false only after initial session and profile are fetched
      console.log("[AuthContext] Initial load finished. Loading set to false.");
    };

    initialLoad();
  }, [fetchProfile]); // fetchProfile is stable due to useCallback

  // Effect for real-time auth state changes: This listens for any changes after the initial load.
  useEffect(() => {
    console.log("[AuthContext] Setting up onAuthStateChange listener.");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[AuthContext] Auth state changed: ${event}`);
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      await fetchProfile(currentUser);
      // Do NOT set loading here. Loading is only for the very first app load.
      // If an auth state change happens, the app is already "loaded".
    });

    return () => {
      console.log("[AuthContext] Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  }, [fetchProfile]); // fetchProfile is stable due to useCallback

  const value = useMemo(() => ({
    session,
    user,
    profile,
    loading,
    refreshProfile,
  }), [session, user, profile, loading, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};