import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { showError } from '@/utils/toast';

interface ChatPartner {
  id: string;
  first_name: string;
  last_name: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

interface ChatModuleProps {
  chatPartner: ChatPartner | null;
}

const ChatModule = ({ chatPartner }: ChatModuleProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const scrollToBottom = useCallback(() => {
    console.log('[ChatModule] scrollToBottom: Attempting to scroll.');
    setTimeout(() => {
      const scrollViewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
        console.log('[ChatModule] scrollToBottom: Successfully scrolled to bottom.');
      } else {
        console.warn('[ChatModule] scrollToBottom: Scroll viewport not found.');
      }
    }, 100);
  }, []);

  const markMessagesAsRead = useCallback(async () => {
    if (!user || !chatPartner) {
      console.log('[ChatModule] markMessagesAsRead: Skipped (No user or chat partner).');
      return;
    }
    console.log(`[ChatModule] markMessagesAsRead: Attempting to mark messages from ${chatPartner.id} as read for user ${user.id}`);
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', chatPartner.id)
      .eq('is_read', false);
    if (error) {
      console.error('[ChatModule] markMessagesAsRead: Error marking messages as read:', error.message);
    } else {
      console.log('[ChatModule] markMessagesAsRead: Successfully marked messages as read.');
    }
  }, [user, chatPartner]);

  const fetchMessages = useCallback(async () => {
    console.log('[ChatModule] fetchMessages: Function started.');
    if (!user) {
      console.log('[ChatModule] fetchMessages: Skipped (No current user). Setting messages to empty.');
      setMessages([]);
      setLoading(false); // Ensure loading is false if skipped
      return;
    }
    if (!chatPartner) {
      console.log('[ChatModule] fetchMessages: Skipped (No chat partner selected). Setting messages to empty.');
      setMessages([]);
      setLoading(false); // Ensure loading is false if skipped
      return;
    }

    console.log(`[ChatModule] fetchMessages: Fetching messages between user ${user.id} and chat partner ${chatPartner.id}`);
    setLoading(true);
    try {
      // Düzeltilen Supabase sorgusu: 'or' operatörü doğru sözdizimi ile kullanılıyor.
      // İki koşul grubu:
      // 1. Ben göndericiyim VE o alıcı
      // 2. O gönderici VE ben alıcı
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chatPartner.id}),and(sender_id.eq.${chatPartner.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[ChatModule] fetchMessages: Error fetching messages from Supabase:', error.message);
        throw error;
      }
      
      console.log(`[ChatModule] fetchMessages: Fetched ${data.length} messages successfully. Data:`, data);
      setMessages(data as Message[]);
      await markMessagesAsRead();
      scrollToBottom();
    } catch (error: any) {
      console.error('[ChatModule] fetchMessages: General error during message fetch:', error.message);
      setMessages([]);
      showError(t('messages.fetchError'));
    } finally {
      setLoading(false);
      console.log('[ChatModule] fetchMessages: Function finished.');
    }
  }, [user, chatPartner, markMessagesAsRead, scrollToBottom, t]);

  useEffect(() => {
    console.log('[ChatModule] useEffect (chatPartner change): chatPartner changed, re-fetching messages.');
    fetchMessages();
  }, [chatPartner, fetchMessages]);

  useEffect(() => {
    console.log('[ChatModule] useEffect (real-time subscription): Setting up subscription.');
    if (!user || !chatPartner) {
      console.log('[ChatModule] useEffect (real-time subscription): Skipped (No user or chat partner).');
      return;
    }

    const channelId = `chat_${[user.id, chatPartner.id].sort().join('_')}`;
    console.log(`[ChatModule] useEffect (real-time subscription): Subscribing to channel: ${channelId}`);
    
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          // Filter for messages sent TO the current user. This is more efficient.
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          console.log('[ChatModule] Real-time message received:', newMessage);
          
          // Since we filtered by receiver_id, we only need to check if the sender is the current chat partner.
          if (newMessage.sender_id === chatPartner.id) {
            console.log('[ChatModule] Real-time: Message is relevant, updating state.');
            setMessages(currentMessages => {
              if (currentMessages.some(m => m.id === newMessage.id)) {
                return currentMessages;
              }
              return [...currentMessages, newMessage];
            });
            markMessagesAsRead();
            scrollToBottom();
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[ChatModule] Real-time: Successfully subscribed to channel ${channelId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[ChatModule] Real-time: Subscription error on channel ${channelId}:`, err);
        }
        if (status === 'TIMED_OUT') {
            console.warn(`[ChatModule] Real-time: Subscription timed out on channel ${channelId}.`);
        }
      });

    return () => {
      console.log(`[ChatModule] useEffect (real-time subscription cleanup): Unsubscribing from channel: ${channelId}`);
      supabase.removeChannel(channel);
    };
  }, [user, chatPartner, markMessagesAsRead, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ChatModule] handleSendMessage: Function started.');
    if (!newMessage.trim() || !user || !chatPartner) {
      console.log('[ChatModule] handleSendMessage: Skipped (Empty message, no user, or no chat partner).');
      return;
    }

    const messageToSend = {
      sender_id: user.id,
      receiver_id: chatPartner.id,
      content: newMessage.trim(),
    };

    console.log('[ChatModule] handleSendMessage: Attempting to send message:', messageToSend);
    
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      ...messageToSend,
      created_at: new Date().toISOString(),
    };
    setMessages(currentMessages => [...currentMessages, optimisticMessage]);
    setNewMessage('');
    scrollToBottom();

    try {
      const { data, error } = await supabase.from('messages').insert(messageToSend).select().single();

      if (error) {
        console.error('[ChatModule] handleSendMessage: Error inserting message into Supabase:', error.message);
        throw error;
      }
      
      console.log('[ChatModule] handleSendMessage: Message sent successfully and confirmed by server. Data:', data);
      setMessages(currentMessages => currentMessages.map(m => m.id === tempId ? (data as Message) : m));
    } catch (error: any) {
      console.error('[ChatModule] handleSendMessage: General error during message send:', error.message);
      setMessages(currentMessages => currentMessages.filter(m => m.id !== tempId)); // Optimistik mesajı geri al
      showError(t('messages.sendError'));
    } finally {
      console.log('[ChatModule] handleSendMessage: Function finished.');
    }
  };

  if (!chatPartner) {
    console.log('[ChatModule] Render: No chat partner selected, showing placeholder.');
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center">
          <p className="text-muted-foreground">{t('messages.selectChat')}</p>
        </CardContent>
      </Card>
    );
  }

  console.log('[ChatModule] Render: Chat partner selected, rendering chat interface.');
  return (
    <Card className="flex flex-col h-[calc(100vh-12rem)]">
      <CardHeader>
        <CardTitle>{chatPartner.first_name} {chatPartner.last_name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-12 w-3/4 ml-auto" />
                <Skeleton className="h-12 w-3/4" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">{t('messages.noMessages')}</div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender_id !== user?.id && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(chatPartner.first_name, chatPartner.last_name)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-3 py-2 ${msg.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={t('messages.typeMessage')} autoComplete="off" />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ChatModule;