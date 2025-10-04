import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  role: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  console.log("[AuthContext] Provider mounted. Initializing...");

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      console.log("[AuthContext] Attempting to fetch initial session.");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("[AuthContext] Error fetching initial session:", sessionError.message);
        setLoading(false);
        return;
      }

      console.log("[AuthContext] Initial session fetched:", session ? "Exists" : "Does not exist");
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        console.log(`[AuthContext] User found (ID: ${currentUser.id}). Fetching profile.`);
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        if (profileError) {
          console.warn("[AuthContext] Could not fetch user profile:", profileError.message);
          setProfile(null);
        } else {
          console.log("[AuthContext] Profile fetched successfully:", userProfile);
          setProfile(userProfile);
        }
      } else {
        console.log("[AuthContext] No active user. Clearing profile.");
        setProfile(null);
      }
      
      console.log("[AuthContext] Initial loading complete.");
      setLoading(false);
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(`[AuthContext] Auth state changed. Event: ${_event}`);
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        if (profile?.id !== currentUser.id) { // Fetch profile only if it's a different user
          console.log(`[AuthContext] New or different user (ID: ${currentUser.id}). Fetching profile.`);
          const { data: userProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          
          if (error) {
            console.warn("[AuthContext] Could not fetch profile on auth change:", error.message);
            setProfile(null);
          } else {
            console.log("[AuthContext] Profile fetched successfully on auth change:", userProfile);
            setProfile(userProfile);
          }
        }
      } else {
        console.log("[AuthContext] User signed out. Clearing profile.");
        setProfile(null);
      }
    });

    return () => {
      console.log("[AuthContext] Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    profile,
    loading,
  };

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