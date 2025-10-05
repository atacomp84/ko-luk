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
    setTimeout(() => {
      const scrollViewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }, 100);
  }, []);

  const markMessagesAsRead = useCallback(async () => {
    if (!user || !chatPartner) return;
    console.log(`[ChatModule] Marking messages from ${chatPartner.id} as read for user ${user.id}`);
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', chatPartner.id)
      .eq('is_read', false);
    if (error) {
      console.error('[ChatModule] Error marking messages as read:', error.message);
    } else {
      console.log('[ChatModule] Successfully marked messages as read.');
    }
  }, [user, chatPartner]);

  const fetchMessages = useCallback(async () => {
    if (!user || !chatPartner) {
      console.log('[ChatModule] Fetch messages skipped: No user or chat partner.');
      setMessages([]);
      return;
    }
    console.log(`[ChatModule] Fetching messages between ${user.id} and ${chatPartner.id}`);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at')
        .or(`(sender_id.eq.${user.id},and(receiver_id.eq.${chatPartner.id})),(sender_id.eq.${chatPartner.id},and(receiver_id.eq.${user.id}))`)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }
      
      console.log(`[ChatModule] Fetched ${data.length} messages.`);
      setMessages(data as Message[]);
      await markMessagesAsRead();
      scrollToBottom();
    } catch (error: any) {
      console.error('[ChatModule] Error fetching messages:', error.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [user, chatPartner, markMessagesAsRead, scrollToBottom]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!user || !chatPartner) return;

    const channelId = `chat_${[user.id, chatPartner.id].sort().join('_')}`;
    console.log(`[ChatModule] Subscribing to real-time channel: ${channelId}`);
    
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const newMessage = payload.new as Message;
        console.log('[ChatModule] Real-time message received:', newMessage);
        
        const isRelevant = (newMessage.sender_id === user.id && newMessage.receiver_id === chatPartner.id) ||
                           (newMessage.sender_id === chatPartner.id && newMessage.receiver_id === user.id);

        if (isRelevant) {
          console.log('[ChatModule] Message is relevant, updating state.');
          setMessages(currentMessages => {
            if (currentMessages.some(m => m.id === newMessage.id)) {
              return currentMessages;
            }
            return [...currentMessages, newMessage];
          });
          if (newMessage.receiver_id === user.id) {
            markMessagesAsRead();
          }
          scrollToBottom();
        } else {
          console.log('[ChatModule] Received message is not for this chat, ignoring.');
        }
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[ChatModule] Successfully subscribed to channel ${channelId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[ChatModule] Subscription error on channel ${channelId}:`, err);
        }
      });

    return () => {
      console.log(`[ChatModule] Unsubscribing from channel: ${channelId}`);
      supabase.removeChannel(channel);
    };
  }, [user, chatPartner, markMessagesAsRead, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatPartner) return;

    const messageToSend = {
      sender_id: user.id,
      receiver_id: chatPartner.id,
      content: newMessage.trim(),
    };

    console.log('[ChatModule] Attempting to send message:', messageToSend);
    
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
        throw error;
      }
      
      console.log('[ChatModule] Message sent successfully and confirmed by server:', data);
      setMessages(currentMessages => currentMessages.map(m => m.id === tempId ? (data as Message) : m));
    } catch (error: any) {
      console.error('[ChatModule] Error sending message:', error.message);
      setMessages(currentMessages => currentMessages.filter(m => m.id !== tempId));
    }
  };

  if (!chatPartner) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center">
          <p className="text-muted-foreground">{t('messages.selectChat')}</p>
        </CardContent>
      </Card>
    );
  }

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
            ) : messages.map(msg => (
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
            ))}
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