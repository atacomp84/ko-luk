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
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    console.log("[AuthContext] Manually refreshing profile.");
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      if (profileError || !userProfile) {
        console.error("[AuthContext] Refresh failed, profile not found. Signing out.");
        await supabase.auth.signOut();
      } else {
        setProfile(userProfile as Profile);
        console.log("[AuthContext] Profile refreshed successfully.");
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    console.log("[AuthContext] Setting up onAuthStateChange listener.");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] Auth event: ${event}. Session exists: ${!!session}`);
      
      const currentUser = session?.user ?? null;
      setSession(session);
      setUser(currentUser);

      if (currentUser) {
        // User is logged in, now we MUST verify their profile exists.
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError || !userProfile) {
          // CRITICAL: User has a session but no profile. This is an inconsistent state.
          // Force a sign-out to clear the bad session from storage.
          console.error("[AuthContext] CRITICAL: User session exists but profile is missing. Forcing sign out to prevent app lock.", profileError);
          await supabase.auth.signOut();
          setProfile(null);
        } else {
          // Profile found, normal state.
          setProfile(userProfile as Profile);
          console.log("[AuthContext] Profile fetched successfully:", userProfile);
        }
      } else {
        // User is logged out, so there's no profile.
        setProfile(null);
      }
      
      // Only stop loading after the session AND profile check is complete.
      setLoading(false);
      console.log("[AuthContext] Auth flow complete. Loading set to false.");
    });

    return () => {
      console.log("[AuthContext] Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  }, []);

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