import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { lgsSubjects } from '@/data/lgsSubjects';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumberInput } from '../ui/NumberInput';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

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

interface TaskManagementDialogProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskManagementDialog = ({ student, isOpen, onClose }: TaskManagementDialogProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [taskType, setTaskType] = useState<'konu_anlatimi' | 'soru_cozumu'>('konu_anlatimi');
  const [questionCount, setQuestionCount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const { t } = useTranslation();

  const resetForm = useCallback(() => {
    setSelectedSubject('');
    setSelectedTopic('');
    setAvailableTopics([]);
    setTaskType('konu_anlatimi');
    setQuestionCount('');
    setDescription('');
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!student) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      showError('Görevler getirilirken hata oluştu.');
    } else {
      setTasks(data as Task[]);
    }
    setLoading(false);
  }, [student]);

  useEffect(() => {
    if (isOpen && student) {
      fetchTasks();
    } else {
      resetForm();
    }
  }, [isOpen, student, fetchTasks, resetForm]);

  useEffect(() => {
    if (selectedSubject) {
      const subjectData = lgsSubjects.find(s => s.name === selectedSubject);
      setAvailableTopics(subjectData ? subjectData.topics : []);
      setSelectedTopic('');
    } else {
      setAvailableTopics([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    if (taskType === 'soru_cozumu') {
      setQuestionCount(20);
    } else {
      setQuestionCount('');
    }
  }, [taskType]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !selectedSubject || !selectedTopic) return;
    if (taskType === 'soru_cozumu' && (questionCount === '' || Number(questionCount) <= 0)) {
        showError('Lütfen geçerli bir soru adedi girin.');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const taskData = {
      coach_id: user.id,
      student_id: student.id,
      subject: selectedSubject,
      topic: selectedTopic,
      task_type: taskType,
      description: description || null,
      question_count: taskType === 'soru_cozumu' ? Number(questionCount) : null,
    };

    const { error } = await supabase.from('tasks').insert(taskData);

    if (error) {
      showError('Görev eklenirken bir hata oluştu.');
    } else {
      showSuccess('Görev başarıyla eklendi.');
      resetForm();
      fetchTasks();
    }
  };

  const formatTaskTitle = (task: Task) => {
    let title = `${task.topic}`;
    if (task.task_type === 'soru_cozumu' && task.question_count) {
      title += ` (${task.question_count} ${t('coach.questionSolving')})`;
    } else {
      title += ` (${t('coach.topicExplanation')})`;
    }
    return title;
  };

  const isSubmitDisabled = !selectedTopic || (taskType === 'soru_cozumu' && (questionCount === '' || Number(questionCount) <= 0));

  const taskHistoryData = useMemo(() => {
    const groupedBySubject: { [key: string]: Task[] } = {};
    tasks.forEach(task => {
      if (!groupedBySubject[task.subject]) {
        groupedBySubject[task.subject] = [];
      }
      groupedBySubject[task.subject].push(task);
    });
    return groupedBySubject;
  }, [tasks]);

  const chartDataBySubject = useMemo(() => {
    const data: { [key: string]: { name: string; soruSayisi: number }[] } = {};
    Object.entries(taskHistoryData).forEach(([subject, subjectTasks]) => {
      const topicCounts: { [key: string]: number } = {};
      subjectTasks.forEach(task => {
        if (task.task_type === 'soru_cozumu' && task.question_count) {
          if (!topicCounts[task.topic]) {
            topicCounts[task.topic] = 0;
          }
          topicCounts[task.topic] += task.question_count;
        }
      });
      if (Object.keys(topicCounts).length > 0) {
        data[subject] = Object.entries(topicCounts).map(([topic, count]) => ({
          name: topic,
          soruSayisi: count,
        }));
      }
    });
    return data;
  }, [taskHistoryData]);

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('coach.taskManagementTitle', { firstName: student.first_name, lastName: student.last_name })}</DialogTitle>
          <DialogDescription>{t('coach.taskManagementDescription')}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="addTask" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="addTask">{t('coach.addNewTaskTab')}</TabsTrigger>
            <TabsTrigger value="taskHistory">{t('coach.taskHistory')}</TabsTrigger>
          </TabsList>
          <TabsContent value="addTask" className="flex-1 overflow-hidden">
            <div className="grid md:grid-cols-2 gap-6 py-4 h-full">
                <form id="add-task-form" onSubmit={handleAddTask} className="flex flex-col h-full">
                    <div className="flex-1 space-y-6 overflow-y-auto pr-4 pb-4">
                        <div className="space-y-2">
                            <h3 className="font-semibold">{t('coach.selectTopic')}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('coach.selectSubjectPlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {lgsSubjects.map(subject => (
                                            <SelectItem key={subject.name} value={subject.name}>
                                                {subject.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('coach.selectTopicPlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTopics.map(topic => (
                                            <SelectItem key={topic} value={topic}>
                                                {topic}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {selectedTopic && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h3 className="font-semibold">{t('coach.selectTaskType')}</h3>
                                    <RadioGroup value={taskType} onValueChange={(v: 'konu_anlatimi' | 'soru_cozumu') => setTaskType(v)}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="konu_anlatimi" id="r1" />
                                            <Label htmlFor="r1">{t('coach.topicExplanation')}</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="soru_cozumu" id="r2" />
                                            <Label htmlFor="r2">{t('coach.questionSolving')}</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {taskType === 'soru_cozumu' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="question-count">{t('coach.questionCount')}</Label>
                                        <NumberInput value={questionCount} onChange={setQuestionCount} required />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="description">{t('coach.taskDescriptionLabel')}</Label>
                                    <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Öğrenciye not..." />
                                </div>
                            </div>
                        )}
                    </div>
                </form>
                <div className="space-y-4 flex flex-col overflow-hidden">
                    <h3 className="font-semibold">{t('coach.assignedTasks')}</h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 border rounded-md p-2">
                    {loading ? (
                        <Skeleton className="h-20 w-full" />
                    ) : tasks.length > 0 ? (
                        tasks.map(task => (
                        <div key={task.id} className={`p-3 rounded-md ${task.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-secondary'}`}>
                            <p className="font-bold">{`${task.subject}: ${task.topic}`}</p>
                            {task.description && <p className="text-sm text-muted-foreground italic">"{task.description}"</p>}
                            <p className="text-xs font-semibold mt-1 capitalize">{t('coach.statusLabel')}: {task.status === 'pending' ? t('coach.statusPending') : t('coach.statusCompleted')}</p>
                        </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-4">{t('coach.noAssignedTasks')}</p>
                    )}
                    </div>
                </div>
            </div>
          </TabsContent>
          <TabsContent value="taskHistory" className="flex-1 overflow-y-auto p-4">
            {loading ? <Skeleton className="h-full w-full" /> : 
             Object.keys(taskHistoryData).length > 0 ? (
                <Accordion type="multiple" className="w-full space-y-4">
                    {Object.entries(taskHistoryData).map(([subject, subjectTasks]) => (
                        <AccordionItem value={subject} key={subject}>
                            <AccordionTrigger className="text-lg font-bold">{subject}</AccordionTrigger>
                            <AccordionContent className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('coach.totalQuestionsByTopic')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {chartDataBySubject[subject] ? (
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={chartDataBySubject[subject]} margin={{ top: 5, right: 20, left: -10, bottom: 75 }}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={1} tick={{ fontSize: 12 }} />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Bar dataKey="soruSayisi" fill="#8884d8" name={t('coach.questionCount')} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <p className="text-center text-muted-foreground py-10">{t('coach.noTasksForChart')}</p>
                                        )}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('coach.allAssignedTasks')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="max-h-80 overflow-y-auto">
                                        <ul className="space-y-2">
                                            {subjectTasks.map(task => (
                                                <li key={task.id} className={`p-2 rounded-md text-sm ${task.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-secondary'}`}>
                                                    <span className="font-semibold">{formatTaskTitle(task)}</span>
                                                    {task.description && <p className="text-xs text-muted-foreground italic">"{task.description}"</p>}
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
             ) : (
                <p className="text-center text-muted-foreground py-10">{t('coach.noAssignedTasks')}</p>
             )
            }
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>{t('coach.close')}</Button>
          </DialogClose>
          {selectedTopic && (
            <Button type="submit" form="add-task-form" disabled={isSubmitDisabled}>
                {t('coach.addTaskButton')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};