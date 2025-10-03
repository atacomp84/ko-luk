import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from './ui/skeleton';
import { useEffect } from 'react';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { loading, profile, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!session || !profile) {
        navigate('/auth');
      } else if (!allowedRoles.includes(profile.role)) {
        navigate('/'); // Yetkisiz rol, ana sayfaya yönlendir
      }
    }
  }, [loading, session, profile, navigate, allowedRoles]);

  if (loading) {
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

  if (session && profile && allowedRoles.includes(profile.role)) {
    return <>{children}</>;
  }

  // Yönlendirme useEffect içinde yapıldığı için burada null döndürmek güvenlidir.
  return null;
};

export default ProtectedRoute;