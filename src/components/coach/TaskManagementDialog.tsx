import { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Book, Calculator, FlaskConical, Globe, Palette, MessageSquare, History, Youtube } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
    correct_count?: number | null;
    empty_count?: number | null;
    wrong_count?: number | null;
}

interface ScoreData {
    correct: number | '';
    empty: number | '';
    wrong: number | '';
}

interface TaskManagementDialogProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

const getSubjectIcon = (subject: string): ReactNode => {
    switch (subject) {
        case "Türkçe": return <Book className="h-6 w-6 text-blue-500" />;
        case "Matematik": return <Calculator className="h-6 w-6 text-green-500" />;
        case "Fen Bilimleri": return <FlaskConical className="h-6 w-6 text-purple-500" />;
        case "T.C. İnkılap Tarihi ve Atatürkçülük": return <History className="h-6 w-6 text-red-500" />;
        case "Din Kültürü ve Ahlak Bilgisi": return <MessageSquare className="h-6 w-6 text-yellow-500" />;
        case "İngilizce": return <Globe className="h-6 w-6 text-indigo-500" />;
        default: return <Palette className="h-6 w-6 text-gray-500" />;
    }
};

const CustomizedAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const value = payload.value as string;
    
    if (value.length > 18) {
        const middle = Math.floor(value.length / 2);
        let breakPoint = value.lastIndexOf(' ', middle);
        if (breakPoint === -1) breakPoint = middle;
        const line1 = value.substring(0, breakPoint);
        const line2 = value.substring(breakPoint + 1);
        return (
            <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={12}>
                    <tspan x="0" dy="0">{line1}</tspan>
                    <tspan x="0" dy="15">{line2}</tspan>
                </text>
            </g>
        );
    }

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={12}>
                {value}
            </text>
        </g>
    );
};

const renderCenteredLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (height < 20) return null;
    return (
        <text
            x={x + width / 2}
            y={y + height / 2}
            fill="#fff"
            textAnchor="middle"
            dominantBaseline="middle"
            fontWeight="bold"
            fontSize={14}
        >
            {`Net: ${Number(value).toFixed(2)}`}
        </text>
    );
};

