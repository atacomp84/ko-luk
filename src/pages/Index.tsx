import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTranslation } from 'react-i18next';
import { Rocket } from 'lucide-react';

const Index = () => {
  const { loading, profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    console.log(`[Index] useEffect - Auth loading: ${loading}, Profile: ${profile ? 'Object' : 'null'}`);
    if (!loading && profile) {
      console.log(`[Index] useEffect - User is authenticated with role: ${profile.role}. Redirecting.`);
      if (profile.role === 'coach') {
        navigate('/coach/dashboard');
      } else if (profile.role === 'student') {
        navigate('/student/dashboard');
      } else if (profile.role === 'admin') {
        navigate('/admin/dashboard');
      }
    } else if (!loading && !profile) {
      console.log('[Index] useEffect - User is not authenticated. Staying on index page.');
    }
  }, [loading, profile, navigate]);

  console.log(`[Index] Render - Auth loading: ${loading}, Profile: ${profile ? 'Object' : 'null'}`);
  if (loading) {
    console.log('[Index] Render - Showing skeleton due to auth loading.');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center p-8 space-y-4">
          <Skeleton className="h-10 w-96" />
          <Skeleton className="h-6 w-80" />
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
    );
  }

  console.log('[Index] Render - Showing main content.');
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative bg-gradient-to-br from-sky-100 to-blue-200 dark:from-slate-900 dark:to-slate-800">
       <div className="absolute top-4 right-4 flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      <div className="text-center p-8 bg-white/30 dark:bg-black/30 backdrop-blur-lg rounded-xl shadow-lg">
        <Rocket className="h-16 w-16 text-primary mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">{t('index.welcomeTitle')}</h1>
        <p className="text-xl text-muted-foreground mb-6">
          {t('index.welcomeDescription')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate('/auth')} size="lg">{t('index.ctaButton')}</Button>
          {/* Yönetici Girişi butonu kaldırıldı */}
        </div>
      </div>
    </div>
  );
};

export default Index;