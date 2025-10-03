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
    // Bu `useEffect`, bileşen yüklendiğinde yalnızca bir kez çalışır.
    // Supabase'in kimlik doğrulama durumu dinleyicisini kurar.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Bu callback, ilk başta mevcut oturum durumuyla hemen bir kez,
      // ve daha sonra her kimlik doğrulama değişikliğinde (giriş, çıkış vb.) tekrar çalışır.

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Eğer bir kullanıcı oturumu varsa, profil bilgilerini çek.
        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error) {
            console.error("Profil getirilirken hata oluştu:", error);
            setProfile(null);
        } else {
            setProfile(userProfile);
        }
      } else {
        // Eğer kullanıcı oturumu yoksa, profil bilgilerini temizle.
        setProfile(null);
      }
      
      // Kimlik doğrulama durumu belirlendikten ve profil bilgileri çekildikten sonra,
      // yükleme durumunu `false` olarak ayarlayabiliriz.
      setLoading(false);
    });

    // Bu temizleme fonksiyonu, bileşen kaldırıldığında çalışır ve dinleyiciyi kapatır.
    return () => {
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