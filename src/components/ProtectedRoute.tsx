import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from './ui/skeleton';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { loading, profile, session } = useAuth();

  // 1. Kimlik doğrulama durumu kontrol edilirken bekle ve yükleme ekranı göster.
  // Bu, uygulamanın kararsız bir durumda karar vermesini engeller.
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

  // 2. Yükleme bittikten sonra, kullanıcı giriş yapmamışsa giriş sayfasına yönlendir.
  if (!session || !profile) {
    return <Navigate to="/auth" replace />;
  }

  // 3. Kullanıcı giriş yapmış ama bu sayfayı görme yetkisi yoksa, kendi paneline yönlendir.
  if (!allowedRoles.includes(profile.role)) {
    let redirectTo = '/'; // Varsayılan yönlendirme
    if (profile.role === 'coach') {
      redirectTo = '/coach/dashboard';
    } else if (profile.role === 'student') {
      redirectTo = '/student/dashboard';
    } else if (profile.role === 'admin') {
      redirectTo = '/admin/dashboard';
    }
    return <Navigate to={redirectTo} replace />;
  }

  // 4. Her şey yolundaysa, istenen sayfayı göster.
  return <>{children}</>;
};

export default ProtectedRoute;