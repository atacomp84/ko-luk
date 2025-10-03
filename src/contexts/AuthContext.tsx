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

  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log('[AuthContext] Başlangıç oturumu kontrol ediliyor...');
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          console.log(`[AuthContext] Oturum bulundu (${initialSession.user.id}). Profil çekiliyor...`);
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', initialSession.user.id)
            .single();
          
          if (profileError) {
            console.error("[AuthContext] Başlangıç profili çekilirken hata:", profileError.message);
            setProfile(null);
          } else {
            console.log("[AuthContext] Başlangıç profili başarıyla çekildi.");
            setProfile(userProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error("[AuthContext] Başlangıç oturum kontrolü sırasında hata:", e);
      } finally {
        console.log("[AuthContext] Başlangıç kontrolü tamamlandı. Yükleme bitti.");
        setLoading(false);
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(`[AuthContext] Kimlik doğrulama durumu değişti. Olay: ${_event}. Oturum güncelleniyor.`);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
            console.error("[AuthContext] Profil güncellenirken hata:", error.message);
            setProfile(null);
        } else {
            setProfile(userProfile);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
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