import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { LogOut, Rocket, ArrowLeft, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode | ((unreadMessageCount: number) => ReactNode);
  title: string;
}

const Layout = ({ children, title }: LayoutProps) => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const fetchUnreadMessageCount = useCallback(async () => {
    if (!user) {
      setUnreadMessageCount(0);
      return;
    }
    console.log(`[Layout] Fetching unread message count for user: ${user.id}`);
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error("[Layout] Error fetching unread message count:", error.message);
      setUnreadMessageCount(0);
    } else {
      console.log(`[Layout] Fetched unread count: ${count}`);
      setUnreadMessageCount(count || 0);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchUnreadMessageCount();

    const channel = supabase
      .channel(`unread_messages_count_for_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Layout] Realtime message event received:', payload);
          fetchUnreadMessageCount();
        }
      )
      .subscribe((status) => {
        console.log(`[Layout] Subscribed to messages channel with status: ${status}`);
      });

    return () => {
      console.log(`[Layout] Unsubscribing from messages channel for user: ${user.id}`);
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnreadMessageCount]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleGoBack = () => {
    if (profile?.role === 'admin' && location.pathname === '/settings') {
      navigate('/admin/dashboard');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen w-full bg-secondary/50">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleGoBack} className="mr-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">{t('back')}</span>
            </Button>
            <Rocket className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {profile && (
            <Badge variant="outline" className="border-primary text-primary font-semibold hidden sm:inline-flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(profile.first_name, profile.last_name)}
                </AvatarFallback>
              </Avatar>
              {profile.first_name?.toUpperCase()} {profile.last_name?.toUpperCase()}
            </Badge>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
          <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4" />
            <span className="sr-only">{t('settings.title')}</span>
          </Button>
          <Button variant="outline" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span className="sr-only">{t('logout')}</span>
          </Button>
        </div>
      </header>
      <main className="p-4 sm:px-6 sm:py-0">
        {typeof children === 'function' ? children(unreadMessageCount) : children}
      </main>
    </div>
  );
};

export default Layout;