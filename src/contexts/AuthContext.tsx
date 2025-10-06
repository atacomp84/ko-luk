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
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);
      await fetchProfile(currentUser);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

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