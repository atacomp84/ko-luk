import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { loading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(`[IndexPage] useEffect tetiklendi. Durum: loading=${loading}, profile=${JSON.stringify(profile)}`);
    if (!loading && profile) {
      if (profile.role === 'coach') {
        console.log('[IndexPage] Profil bir koç. /coach/dashboard adresine yönlendiriliyor.');
        navigate('/coach/dashboard');
      } else if (profile.role === 'student') {
        console.log('[IndexPage] Profil bir öğrenci. /student/dashboard adresine yönlendiriliyor.');
        navigate('/student/dashboard');
      }
    } else if (!loading && !profile) {
        console.log('[IndexPage] Yükleme bitti ama profil yok. Karşılama ekranı gösterilecek.');
    }
  }, [loading, profile, navigate]);

  if (loading) {
    console.log('[IndexPage] Auth durumu yükleniyor. Skeleton gösteriliyor.');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="text-center p-8 space-y-4">
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-6 w-80" />
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
    );
  }

  // Yükleme bitti ve profil yoksa (kullanıcı giriş yapmamışsa) bu sayfa gösterilir.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold mb-4">LGS Koçluk Platformuna Hoş Geldiniz</h1>
        <p className="text-xl text-gray-600 mb-6">
          Devam etmek için lütfen giriş yapın veya kayıt olun.
        </p>
        <Button onClick={() => navigate('/auth')}>Giriş Yap / Kayıt Ol</Button>
      </div>
      <div className="absolute bottom-4">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;