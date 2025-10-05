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

  const scrollToBottom = () => {
    setTimeout(() => {
      const scrollViewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }, 100);
  };

  const markMessagesAsRead = useCallback(async () => {
    if (!user || !chatPartner) return;
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', chatPartner.id)
      .eq('is_read', false);
    if (error) console.error('[ChatModule] Error marking messages as read:', error.message);
  }, [user, chatPartner]);

  const fetchMessages = useCallback(async () => {
    if (!user || !chatPartner) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .or(`(sender_id.eq.${user.id},and(receiver_id.eq.${chatPartner.id})),(sender_id.eq.${chatPartner.id},and(receiver_id.eq.${user.id}))`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[ChatModule] Error fetching messages:', error.message);
      setMessages([]);
    } else {
      setMessages(data as Message[]);
      markMessagesAsRead();
      scrollToBottom();
    }
    setLoading(false);
  }, [user, chatPartner, markMessagesAsRead]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!user || !chatPartner) return;

    const channel = supabase
      .channel(`chat_${user.id}_${chatPartner.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id},sender_id=eq.${chatPartner.id}`
      }, (payload) => {
        setMessages(currentMessages => [...currentMessages, payload.new as Message]);
        markMessagesAsRead();
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, chatPartner, markMessagesAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatPartner) return;

    const messageToSend = {
      sender_id: user.id,
      receiver_id: chatPartner.id,
      content: newMessage.trim(),
    };

    const { data, error } = await supabase.from('messages').insert(messageToSend).select().single();

    if (error) {
      console.error('[ChatModule] Error sending message:', error.message);
    } else {
      setMessages(currentMessages => [...currentMessages, data as Message]);
      setNewMessage('');
      scrollToBottom();
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