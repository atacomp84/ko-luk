import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from './ui/skeleton';
import { useEffect } from 'react';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { loading, profile, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(`[ProtectedRoute] Checking access for roles: [${allowedRoles.join(', ')}]. Auth Loading: ${loading}`);
    if (!loading) {
      if (!session || !profile) {
        console.log("[ProtectedRoute] No session or profile. Redirecting to /auth.");
        navigate('/auth');
      } else if (!allowedRoles.includes(profile.role)) {
        console.log(`[ProtectedRoute] Role mismatch. User role: '${profile.role}'. Allowed: [${allowedRoles.join(', ')}]. Redirecting to /.`);
        navigate('/');
      } else {
        console.log("[ProtectedRoute] Access granted.");
      }
    }
  }, [loading, session, profile, navigate, allowedRoles]);

  if (loading) {
    console.log("[ProtectedRoute] Auth is loading, showing skeleton.");
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

  return null;
};

export default ProtectedRoute;