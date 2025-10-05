import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Youtube } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '../ui/badge';
import { lgsSubjects } from '@/data/lgsSubjects';
import { getSubjectIconComponent, getSubjectColorClass } from '@/utils/subjectUtils';
import { differenceInMilliseconds, addHours } from 'date-fns';

interface Task {
    id: string;
    subject: string;
    topic: string;
    task_type: string;
    question_count: number | null;
    description: string | null;
    status: string;
    created_at: string;
}

const StudentCurrentTasks = () => {
  console.log("[StudentCurrentTasks] Component rendered.");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const intervalRefs = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchTasks = useCallback(async () => {
    console.log("[StudentCurrentTasks] Fetching current tasks.");
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .in('status', ['pending', 'pending_approval'])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("[StudentCurrentTasks] Error fetching tasks:", error.message);
      showError('Görevler getirilirken bir hata oluştu.');
    } else {
      console.log(`[StudentCurrentTasks] Fetched ${data.length} current tasks.`);
      setTasks(data as Task[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
    return () => {
      // Clear all intervals on unmount
      Object.values(intervalRefs.current).forEach(clearInterval);
    };
  }, [fetchTasks]);

  const handleCompleteTask = async (taskId: string) => {
    console.log(`[StudentCurrentTasks] Marking task ${taskId} as pending_approval.`);
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'pending_approval' })
      .eq('id', taskId);

    if (error) {
      console.error(`[StudentCurrentTasks] Error updating task ${taskId} status:`, error.message);
      showError('Görev güncellenirken bir hata oluştu.');
    } else {
      console.log(`[StudentCurrentTasks] Task ${taskId} sent for coach approval.`);
      showSuccess('Göreviniz koç onayına gönderildi!');
      fetchTasks();
    }
  };

  const handleTaskTimeout = useCallback(async (taskId: string) => {
    console.log(`[StudentCurrentTasks] Task ${taskId} timed out. Marking as not_completed.`);
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'not_completed' })
      .eq('id', taskId);

    if (error) {
      console.error(`[StudentCurrentTasks] Error marking task ${taskId} as not_completed:`, error.message);
      showError('Görev zaman aşımına uğradı ve güncellenirken bir hata oluştu.');
    } else {
      console.log(`[StudentCurrentTasks] Task ${taskId} successfully marked as not_completed.`);
      showSuccess('Bir görevin süresi doldu ve tamamlanmadı olarak işaretlendi.');
      fetchTasks(); // Refresh tasks to reflect the change
    }
  }, [fetchTasks]);

  const formatTaskTitle = (task: Task) => {
    let title = `${task.subject}: ${task.topic}`;
    if (task.task_type === 'soru_cozumu' && task.question_count) {
      title += ` (${task.question_count} ${t('coach.questionSolving')})`;
    } else if (task.task_type === 'konu_anlatimi') {
      title += ` (${t('coach.topicExplanation')})`;
    } else if (task.task_type === 'kitap_okuma') {
        title += ` (${t('coach.selectPageCountPlaceholder')})`; // Using a generic placeholder for page count
    }
    return title;
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { className: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800', text: t('student.statusCompleted') };
      case 'pending_approval':
        return { className: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800', text: t('student.statusPendingApproval') };
      case 'not_completed':
        return { className: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800', text: t('student.statusNotCompleted') };
      default: // pending
        return { className: 'bg-background', text: '' };
    }
  };

  const isYoutubeLink = (url: string | null): boolean => {
    if (!url) return false;
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return youtubeRegex.test(url);
  };

  const groupedTasks = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const { subject } = task;
      if (!acc[subject]) {
        acc[subject] = [];
      }
      acc[subject].push(task);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [tasks]);

  const calculateTimeLeft = useCallback((createdAt: string) => {
    const creationTime = new Date(createdAt);
    const twentyFourHoursLater = addHours(creationTime, 24);
    const now = new Date();
    const timeLeftMs = differenceInMilliseconds(twentyFourHoursLater, now);

    if (timeLeftMs <= 0) {
      return "00:00:00";
    }

    const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    // Clear existing intervals
    Object.values(intervalRefs.current).forEach(clearInterval);
    intervalRefs.current = {};

    tasks.forEach(task => {
      if (task.status === 'pending') {
        const creationTime = new Date(task.created_at);
        const twentyFourHoursLater = addHours(creationTime, 24);
        const now = new Date();
        const timeLeftMs = differenceInMilliseconds(twentyFourHoursLater, now);

        if (timeLeftMs <= 0) {
          // Task is already overdue, mark it as not_completed immediately
          handleTaskTimeout(task.id);
        } else {
          // Set up a countdown interval
          const interval = setInterval(() => {
            const updatedTimeLeftMs = differenceInMilliseconds(addHours(new Date(task.created_at), 24), new Date());
            if (updatedTimeLeftMs <= 0) {
              clearInterval(intervalRefs.current[task.id]);
              delete intervalRefs.current[task.id];
              handleTaskTimeout(task.id);
            } else {
              // Force a re-render to update the timer display
              setTasks(prevTasks => prevTasks.map(t => t.id === task.id ? { ...t } : t));
            }
          }, 1000);
          intervalRefs.current[task.id] = interval;
        }
      }
    });

    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
    };
  }, [tasks, handleTaskTimeout]); // Re-run when tasks change

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('student.myTasks')}</CardTitle>
        <CardDescription>{t('student.tasksDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : tasks.length > 0 ? (
          <Accordion type="multiple" className="w-full space-y-2">
            {Object.entries(groupedTasks).map(([subject, subjectTasks]) => {
              const pendingCount = subjectTasks.filter(t => t.status === 'pending' || t.status === 'pending_approval').length;
              const Icon = getSubjectIconComponent(subject);
              const colorClass = getSubjectColorClass(subject);
              return (
                <AccordionItem value={subject} key={subject} className="border rounded-md px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4">
                      <Icon className={`h-5 w-5 ${colorClass}`} />
                      <span className={`font-bold text-lg ${colorClass}`}>{subject}</span>
                      {pendingCount > 0 && <Badge>{pendingCount}</Badge>}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 space-y-3">
                    {subjectTasks.map(task => {
                      const statusInfo = getStatusInfo(task.status);
                      const isLineThrough = task.status === 'completed' || task.status === 'not_completed';
                      const timeLeft = task.status === 'pending' ? calculateTimeLeft(task.created_at) : null;

                      return (
                        <div key={task.id} className={`p-4 rounded-lg border ${statusInfo.className}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className={`font-bold ${isLineThrough ? 'line-through text-muted-foreground' : ''}`}>{formatTaskTitle(task)}</h3>
                              {isYoutubeLink(task.description) ? (
                                <Button asChild size="sm" className="mt-2">
                                  <a href={task.description!} target="_blank" rel="noopener noreferrer">
                                    <Youtube className="h-4 w-4 mr-2" />
                                    Ders Videosunu İzle
                                  </a>
                                </Button>
                              ) : task.description && (
                                <p className="text-sm text-muted-foreground mt-1 italic">"{task.description}"</p>
                              )}
                              {task.status !== 'pending' && <p className="text-xs font-semibold mt-2">{statusInfo.text}</p>}
                              {timeLeft && timeLeft !== "00:00:00" && (
                                <p className="text-xs font-semibold mt-2 text-red-600 dark:text-red-400">
                                  Kalan Süre: {timeLeft}
                                </p>
                              )}
                            </div>
                            {task.status === 'pending' && (
                              <Button size="sm" onClick={() => handleCompleteTask(task.id)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {t('student.markAsCompleted')}
                              </Button>
                            )}
                            {task.status === 'pending_approval' && (
                              <Button size="sm" variant="outline" disabled>
                                <Clock className="h-4 w-4 mr-2" />
                                {t('student.awaitingApproval')}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        ) : (
          <p className="text-center text-muted-foreground py-6">{t('student.noTasks')}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentCurrentTasks;