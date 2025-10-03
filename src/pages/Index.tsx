import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserAndRedirect = async (retryCount = 3) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profileData?.role === 'coach') {
          navigate('/coach/dashboard');
        } else if (profileData?.role === 'student') {
          navigate('/student/dashboard');
        } else if (retryCount > 0) {
          // Profil henüz veritabanı trigger'ı tarafından oluşturulmamış olabilir, yeniden deneyelim.
          setTimeout(() => checkUserAndRedirect(retryCount - 1), 500);
        } else {
          // Denemelerden sonra profil hala bulunamadıysa, yüklemeyi durdur ve sayfayı göster.
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkUserAndRedirect();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        checkUserAndRedirect();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
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