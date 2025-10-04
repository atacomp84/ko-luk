import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface Task {
    id: string;
    title: string;
    description: string;
    due_date: string;
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
      setTasks(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCompleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', taskId);

    if (error) {
      showError('Görev güncellenirken bir hata oluştu.');
    } else {
      showSuccess('Görev tamamlandı olarak işaretlendi!');
      fetchTasks();
    }
  };

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
          <div className="space-y-4">
            {tasks.map(task => (
              <div key={task.id} className={`p-4 rounded-lg border ${task.status === 'completed' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-background'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-bold ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    {task.due_date && <p className="text-xs text-muted-foreground mt-2">Bitiş Tarihi: {format(new Date(task.due_date), 'dd/MM/yyyy')}</p>}
                  </div>
                  {task.status === 'pending' && (
                    <Button size="sm" onClick={() => handleCompleteTask(task.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t('student.markAsCompleted')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">{t('student.noTasks')}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentTasks;