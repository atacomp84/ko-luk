import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { Skeleton } from './ui/skeleton';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          if (!allowedRoles.includes(profileData.role)) {
            navigate('/');
          }
        } else {
           navigate('/auth');
        }
      } else {
        navigate('/auth');
      }
      setLoading(false);
    };

    getSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else if (_event === 'SIGNED_IN' && location.pathname === '/auth') {
        getSessionAndProfile();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, allowedRoles, location.pathname]);

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="p-8 space-y-4">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        </div>
    );
  }

  if (!session || !profile || !allowedRoles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;