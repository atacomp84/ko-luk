import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import ChatModule from '../ChatModule';

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
}

const CoachMessages = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

  const fetchStudents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: pairs, error: pairsError } = await supabase
        .from('coach_student_pairs')
        .select('student_id')
        .eq('coach_id', user.id);
      if (pairsError) throw pairsError;

      const studentIds = pairs.map(p => p.student_id);
      if (studentIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', studentIds);
        if (profilesError) throw profilesError;
        setStudents(profiles as StudentProfile[]);
      } else {
        setStudents([]);
      }
    } catch (error) {
      showError(t('messages.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <h3 className="text-lg font-semibold mb-4">{t('coach.myStudents')}</h3>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {students.map(student => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={cn(
                  "w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors",
                  selectedStudent?.id === student.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <Avatar>
                  <AvatarFallback>{getInitials(student.first_name, student.last_name)}</AvatarFallback>
                </Avatar>
                <span>{student.first_name} {student.last_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="md:col-span-2">
        <ChatModule chatPartner={selectedStudent} />
      </div>
    </div>
  );
};

export default CoachMessages;