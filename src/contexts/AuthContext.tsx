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

  useEffect(() => {
    // This effect handles both initial session loading and subsequent auth state changes.
    // It ensures `loading` is set to false only after the session and profile are processed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[AuthContext] Auth state changed: ${event}`);
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      await fetchProfile(currentUser);
      setLoading(false); // Always set loading to false after processing an auth state change
    });

    // Initial check for session on component mount
    // This is important for cases where onAuthStateChange might not fire immediately on page load
    // or when the component mounts after a quick navigation.
    const initialLoad = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      const currentUser = initialSession?.user ?? null;
      setUser(currentUser);
      await fetchProfile(currentUser);
      setLoading(false); // Ensure loading is false after initial session check
    };

    initialLoad();

    return () => {
      console.log("[AuthContext] Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  }, [fetchProfile]); // fetchProfile is a dependency because it's called inside the effect.

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