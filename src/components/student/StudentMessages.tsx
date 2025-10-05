import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatModule } from '@/components/ChatModule';
import { useTranslation } from 'react-i18next';
import { getInitials } from '@/lib/utils';
import { MessageCircle, MessageSquareOff } from 'lucide-react';

interface Coach {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  chat_enabled: boolean; // Add chat_enabled status
}

const StudentMessages = () => {
  console.log("[StudentMessages] Component rendered.");
  const { user } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { t } = useTranslation();

  const fetchCoach = useCallback(async () => {
    if (!user) {
      console.log("[StudentMessages] Fetching coach skipped: no user.");
      return;
    }
    setLoading(true);
    console.log(`[StudentMessages] Fetching coach for student ID: ${user.id}`);
    const { data: pair, error: pairError } = await supabase
      .from('coach_student_pairs')
      .select('coach_id, chat_enabled') // Select chat_enabled
      .eq('student_id', user.id)
      .single();

    if (pairError) {
      console.error("[StudentMessages] Error fetching coach pair:", pairError.message);
      setCoach(null);
      setLoading(false);
      return;
    }

    if (pair?.coach_id) {
      const { data: coachProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('id', pair.coach_id)
        .single();

      if (profileError) {
        console.error("[StudentMessages] Error fetching coach profile:", profileError.message);
        setCoach(null);
      } else {
        console.log("[StudentMessages] Coach profile fetched successfully:", coachProfile);
        setCoach({ ...coachProfile, chat_enabled: pair.chat_enabled } as Coach); // Combine with chat_enabled
      }
    } else {
      console.log("[StudentMessages] No coach found for this student.");
      setCoach(null);
    }
    setLoading(false);
  }, [user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    console.log(`[StudentMessages] Fetching unread message count for student ID: ${user.id}`);
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error("[StudentMessages] Error fetching unread count:", error.message);
      return;
    }
    setUnreadCount(count || 0);
    console.log("[StudentMessages] Unread count fetched:", count);
  }, [user]);

  useEffect(() => {
    fetchCoach();
    fetchUnreadCount();
  }, [fetchCoach, fetchUnreadCount]);

  useEffect(() => {
    if (!user) return;

    console.log("[StudentMessages] Setting up real-time subscription for unread messages.");
    const channel = supabase
      .channel(`unread_messages_student_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id.eq.${user.id}`,
        },
        (payload) => {
          console.log("[StudentMessages] Real-time unread message update received:", payload);
          fetchUnreadCount(); // Re-fetch count on any message change
        }
      )
      .subscribe();
    
    // Real-time subscription for chat_enabled changes
    const chatStatusChannel = supabase
      .channel(`chat_status_student_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coach_student_pairs',
          filter: `student_id.eq.${user.id}`,
        },
        (payload) => {
          console.log("[StudentMessages] Real-time chat status update received:", payload);
          setCoach(prevCoach => {
            if (prevCoach && prevCoach.id === (payload.new as any).coach_id) {
              return { ...prevCoach, chat_enabled: (payload.new as any).chat_enabled };
            }
            return prevCoach;
          });
        }
      )
      .subscribe();

    return () => {
      console.log("[StudentMessages] Unsubscribing from real-time unread messages channel.");
      supabase.removeChannel(channel);
      supabase.removeChannel(chatStatusChannel);
    };
  }, [user, fetchUnreadCount]);

  const handleUnreadCountChange = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  if (loading) {
    return (
      <Card className="h-[calc(100vh-15rem)] flex items-center justify-center">
        <CardContent className="text-center">
          <Skeleton className="h-12 w-48 mb-4 mx-auto" />
          <Skeleton className="h-8 w-64 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!coach) {
    return (
      <Card className="h-[calc(100vh-15rem)] flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-4" />
          <p>{t('messages.noCoach')}</p>
        </CardContent>
      </Card>
    );
  }

  if (!coach.chat_enabled) {
    return (
      <Card className="h-[calc(100vh-15rem)] flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <MessageSquareOff className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p className="text-lg font-semibold">{t('messages.chatDisabledByCoach')}</p>
          <p className="text-sm mt-2">{t('messages.chatDisabledDescription')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ChatModule chatPartner={coach} onUnreadCountChange={handleUnreadCountChange} />
  );
};

export default StudentMessages;