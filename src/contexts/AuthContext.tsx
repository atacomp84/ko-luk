import { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  role: string;
  first_name: string;
  last_name: string;
  username: string;
  // Add other profile fields as needed
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean; // Indicates if the initial auth state is being loaded
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // Start loading as true

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    console.log("[AuthContext] fetchProfile called for user:", currentUser?.id);
    if (currentUser) {
      try {
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        if (profileError) {
          console.error("[AuthContext] Error fetching profile:", profileError.message);
          setProfile(null);
        } else {
          setProfile(userProfile as Profile);
          console.log("[AuthContext] Profile fetched successfully:", userProfile);
        }
      } catch (error: any) {
        console.error("[AuthContext] Unexpected error during profile fetch:", error.message);
        setProfile(null);
      }
    } else {
      console.log("[AuthContext] No current user provided to fetchProfile, setting profile to null.");
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    console.log("[AuthContext] refreshProfile called.");
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    await fetchProfile(currentUser);
  }, [fetchProfile]);

  // This single useEffect now handles both the initial load and subsequent auth changes.
  useEffect(() => {
    setLoading(true);
    console.log("[AuthContext] Setting up unified onAuthStateChange listener.");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] Auth state changed: ${event}. Session exists: ${!!session}`);
      
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // Fetch profile based on the new user state
      await fetchProfile(currentUser); 
      
      // After the entire auth flow (session check + profile fetch) is complete, stop loading.
      setLoading(false);
      console.log("[AuthContext] Auth flow complete. Loading set to false.");
    });

    return () => {
      console.log("[AuthContext] Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  }, [fetchProfile]); // fetchProfile is a stable dependency

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