import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Youtube } from 'lucide-react';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '../ui/badge';
import { getSubjectIconComponent, getSubjectColorClass } from '@/utils/subjectUtils';
import { Button } from '../ui/button';

interface Task {
    id: string;
    subject: string;
    topic: string;
    task_type: string;
    question_count: number | null;
    description: string | null;
    status: string;
    created_at: string;
    correct_count?: number | null;
    empty_count?: number | null;
    wrong_count?: number | null;
}

const StudentCompletedTasks = () => {
  console.log("[StudentCompletedTasks] Component rendered.");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const fetchTasks = useCallback(async () => {
    console.log("[StudentCompletedTasks] Fetching completed tasks.");
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .in('status', ['completed', 'not_completed'])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("[StudentCompletedTasks] Error fetching tasks:", error.message);
      showError('Tamamlanan görevler getirilirken bir hata oluştu.');
    } else {
      console.log(`[StudentCompletedTasks] Fetched ${data.length} completed tasks.`);
      setTasks(data as Task[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
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
      case 'not_completed':
        return { className: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800', text: t('student.statusNotCompleted') };
      default:
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('student.completedTasks')}</CardTitle>
        <CardDescription>{t('student.completedTasksDescription')}</CardDescription>
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
              const completedCount = subjectTasks.filter(t => t.status === 'completed').length;
              const notCompletedCount = subjectTasks.filter(t => t.status === 'not_completed').length;
              const Icon = getSubjectIconComponent(subject);
              const colorClass = getSubjectColorClass(subject);
              return (
                <AccordionItem value={subject} key={subject} className="border rounded-md px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4">
                      <Icon className={`h-5 w-5 ${colorClass}`} />
                      <span className={`font-bold text-lg ${colorClass}`}>{subject}</span>
                      {completedCount > 0 && <Badge className="bg-green-500 text-white">{completedCount}</Badge>}
                      {notCompletedCount > 0 && <Badge className="bg-red-500 text-white">{notCompletedCount}</Badge>}
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
                              <p className="text-xs font-semibold mt-2">{statusInfo.text}</p>
                              {task.task_type === 'soru_cozumu' && task.status === 'completed' && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                    <span>Doğru: {task.correct_count}</span> | <span>Yanlış: {task.wrong_count}</span> | <span>Boş: {task.empty_count}</span>
                                </div>
                              )}
                            </div>
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
          <p className="text-center text-muted-foreground py-6">{t('student.noCompletedTasks')}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentCompletedTasks;