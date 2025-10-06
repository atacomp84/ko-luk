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
  const [loading, setLoading] = useState(true); // Start loading as true for initial auth check

  // Memoized function to fetch user profile from the database
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
          setProfile(null); // Ensure profile is null on error
        } else {
          setProfile(userProfile as Profile);
          console.log("[AuthContext] Profile fetched successfully:", userProfile);
        }
      } catch (error: any) {
        console.error("[AuthContext] Unexpected error during profile fetch:", error.message);
        setProfile(null); // Ensure profile is null on unexpected error
      }
    } else {
      console.log("[AuthContext] No current user provided to fetchProfile, setting profile to null.");
      setProfile(null);
    }
  }, []);

  // Memoized function to refresh the profile, useful after profile updates
  const refreshProfile = useCallback(async () => {
    console.log("[AuthContext] refreshProfile called.");
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    await fetchProfile(currentUser);
  }, [fetchProfile]);

  // Effect for initial application load:
  // This runs once to determine the initial authentication state and set `loading` to `false`.
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component
    console.log("[AuthContext] Initial load effect started.");

    const initialAuthCheck = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted) return; // Prevent state update if component unmounted

        if (sessionError) {
          console.error("[AuthContext] Error getting initial session:", sessionError.message);
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          setSession(initialSession);
          const currentUser = initialSession?.user ?? null;
          setUser(currentUser);
          await fetchProfile(currentUser); // Fetch profile based on initial session user
        }
      } catch (error: any) {
        console.error("[AuthContext] Unexpected error during initial auth check:", error.message);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false); // Crucially, set loading to false after initial check completes
          console.log("[AuthContext] Initial auth check finished. Loading set to false.");
        }
      }
    };

    initialAuthCheck();

    return () => {
      isMounted = false; // Cleanup: component unmounted
      console.log("[AuthContext] Initial load effect cleanup.");
    };
  }, [fetchProfile]); // Dependency on fetchProfile (stable useCallback)

  // Effect for real-time authentication state changes:
  // This listens for events like SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED.
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component
    console.log("[AuthContext] Setting up onAuthStateChange listener.");

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`[AuthContext] Auth state changed: ${event}`);
      if (!isMounted) return; // Prevent state update if component unmounted

      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      await fetchProfile(currentUser); // Always re-fetch profile on auth state change
      // IMPORTANT: Do NOT set `loading` here. `loading` is only for the initial app load.
      // If an auth state change happens, the app is already considered "loaded".
    });

    return () => {
      console.log("[AuthContext] Unsubscribing from auth state changes.");
      subscription.unsubscribe();
      isMounted = false; // Cleanup: component unmounted
    };
  }, [fetchProfile]); // Dependency on fetchProfile (stable useCallback)

  // Memoize the context value to prevent unnecessary re-renders of consumers
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