export const TaskManagementDialog = ({ student, isOpen, onClose }: TaskManagementDialogProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [taskType, setTaskType] = useState<'konu_anlatimi' | 'soru_cozumu'>('konu_anlatimi');
  const [questionCount, setQuestionCount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [activeTab, setActiveTab] = useState('addTask');
  
  const [taskToUpdate, setTaskToUpdate] = useState<Task | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  
  const [isScoreEntryOpen, setScoreEntryOpen] = useState(false);
  const [isSimpleApprovalOpen, setSimpleApprovalOpen] = useState(false);
  const [scoreData, setScoreData] = useState<ScoreData>({ correct: 0, empty: 0, wrong: 0 });

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
      setDescription('');
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
      description: taskType === 'konu_anlatimi' ? (description || null) : null,
      question_count: taskType === 'soru_cozumu' ? Number(questionCount) : null,
      status: 'pending',
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

  const handleTaskClick = (task: Task) => {
    setTaskToUpdate(task);
    if (task.task_type === 'soru_cozumu') {
      setScoreData({ 
        correct: task.correct_count ?? 0, 
        empty: task.empty_count ?? 0, 
        wrong: task.wrong_count ?? 0 
      });
      setScoreEntryOpen(true);
    } else {
      setSimpleApprovalOpen(true);
    }
  };

  const handleSimpleApproval = async (newStatus: 'completed' | 'not_completed') => {
    if (!taskToUpdate) return;
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskToUpdate.id);

    if (error) {
      showError('Görev güncellenirken bir hata oluştu.');
    } else {
      showSuccess(newStatus === 'completed' ? 'Görev onaylandı.' : 'Görev reddedildi.');
      fetchTasks();
    }
    setSimpleApprovalOpen(false);
    setTaskToUpdate(null);
  };

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToUpdate || !taskToUpdate.question_count) return;

    const correct = Number(scoreData.correct) || 0;
    const empty = Number(scoreData.empty) || 0;
    const wrong = Number(scoreData.wrong) || 0;
    const total = correct + empty + wrong;

    if (total !== taskToUpdate.question_count) {
      showError(t('coach.scoreEntry.validationError', { count: taskToUpdate.question_count }));
      return;
    }

    const updateData = { 
      status: 'completed',
      correct_count: correct,
      empty_count: empty,
      wrong_count: wrong,
    };

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskToUpdate.id);

    if (error) {
      showError('Görev güncellenirken bir hata oluştu.');
    } else {
      showSuccess('Görev onaylandı ve puanlar kaydedildi.');
      fetchTasks();
    }
    setScoreEntryOpen(false);
    setTaskToUpdate(null);
  };
  
  const handleRejectTaskFromScoreDialog = async () => {
    if (!taskToUpdate) return;
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'not_completed', correct_count: null, empty_count: null, wrong_count: null })
      .eq('id', taskToUpdate.id);

    if (error) {
      showError('Görev güncellenirken bir hata oluştu.');
    } else {
      showSuccess('Görev reddedildi.');
      fetchTasks();
    }
    setScoreEntryOpen(false);
    setTaskToUpdate(null);
  };

  const handleOpenDeleteDialog = (task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskToDelete.id);

    if (error) {
      showError(t('coach.deleteTask.error'));
    } else {
      showSuccess(t('coach.deleteTask.success'));
      fetchTasks();
    }
    setTaskToDelete(null);
    setDeleteDialogOpen(false);
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

  const topicAssignmentStats = useMemo(() => {
    const stats: Record<string, { explanations: number; questions: number }> = {};
    tasks.forEach(task => {
        if (!stats[task.topic]) {
            stats[task.topic] = { explanations: 0, questions: 0 };
        }
        if (task.task_type === 'konu_anlatimi') {
            stats[task.topic].explanations += 1;
        } else if (task.task_type === 'soru_cozumu' && task.question_count) {
            stats[task.topic].questions += task.question_count;
        }
    });
    return stats;
  }, [tasks]);

  const isSubmitDisabled = !selectedTopic || (taskType === 'soru_cozumu' && (questionCount === '' || Number(questionCount) <= 0));

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

  const analyticsData = useMemo(() => {
    const questionTasks = tasks.filter(task => 
      task.task_type === 'soru_cozumu' && 
      task.status === 'completed' &&
      task.correct_count != null &&
      task.empty_count != null &&
      task.wrong_count != null
    );

    const dataBySubject = questionTasks.reduce((acc, task) => {
      if (!acc[task.subject]) acc[task.subject] = {};
      if (!acc[task.subject][task.topic]) {
        acc[task.subject][task.topic] = { correct: 0, empty: 0, wrong: 0 };
      }
      acc[task.subject][task.topic].correct += task.correct_count!;
      acc[task.subject][task.topic].empty += task.empty_count!;
      acc[task.subject][task.topic].wrong += task.wrong_count!;
      return acc;
    }, {} as Record<string, Record<string, { correct: number; empty: number; wrong: number }>>);

    const finalData = Object.entries(dataBySubject).map(([subject, topics]) => ({
      subject,
      data: Object.entries(topics).map(([topic, counts]) => {
        const total = counts.correct + counts.wrong + counts.empty;
        return {
          topic,
          ...counts,
          total,
          net: (counts.correct - counts.wrong / 3).toFixed(2),
        };
      }),
    }));
    return finalData;
  }, [tasks]);

  const getStatusBorderClass = (status: string) => {
    switch (status) {
      case 'completed': return 'border-l-4 border-green-500';
      case 'pending': return 'border-l-4 border-yellow-500';
      case 'not_completed': return 'border-l-4 border-red-500';
      case 'pending_approval': return 'border-l-4 border-blue-500';
      default: return '';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
    if (status === 'not_completed') return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
    if (status === 'pending_approval') return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
  };

  const getStatusTranslationKey = (status: string) => {
    if (status === 'completed') return 'coach.statusCompleted';
    if (status === 'not_completed') return 'coach.statusNotCompleted';
    if (status === 'pending_approval') return 'coach.statusPendingApproval';
    return 'coach.statusPending';
  };

  if (!student) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('coach.taskManagementTitle', { firstName: student.first_name, lastName: student.last_name })}</DialogTitle>
            <DialogDescription>{t('coach.taskManagementDescription')}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="addTask" onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="shrink-0 grid w-full grid-cols-2">
              <TabsTrigger value="addTask">{t('coach.addNewTaskTab')}</TabsTrigger>
              <TabsTrigger value="analytics">{t('coach.analytics')}</TabsTrigger>
            </TabsList>
            <TabsContent value="addTask" className="flex-1 overflow-hidden">
              <div className="grid md:grid-cols-2 gap-6 py-4 h-full">
                  <form id="add-task-form" onSubmit={handleAddTask} className="flex flex-col h-full">
                      <div className="flex-1 space-y-6 overflow-y-auto pr-4 pb-4">
                          <div className="space-y-2">
                              <h3 className="font-semibold">{t('coach.selectTopic')}</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <Select value={selectedSubject} onValueChange={setSelectedSubject}><SelectTrigger><SelectValue placeholder={t('coach.selectSubjectPlaceholder')} /></SelectTrigger><SelectContent>{lgsSubjects.map(subject => (<SelectItem key={subject.name} value={subject.name}>{subject.name}</SelectItem>))}</SelectContent></Select>
                                  <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}><SelectTrigger><SelectValue placeholder={t('coach.selectTopicPlaceholder')}>{selectedTopic || null}</SelectValue></SelectTrigger><SelectContent>{availableTopics.map(topic => (<SelectItem key={topic} value={topic}><div className="flex items-center justify-between w-full"><span>{topic}</span><div className="flex items-center gap-1.5">{topicAssignmentStats[topic]?.explanations > 0 && <Badge variant="outline" className="bg-blue-100 text-blue-700">{topicAssignmentStats[topic].explanations} Anlatım</Badge>}{topicAssignmentStats[topic]?.questions > 0 && <Badge variant="outline" className="bg-purple-100 text-purple-700">{topicAssignmentStats[topic].questions} Soru</Badge>}</div></div></SelectItem>))}</SelectContent></Select>
                              </div>
                          </div>
                          {selectedTopic && (<div className="space-y-6"><div className="space-y-2"><h3 className="font-semibold">{t('coach.selectTaskType')}</h3><RadioGroup value={taskType} onValueChange={(v: 'konu_anlatimi' | 'soru_cozumu') => setTaskType(v)}><div className="flex items-center space-x-2"><RadioGroupItem value="konu_anlatimi" id="r1" /><Label htmlFor="r1">{t('coach.topicExplanation')}</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="soru_cozumu" id="r2" /><Label htmlFor="r2">{t('coach.questionSolving')}</Label></div></RadioGroup></div>{taskType === 'soru_cozumu' && (<div className="space-y-2"><Label htmlFor="question-count">{t('coach.questionCount')}</Label><NumberInput value={questionCount} onChange={setQuestionCount} required /></div>)}{taskType === 'konu_anlatimi' && (<div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="description">{t('coach.taskDescriptionLabel')}</Label><Button asChild variant="ghost" size="icon"><a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer"><Youtube className="h-5 w-5 text-red-500" /></a></Button></div><Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Öğrenciye not veya video linki..." /></div>)}</div>)}
                      </div>
                  </form>
                  <div className="space-y-4 flex flex-col overflow-hidden">
                      <h3 className="font-semibold">{t('coach.assignedTasks')}</h3>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                      {loading ? <Skeleton className="h-24 w-full" /> : Object.keys(groupedTasks).length > 0 ? (
                        Object.entries(groupedTasks).map(([subject, subjectTasks]) => {
                          const pendingCount = subjectTasks.filter(t => t.status === 'pending' || t.status === 'pending_approval').length;
                          const completedCount = subjectTasks.filter(t => t.status === 'completed').length;
                          const notCompletedCount = subjectTasks.filter(t => t.status === 'not_completed').length;
                          return (
                            <Collapsible key={subject} defaultOpen className="space-y-2">
                              <CollapsibleTrigger className="flex justify-between items-center w-full p-2 bg-muted rounded-md">
                                <span className="font-bold">{subject}</span>
                                <div className="flex items-center gap-1.5 font-mono text-xs">
                                    {notCompletedCount > 0 && <Badge className="bg-red-500 text-white hover:bg-red-500">{notCompletedCount}</Badge>}
                                    {pendingCount > 0 && <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">{pendingCount}</Badge>}
                                    {completedCount > 0 && <Badge className="bg-green-500 text-white hover:bg-green-500">{completedCount}</Badge>}
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="space-y-2 pl-4">
                                {subjectTasks.map(task => (
                                  <Card key={task.id} className={`cursor-pointer hover:shadow-md transition-shadow ${getStatusBorderClass(task.status)}`} onClick={() => handleTaskClick(task)}>
                                    <CardContent className="p-3 flex items-center gap-4">
                                      <div className="flex-shrink-0">{getSubjectIcon(task.subject)}</div>
                                      <div className="flex-grow">
                                        <p className="font-bold">{formatTaskTitle(task)}</p>
                                        <Badge variant="outline" className={`mt-1 ${getStatusBadgeClass(task.status)}`}>{t(getStatusTranslationKey(task.status))}</Badge>
                                      </div>
                                      <Button variant="ghost" size="icon" className="ml-2 shrink-0" onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(task); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </CardContent>
                                  </Card>
                                ))}
                              </CollapsibleContent>
                            </Collapsible>
                          )
                        })
                      ) : (<p className="text-center text-muted-foreground py-4">{t('coach.noAssignedTasks')}</p>)}
                      </div>
                  </div>
              </div>
            </TabsContent>
            <TabsContent value="analytics" className="flex-1 overflow-y-auto p-4">
              {loading ? <Skeleton className="h-full w-full" /> : analyticsData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {analyticsData.map(({ subject, data }) => (
                    <Card key={subject}>
                      <CardHeader><CardTitle>{subject}</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="topic" height={60} interval={0} tick={<CustomizedAxisTick />} axisLine={false} tickLine={false} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="correct" stackId="a" fill="#22c55e" name={t('coach.scoreEntry.correct')} />
                            <Bar dataKey="wrong" stackId="a" fill="#ef4444" name={t('coach.scoreEntry.wrong')} />
                            <Bar dataKey="empty" stackId="a" fill="#3b82f6" name={t('coach.scoreEntry.empty')} />
                            <Bar dataKey="total" stackId="b" fill="transparent" isAnimationActive={false}>
                                <LabelList dataKey="net" content={renderCenteredLabel} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (<p className="text-center text-muted-foreground py-10">{t('coach.noTasksForChart')}</p>)}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>{t('coach.close')}</Button></DialogClose>
            {activeTab === 'addTask' && (
              <Button type="submit" form="add-task-form" disabled={isSubmitDisabled}>{t('coach.addTaskButton')}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isSimpleApprovalOpen} onOpenChange={setSimpleApprovalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('coach.approval.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('coach.approval.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToUpdate(null)}>{t('coach.cancel')}</AlertDialogCancel>
            <Button variant="destructive" onClick={() => handleSimpleApproval('not_completed')}>{t('coach.approval.reject')}</Button>
            <AlertDialogAction onClick={() => handleSimpleApproval('completed')}>{t('coach.approval.approve')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isScoreEntryOpen} onOpenChange={setScoreEntryOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('coach.scoreEntry.title')}</DialogTitle>
                <DialogDescription>
                    {t('coach.scoreEntry.description', { 
                        topic: taskToUpdate?.topic, 
                        count: taskToUpdate?.question_count 
                    })}
                </DialogDescription>
            </DialogHeader>
            <form id="score-form" onSubmit={handleScoreSubmit}>
                <div className="grid grid-cols-3 gap-4 py-4">
                    <div className="space-y-2">
                        <Label>{t('coach.scoreEntry.correct')}</Label>
                        <NumberInput value={scoreData.correct} onChange={(val) => setScoreData(s => ({...s, correct: val}))} required />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('coach.scoreEntry.wrong')}</Label>
                        <NumberInput value={scoreData.wrong} onChange={(val) => setScoreData(s => ({...s, wrong: val}))} required />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('coach.scoreEntry.empty')}</Label>
                        <NumberInput value={scoreData.empty} onChange={(val) => setScoreData(s => ({...s, empty: val}))} required />
                    </div>
                </div>
            </form>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">{t('coach.cancel')}</Button>
                </DialogClose>
                <Button variant="destructive" onClick={handleRejectTaskFromScoreDialog}>{t('coach.approval.reject')}</Button>
                <Button type="submit" form="score-form">{t('coach.scoreEntry.saveAndApprove')}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('coach.deleteTask.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('coach.deleteTask.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDelete(null)}>{t('coach.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('coach.deleteTask.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};