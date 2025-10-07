import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from './ui/skeleton';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { loading, profile } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/50">
        <div className="p-8 space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  // If authenticated but role not allowed, redirect to appropriate dashboard
  if (!allowedRoles.includes(profile.role)) {
    let redirectTo = '/';
    if (profile.role === 'coach') {
      redirectTo = '/coach/dashboard';
    } else if (profile.role === 'student') {
      redirectTo = '/student/dashboard';
    } else if (profile.role === 'admin') {
      redirectTo = '/admin/dashboard';
    }
    return <Navigate to={redirectTo} replace />;
  }

  // All checks passed, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;