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
      try {
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        if (profileError) {
          setProfile(null);
          console.error("[AuthContext] Error fetching profile:", profileError.message);
        } else {
          setProfile(userProfile);
          console.log("[AuthContext] Profile fetched successfully for user:", currentUser.id);
        }
      } catch (error: any) {
        setProfile(null);
        console.error("[AuthContext] Unexpected error during profile fetch:", error.message);
      }
    } else {
      setProfile(null);
      console.log("[AuthContext] No current user, profile set to null.");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    console.log("[AuthContext] Refreshing profile...");
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    await fetchProfile(currentUser);
  }, [fetchProfile]);

  useEffect(() => {
    const handleAuthStateChange = async (event: string, currentSession: Session | null) => {
      console.log(`[AuthContext] Auth state changed: ${event}`);
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      await fetchProfile(currentUser);
      // Ensure loading is false after any auth state change is processed
      setLoading(false); 
    };

    const initialLoad = async () => {
      console.log("[AuthContext] Initial load started.");
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("[AuthContext] Error getting initial session:", sessionError.message);
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          setSession(initialSession);
          const currentUser = initialSession?.user ?? null;
          setUser(currentUser);
          await fetchProfile(currentUser);
        }
      } catch (error: any) {
        console.error("[AuthContext] Unexpected error during initial session load:", error.message);
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false); // Always set loading to false after initial load attempt
        console.log("[AuthContext] Initial load finished. Loading set to false.");
      }
    };

    // Run initial load once on component mount
    initialLoad();

    // Set up real-time auth state change listener
    console.log("[AuthContext] Setting up onAuthStateChange listener.");
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      console.log("[AuthContext] Unsubscribing from auth state changes.");
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