import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatModule } from '@/components/ChatModule';
import { useTranslation } from 'react-i18next';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  chat_enabled: boolean; // Add chat_enabled status
}

interface UnreadCounts {
  [studentId: string]: number;
}

const CoachMessages = () => {
  console.log("[CoachMessages] Component rendered.");
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const { t } = useTranslation();

  const fetchStudents = useCallback(async () => {
    if (!user) {
      console.log("[CoachMessages] Fetching students skipped: no user.");
      return;
    }
    setLoading(true);
    console.log(`[CoachMessages] Fetching students for coach ID: ${user.id}`);
    const { data: pairs, error: pairsError } = await supabase
      .from('coach_student_pairs')
      .select('student_id, chat_enabled') // Select chat_enabled
      .eq('coach_id', user.id);

    if (pairsError) {
      console.error("[CoachMessages] Error fetching student pairs:", pairsError.message);
      setStudents([]);
      setLoading(false);
      return;
    }

    const studentIds = pairs.map(p => p.student_id);
    const studentChatStatus = new Map(pairs.map(p => [p.student_id, p.chat_enabled]));

    if (studentIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('id', studentIds);

      if (profilesError) {
        console.error("[CoachMessages] Error fetching student profiles:", profilesError.message);
        setStudents([]);
      } else {
        console.log(`[CoachMessages] Fetched ${profiles.length} student profiles.`);
        const studentsWithChatStatus = profiles.map(profile => ({
          ...profile,
          chat_enabled: studentChatStatus.get(profile.id) ?? true, // Default to true if not found
        }));
        setStudents(studentsWithChatStatus as Student[]);
      }
    } else {
      console.log("[CoachMessages] No student IDs to fetch profiles for.");
      setStudents([]);
    }
    setLoading(false);
  }, [user]);

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;
    console.log(`[CoachMessages] Fetching unread message counts for coach ID: ${user.id}`);
    // Fetch all unread messages for the current user
    const { data, error } = await supabase
      .from('messages')
      .select('sender_id') // Only select sender_id
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error("[CoachMessages] Error fetching unread counts:", error.message);
      return;
    }

    const counts: UnreadCounts = {};
    data.forEach(item => {
      counts[item.sender_id] = (counts[item.sender_id] || 0) + 1; // Increment count for each sender
    });
    setUnreadCounts(counts);
    console.log("[CoachMessages] Unread counts fetched:", counts);
  }, [user]);

  useEffect(() => {
    fetchStudents();
    fetchUnreadCounts();
  }, [fetchStudents, fetchUnreadCounts]);

  useEffect(() => {
    if (!user) return;

    console.log("[CoachMessages] Setting up real-time subscription for unread messages.");
    const channel = supabase
      .channel(`unread_messages_coach_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id.eq.${user.id}`,
        },
        (payload) => {
          console.log("[CoachMessages] Real-time unread message update received:", payload);
          fetchUnreadCounts(); // Re-fetch counts on any message change
        }
      )
      .subscribe();
    
    // Real-time subscription for chat_enabled changes
    const chatStatusChannel = supabase
      .channel(`chat_status_coach_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coach_student_pairs',
          filter: `coach_id.eq.${user.id}`,
        },
        (payload) => {
          console.log("[CoachMessages] Real-time chat status update received:", payload);
          setStudents(prevStudents => prevStudents.map(student => 
            student.id === (payload.new as any).student_id 
              ? { ...student, chat_enabled: (payload.new as any).chat_enabled } 
              : student
          ));
        }
      )
      .subscribe();


    return () => {
      console.log("[CoachMessages] Unsubscribing from real-time unread messages channel.");
      supabase.removeChannel(channel);
      supabase.removeChannel(chatStatusChannel);
    };
  }, [user, fetchUnreadCounts]);

  const handleUnreadCountChange = useCallback((studentId: string, count: number) => {
    setUnreadCounts(prev => ({ ...prev, [studentId]: count }));
  }, []);

  const handleToggleChat = async (studentId: string, checked: boolean) => {
    console.log(`[CoachMessages] Toggling chat for student ${studentId} to ${checked}`);
    const { error } = await supabase
      .from('coach_student_pairs')
      .update({ chat_enabled: checked })
      .eq('coach_id', user?.id)
      .eq('student_id', studentId);

    if (error) {
      console.error("[CoachMessages] Error toggling chat status:", error.message);
      showError(t('messages.toggleChatError')); // Add this translation key
    } else {
      showSuccess(t(checked ? 'messages.chatEnabled' : 'messages.chatDisabled')); // Add these translation keys
      setStudents(prevStudents => prevStudents.map(student => 
        student.id === studentId ? { ...student, chat_enabled: checked } : student
      ));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-15rem)]">
      <Card className="md:col-span-1 flex flex-col">
        <CardHeader className="border-b p-4">
          <CardTitle className="text-lg">{t('messages.myStudents')}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : students.length > 0 ? (
            <div className="divide-y">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={cn(
                    "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedStudent?.id === student.id && "bg-muted"
                  )}
                  onClick={() => {
                    setSelectedStudent(student);
                    handleUnreadCountChange(student.id, 0); // Clear unread count when selected
                  }}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {getInitials(student.first_name, student.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{student.first_name} {student.last_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`chat-toggle-${student.id}`} className="sr-only">
                      {t('messages.toggleChat')}
                    </Label>
                    <Switch
                      id={`chat-toggle-${student.id}`}
                      checked={student.chat_enabled}
                      onCheckedChange={(checked) => handleToggleChat(student.id, checked)}
                      onClick={(e) => e.stopPropagation()} // Prevent card click when toggling
                    />
                    {unreadCounts[student.id] > 0 && (
                      <Badge className="bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center p-0">
                        {unreadCounts[student.id]}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">{t('messages.noStudents')}</p>
          )}
        </CardContent>
      </Card>
      <div className="md:col-span-2">
        <ChatModule 
          chatPartner={selectedStudent} 
          onUnreadCountChange={(count) => selectedStudent && handleUnreadCountChange(selectedStudent.id, count)} 
        />
      </div>
    </div>
  );
};

export default CoachMessages;