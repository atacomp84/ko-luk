import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { getInitials } from '@/lib/utils';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ChatPartner {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface ChatModuleProps {
  chatPartner: ChatPartner | null;
  onUnreadCountChange?: (count: number) => void;
}

export const ChatModule = ({ chatPartner, onUnreadCountChange }: ChatModuleProps) => {
  console.log("[ChatModule] Component rendered.");
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    if (!user || !chatPartner) {
      console.log("[ChatModule] Fetching messages skipped: no user or chat partner.");
      return;
    }
    setLoading(true);
    console.log(`[ChatModule] Fetching messages between ${user.id} and ${chatPartner.id}`);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`(sender_id.eq.${user.id},receiver_id.eq.${user.id}),(sender_id.eq.${chatPartner.id},receiver_id.eq.${chatPartner.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("[ChatModule] Error fetching messages:", error.message);
      showError(t('messages.fetchError'));
    } else {
      console.log(`[ChatModule] Fetched ${data.length} messages.`);
      setMessages(data || []);
      // Mark messages as read if the current user is the receiver
      const unreadMessages = data.filter(msg => msg.receiver_id === user.id && !msg.is_read);
      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(msg => msg.id));
        console.log(`[ChatModule] Marked ${unreadMessages.length} messages as read.`);
        if (onUnreadCountChange) {
          onUnreadCountChange(0); // Update parent with 0 unread messages
        }
      }
    }
    setLoading(false);
  }, [user, chatPartner, t, onUnreadCountChange]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user || !chatPartner) return;

    console.log("[ChatModule] Setting up real-time subscription for messages.");
    const channel = supabase
      .channel(`chat_${user.id}_${chatPartner.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `(sender_id.eq.${user.id}.and.receiver_id.eq.${chatPartner.id}).or(sender_id.eq.${chatPartner.id}.and.receiver_id.eq.${user.id})`,
        },
        (payload) => {
          console.log("[ChatModule] Real-time message update received:", payload);
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as Message]);
            if ((payload.new as Message).receiver_id === user.id) {
              // Mark new incoming message as read
              supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', (payload.new as Message).id)
                .then(() => {
                  console.log(`[ChatModule] Marked new message ${payload.new.id} as read.`);
                  if (onUnreadCountChange) {
                    onUnreadCountChange(0); // Ensure unread count is 0 after receiving and marking as read
                  }
                });
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === (payload.new as Message).id ? (payload.new as Message) : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log("[ChatModule] Unsubscribing from real-time channel.");
      supabase.removeChannel(channel);
    };
  }, [user, chatPartner, onUnreadCountChange]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatPartner) return;

    console.log(`[ChatModule] Sending message from ${user.id} to ${chatPartner.id}: "${newMessage}"`);
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: chatPartner.id,
      content: newMessage.trim(),
    });

    if (error) {
      console.error("[ChatModule] Error sending message:", error.message);
      showError(t('messages.sendError'));
    } else {
      console.log("[ChatModule] Message sent successfully.");
      setNewMessage('');
    }
  };

  if (!chatPartner) {
    return (
      <Card className="h-[calc(100vh-15rem)] flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-4" />
          <p>{t('messages.selectChat')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[calc(100vh-15rem)] flex flex-col">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
              {getInitials(chatPartner.first_name, chatPartner.last_name)}
            </AvatarFallback>
          </Avatar>
          {chatPartner.first_name} {chatPartner.last_name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-hidden">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-1/2" />
          </div>
        ) : (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground">{t('messages.noMessages')}</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        msg.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder={t('messages.typeMessage')}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">{t('messages.sendButton')}</span>
          </Button>
        </form>
      </div>
    </Card>
  );
};