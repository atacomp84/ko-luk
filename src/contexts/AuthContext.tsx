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
    console.log('[AuthContext] Kimlik doğrulama durumu dinleyicisi kuruluyor.');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(`[AuthContext] Kimlik doğrulama durumu değişti. Olay: ${_event}`);
      try {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log(`[AuthContext] Kullanıcı oturumu bulundu (${session.user.id}). Profil çekiliyor...`);
          const { data: userProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
              console.error("[AuthContext] Profil çekilirken hata oluştu:", error.message);
              setProfile(null);
          } else {
              console.log("[AuthContext] Profil başarıyla çekildi.");
              setProfile(userProfile);
          }
        } else {
          console.log("[AuthContext] Kullanıcı oturumu yok. Profil temizleniyor.");
          setProfile(null);
        }
      } catch (e) {
        console.error("[AuthContext] onAuthStateChange içinde beklenmedik bir hata oluştu:", e);
        setProfile(null);
      } finally {
        console.log("[AuthContext] Kimlik doğrulama işlemi tamamlandı. Yükleme durumu false olarak ayarlanıyor.");
        setLoading(false);
      }
    });

    return () => {
      console.log('[AuthContext] Kimlik doğrulama durumu dinleyicisi temizleniyor.');
      subscription.unsubscribe();
    };
  }, []); // Boş bağımlılık dizisi, bu effect'in yalnızca bir kez çalışmasını sağlar.

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