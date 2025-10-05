import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { LogOut, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from './ui/badge';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

const Layout = ({ children, title }: LayoutProps) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    console.log("[Layout] Attempting to log out.");
    await supabase.auth.signOut();
    console.log("[Layout] User signed out. Navigating to /auth.");
    navigate('/auth');
  };

  return (
    <div className="min-h-screen w-full bg-secondary/50">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Badge variant="outline" className="border-primary text-primary font-semibold hidden sm:inline-block">
            {profile?.first_name?.toUpperCase()} {profile?.last_name?.toUpperCase()}
          </Badge>
          <LanguageSwitcher />
          <ThemeToggle />
          <Button variant="outline" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only">{t('logout')}</span>
          </Button>
        </div>
      </header>
      <main className="p-4 sm:px-6 sm:py-0">
        {children}
      </main>
    </div>
  );
};

export default Layout;