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
    // 1. Uygulama ilk yüklendiğinde mevcut oturumu kontrol et
    const getInitialSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      if (initialSession?.user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', initialSession.user.id)
          .single();
        setProfile(userProfile);
      }
      
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    // 2. Gelecekteki tüm kimlik doğrulama değişikliklerini dinle (Giriş, Çıkış vb.)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single();
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
        
        // Yeni bir oturum durumu geldiğinde yüklemenin bittiğinden emin ol
        if (loading) {
            setLoading(false);
        }
      }
    );

    // Component kaldırıldığında dinleyiciyi temizle
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // Boş dependency array, bu effect'in sadece bir kez çalışmasını sağlar. Bu çok önemlidir.

  const value = {
    session,
    user,
    profile,
    loading,
  };

  // Yükleme tamamlanana kadar alt bileşenleri render etme
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