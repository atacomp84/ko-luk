import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '../ui/badge';

interface Task {
    id: string;
    subject: string;
    topic: string;
    task_type: string;
    question_count: number | null;
    description: string | null;
    status: string;
}

const StudentTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      showError('Görevler getirilirken bir hata oluştu.');
    } else {
      setTasks(data as Task[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCompleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'pending_approval' })
      .eq('id', taskId);

    if (error) {
      showError('Görev güncellenirken bir hata oluştu.');
    } else {
      showSuccess('Göreviniz koç onayına gönderildi!');
      fetchTasks();
    }
  };

  const formatTaskTitle = (task: Task) => {
    let title = `${task.subject}: ${task.topic}`;
    if (task.task_type === 'soru_cozumu' && task.question_count) {
      title += ` (${task.question_count} ${t('coach.questionSolving')})`;
    } else {
      title += ` (${t('coach.topicExplanation')})`;
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
      default:
        return { className: 'bg-background', text: '' };
    }
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
              return (
                <AccordionItem value={subject} key={subject} className="border rounded-md px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-lg">{subject}</span>
                      {pendingCount > 0 && <Badge>{pendingCount}</Badge>}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 space-y-3">
                    {subjectTasks.map(task => {
                      const statusInfo = getStatusInfo(task.status);
                      const isLineThrough = task.status === 'completed' || task.status === 'not_completed';
                      return (
                        <div key={task.id} className={`p-4 rounded-lg border ${statusInfo.className}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className={`font-bold ${isLineThrough ? 'line-through text-muted-foreground' : ''}`}>{formatTaskTitle(task)}</h3>
                              {task.description && <p className="text-sm text-muted-foreground mt-1 italic">"{task.description}"</p>}
                              {task.status !== 'pending' && <p className="text-xs font-semibold mt-2">{statusInfo.text}</p>}
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

export default StudentTasks;