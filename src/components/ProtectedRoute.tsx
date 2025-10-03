import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Skeleton } from './ui/skeleton';

interface Profile {
  role: string;
}

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setStatus('unauthorized');
        navigate('/auth');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        // Profil henüz oluşturulmamış olabilir, kısa bir gecikme ile tekrar deneyin
        setTimeout(() => {
            supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({data: retryProfile}) => {
                if(retryProfile && allowedRoles.includes(retryProfile.role)) {
                    setStatus('authorized');
                } else {
                    setStatus('unauthorized');
                    navigate('/');
                }
            })
        }, 1000);
        return;
      }

      if (allowedRoles.includes(profile.role)) {
        setStatus('authorized');
      } else {
        setStatus('unauthorized');
        navigate('/'); // Yetkisiz rol, ana sayfaya yönlendir
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setStatus('unauthorized');
        navigate('/auth');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, allowedRoles]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="p-8 space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (status === 'authorized') {
    return <>{children}</>;
  }

  return null; // 'unauthorized' durumunda yönlendirme zaten yapıldı
};

export default ProtectedRoute;