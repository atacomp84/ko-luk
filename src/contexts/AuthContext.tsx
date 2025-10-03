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
    console.log('[AuthContext] Provider ilk kez yükleniyor. Başlangıç oturumu kontrol edilecek.');
    const getInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      console.log('[AuthContext] Başlangıç oturumu sonucu:', initialSession ? 'Oturum var' : 'Oturum yok');
      
      if (initialSession?.user) {
        console.log('[AuthContext] Başlangıç oturumunda kullanıcı var. Profil çekiliyor...');
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', initialSession.user.id)
          .single();
        console.log('[AuthContext] Başlangıç profili çekildi:', userProfile);
        setProfile(userProfile);
      }
      
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
      console.log('[AuthContext] Başlangıç durumu ayarlandı. Yükleme tamamlandı.');
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log(`[AuthContext] onAuthStateChange tetiklendi. Olay: ${_event}`, newSession);
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          console.log('[AuthContext] Yeni oturumda kullanıcı var. Profil çekiliyor...');
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single();
          console.log('[AuthContext] Yeni oturum için profil çekildi:', userProfile);
          setProfile(userProfile);
        } else {
          console.log('[AuthContext] Oturum kapandı. Profil temizleniyor.');
          setProfile(null);
        }
        
        if (loading) {
            setLoading(false);
            console.log('[AuthContext] Auth state değişikliği sonrası yükleme durumu false yapıldı.');
        }
      }
    );

    return () => {
      console.log('[AuthContext] Provider kaldırılıyor. Auth dinleyicisi temizlenecek.');
      authListener.subscription.unsubscribe();
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