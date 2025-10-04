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
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';

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

export const TaskManagementDialog = ({ student, isOpen, onClose }: TaskManagementDialogProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [taskType, setTaskType] = useState<'konu_anlatimi' | 'soru_cozumu'>('konu_anlatimi');
  const [questionCount, setQuestionCount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  
  const [taskToUpdate, setTaskToUpdate] = useState<Task | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  
  const [isScoreEntryOpen, setScoreEntryOpen] = useState(false);
  const [isSimpleApprovalOpen, setSimpleApprovalOpen] = useState(false);
  const [scoreData, setScoreData] = useState<ScoreData>({ correct: '', empty: '', wrong: '' });

  const { t } = useTranslation();

  const resetForm = useCallback(() => {
    console.log("[TaskManagement] Form sıfırlanıyor.");
    setSelectedSubject('');
    setSelectedTopic('');
    setAvailableTopics([]);
    setTaskType('konu_anlatimi');
    setQuestionCount('');
    setDescription('');
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!student) return;
    console.log(`[TaskManagement] Adım 1: Görevler çekiliyor... Öğrenci ID: ${student.id}`);
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("[TaskManagement] HATA: Görevler çekilirken hata oluştu.", error);
      showError('Görevler getirilirken hata oluştu.');
    } else {
      console.log("[TaskManagement] Adım 2: Görevler başarıyla çekildi.", data);
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
    console.log("[TaskManagement] Adım 1: Yeni görev ekleme işlemi başlatıldı.");
    if (!student || !selectedSubject || !selectedTopic) {
      console.warn("[TaskManagement] Uyarı: Gerekli alanlar (öğrenci, ders, konu) doldurulmadığı için görev eklenemedi.");
      return;
    }
    if (taskType === 'soru_cozumu' && (questionCount === '' || Number(questionCount) <= 0)) {
        showError('Lütfen geçerli bir soru adedi girin.');
        console.warn("[TaskManagement] Uyarı: Geçersiz soru adedi girildi.");
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("[TaskManagement] HATA: Görev eklemek için kullanıcı oturumu bulunamadı.");
      return;
    }

    const taskData = {
      coach_id: user.id,
      student_id: student.id,
      subject: selectedSubject,
      topic: selectedTopic,
      task_type: taskType,
      description: description || null,
      question_count: taskType === 'soru_cozumu' ? Number(questionCount) : null,
      status: 'pending',
    };
    console.log("[TaskManagement] Adım 2: Veritabanına gönderilecek görev verisi:", taskData);

    const { error } = await supabase.from('tasks').insert(taskData);

    if (error) {
      console.error("[TaskManagement] HATA: Görev veritabanına eklenirken hata oluştu.", error);
      showError('Görev eklenirken bir hata oluştu.');
    } else {
      console.log("[TaskManagement] Adım 3: Görev başarıyla eklendi. Form sıfırlanıyor ve görev listesi yenileniyor.");
      showSuccess('Görev başarıyla eklendi.');
      resetForm();
      fetchTasks();
    }
  };

  const handleTaskClick = (task: Task) => {
    console.log(`[TaskManagement] Göreve tıklandı:`, task);
    if (task.status === 'pending_approval' || task.status === 'pending') {
      setTaskToUpdate(task);
      if (task.task_type === 'soru_cozumu') {
        console.log("[TaskManagement] Görev türü 'Soru Çözümü'. Puan giriş ekranı açılıyor.");
        setScoreData({ correct: '', empty: '', wrong: '' });
        setScoreEntryOpen(true);
      } else {
        console.log("[TaskManagement] Görev türü 'Konu Anlatımı'. Basit onay/red ekranı açılıyor.");
        setSimpleApprovalOpen(true);
      }
    } else {
      console.log(`[TaskManagement] Tıklanan görevin durumu '${task.status}', işlem yapılmadı.`);
    }
  };

  const handleSimpleApproval = async (newStatus: 'completed' | 'not_completed') => {
    if (!taskToUpdate) return;
    console.log(`[TaskManagement] Basit onay işlemi: Görev ID ${taskToUpdate.id}, Yeni Durum: ${newStatus}`);
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskToUpdate.id);

    if (error) {
      console.error("[TaskManagement] HATA: Basit onay/red işlemi sırasında veritabanı hatası.", error);
      showError('Görev güncellenirken bir hata oluştu.');
    } else {
      console.log("[TaskManagement] Başarılı: Görev durumu güncellendi. Liste yenileniyor.");
      showSuccess(newStatus === 'completed' ? 'Görev onaylandı.' : 'Görev reddedildi.');
      fetchTasks();
    }
    setSimpleApprovalOpen(false);
    setTaskToUpdate(null);
  };

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToUpdate || !taskToUpdate.question_count) return;
    console.log("[TaskManagement] Adım 1: Puan giriş formu gönderildi. Görev:", taskToUpdate);

    const correct = Number(scoreData.correct) || 0;
    const empty = Number(scoreData.empty) || 0;
    const wrong = Number(scoreData.wrong) || 0;
    const total = correct + empty + wrong;
    console.log(`[TaskManagement] Adım 2: Girilen değerler - Doğru: ${correct}, Yanlış: ${wrong}, Boş: ${empty}, Toplam: ${total}`);

    if (total > taskToUpdate.question_count) {
      console.warn(`[TaskManagement] UYARI: Doğrulama hatası. Toplam (${total}) > Soru Sayısı (${taskToUpdate.question_count})`);
      showError(t('coach.scoreEntry.validationError', { count: taskToUpdate.question_count }));
      return;
    }
    console.log("[TaskManagement] Adım 3: Doğrulama başarılı.");

    const updateData = { 
      status: 'completed',
      correct_count: correct,
      empty_count: empty,
      wrong_count: wrong,
    };
    console.log("[TaskManagement] Adım 4: Veritabanına gönderilecek güncelleme verisi:", updateData);

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskToUpdate.id);

    if (error) {
      console.error("[TaskManagement] HATA: Puanlar kaydedilirken veritabanı hatası.", error);
      showError('Görev güncellenirken bir hata oluştu.');
    } else {
      console.log("[TaskManagement] Adım 5: Puanlar başarıyla kaydedildi ve görev onaylandı. Liste yenileniyor.");
      showSuccess('Görev onaylandı ve puanlar kaydedildi.');
      fetchTasks();
    }
    setScoreEntryOpen(false);
    setTaskToUpdate(null);
  };
  
  const handleRejectTaskFromScoreDialog = async () => {
    if (!taskToUpdate) return;
    console.log(`[TaskManagement] Puan giriş ekranından görev reddedildi. Görev ID: ${taskToUpdate.id}`);
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'not_completed' })
      .eq('id', taskToUpdate.id);

    if (error) {
      console.error("[TaskManagement] HATA: Puan ekranından reddetme işlemi sırasında veritabanı hatası.", error);
      showError('Görev güncellenirken bir hata oluştu.');
    } else {
      console.log("[TaskManagement] Başarılı: Görev reddedildi. Liste yenileniyor.");
      showSuccess('Görev reddedildi.');
      fetchTasks();
    }
    setScoreEntryOpen(false);
    setTaskToUpdate(null);
  };

  const handleOpenDeleteDialog = (task: Task) => {
    console.log("[TaskManagement] Görev silme onayı isteniyor. Görev:", task);
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    console.log("[TaskManagement] Adım 1: Görev silme onaylandı. Silinecek Görev ID:", taskToDelete.id);
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskToDelete.id);

    if (error) {
      console.error("[TaskManagement] HATA: Görev silinirken veritabanı hatası.", error);
      showError(t('coach.deleteTask.error'));
    } else {
      console.log("[TaskManagement] Adım 2: Görev başarıyla silindi. Liste yenileniyor.");
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

  const topicAssignmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach(task => {
        counts.set(task.topic, (counts.get(task.topic) || 0) + 1);
    });
    return counts;
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
    console.log("[Analytics] Adım 1: Analitik verileri yeniden hesaplanıyor.");
    const questionTasks = tasks.filter(task => 
      task.task_type === 'soru_cozumu' && 
      task.status === 'completed' &&
      task.correct_count != null &&
      task.empty_count != null &&
      task.wrong_count != null
    );
    console.log("[Analytics] Adım 2: Grafik için filtrelenmiş görevler:", questionTasks);

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
    console.log("[Analytics] Adım 3: Konulara göre gruplanmış ham veriler:", dataBySubject);

    const finalData = Object.entries(dataBySubject).map(([subject, topics]) => ({
      subject,
      data: Object.entries(topics).map(([topic, counts]) => ({
        topic,
        ...counts,
        net: (counts.correct - counts.wrong / 3).toFixed(2),
      })),
    }));
    console.log("[Analytics] Adım 4: Grafik için işlenmiş nihai veri:", finalData);
    return finalData;
  }, [tasks]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900/30';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'not_completed': return 'bg-red-100 dark:bg-red-900/30';
      case 'pending_approval': return 'bg-blue-100 dark:bg-blue-900/30';
      default: return 'bg-secondary';
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

  const tasksAwaitingApproval = tasks.filter(t => t.status === 'pending_approval');
  const otherTasks = tasks.filter(t => t.status !== 'pending_approval');

  if (!student) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('coach.taskManagementTitle', { firstName: student.first_name, lastName: student.last_name })}</DialogTitle>
            <DialogDescription>{t('coach.taskManagementDescription')}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="addTask" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="shrink-0 grid w-full grid-cols-3">
              <TabsTrigger value="addTask">{t('coach.addNewTaskTab')}</TabsTrigger>
              <TabsTrigger value="taskHistory">{t('coach.taskHistory')}</TabsTrigger>
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
                                  <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}><SelectTrigger><SelectValue placeholder={t('coach.selectTopicPlaceholder')} /></SelectTrigger><SelectContent>{availableTopics.map(topic => (<SelectItem key={topic} value={topic}><div className="flex items-center justify-between w-full"><span>{topic}</span><div className="flex items-center gap-1">{Array.from({ length: topicAssignmentCounts.get(topic) || 0 }).map((_, i) => (<CheckCircle2 key={i} className="h-4 w-4 text-green-500" />))}</div></div></SelectItem>))}</SelectContent></Select>
                              </div>
                          </div>
                          {selectedTopic && (<div className="space-y-6"><div className="space-y-2"><h3 className="font-semibold">{t('coach.selectTaskType')}</h3><RadioGroup value={taskType} onValueChange={(v: 'konu_anlatimi' | 'soru_cozumu') => setTaskType(v)}><div className="flex items-center space-x-2"><RadioGroupItem value="konu_anlatimi" id="r1" /><Label htmlFor="r1">{t('coach.topicExplanation')}</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="soru_cozumu" id="r2" /><Label htmlFor="r2">{t('coach.questionSolving')}</Label></div></RadioGroup></div>{taskType === 'soru_cozumu' && (<div className="space-y-2"><Label htmlFor="question-count">{t('coach.questionCount')}</Label><NumberInput value={questionCount} onChange={setQuestionCount} required /></div>)}<div className="space-y-2"><Label htmlFor="description">{t('coach.taskDescriptionLabel')}</Label><Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Öğrenciye not..." /></div></div>)}
                      </div>
                  </form>
                  <div className="space-y-4 flex flex-col overflow-hidden">
                      <h3 className="font-semibold">{t('coach.assignedTasks')}</h3>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-2 border rounded-md p-2">
                      {loading ? <Skeleton className="h-20 w-full" /> : (
                        <>
                          {tasks.map(task => {
                            const isAwaitingApproval = task.status === 'pending_approval';
                            const isPending = task.status === 'pending';
                            const isClickable = isAwaitingApproval || isPending;

                            return (
                              <div key={task.id} className={`flex items-center justify-between p-3 rounded-md ${getStatusClass(task.status)}`}>
                                <div 
                                  onClick={() => isClickable && handleTaskClick(task)} 
                                  className={`flex-grow flex items-center gap-2 ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}`}
                                >
                                  {isAwaitingApproval && <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />}
                                  <div>
                                    <p className="font-bold">{`${task.subject}: ${task.topic}`}</p>
                                    <p className="text-xs font-semibold mt-1 capitalize">{t(getStatusTranslationKey(task.status))}</p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="icon" className="ml-2 shrink-0" onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(task); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            );
                          })}
                          {tasks.length === 0 && <p className="text-center text-muted-foreground py-4">{t('coach.noAssignedTasks')}</p>}
                        </>
                      )}
                      </div>
                  </div>
              </div>
            </TabsContent>
            <TabsContent value="taskHistory" className="flex-1 overflow-y-auto p-4">
              {loading ? <Skeleton className="h-full w-full" /> : Object.keys(groupedTasks).length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{Object.entries(groupedTasks).map(([subject, subjectTasks]) => (<Card key={subject}><CardHeader><CardTitle>{subject}</CardTitle></CardHeader><CardContent className="space-y-3">{subjectTasks.map(task => (<div key={task.id} className={`p-3 rounded-md text-sm ${getStatusClass(task.status)}`}><p className="font-semibold">{formatTaskTitle(task)}</p>{task.description && <p className="text-xs text-muted-foreground italic mt-1">"{task.description}"</p>}<div className="flex items-center justify-between mt-2 pt-2 border-t"><Badge variant="outline" className={getStatusBadgeClass(task.status)}>{t(getStatusTranslationKey(task.status))}</Badge><span className="text-xs text-muted-foreground">{new Date(task.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></div></div>))}</CardContent></Card>))}</div>) : (<p className="text-center text-muted-foreground py-10">{t('coach.noAssignedTasks')}</p>)}
            </TabsContent>
            <TabsContent value="analytics" className="flex-1 overflow-y-auto p-4">
              {loading ? <Skeleton className="h-full w-full" /> : analyticsData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {analyticsData.map(({ subject, data }) => (
                    <Card key={subject}>
                      <CardHeader><CardTitle>{subject}</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="topic" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="correct" stackId="a" fill="#22c55e" name={t('coach.scoreEntry.correct')} />
                            <Bar dataKey="wrong" stackId="a" fill="#ef4444" name={t('coach.scoreEntry.wrong')} />
                            <Bar dataKey="empty" stackId="a" fill="#3b82f6" name={t('coach.scoreEntry.empty')}>
                                <LabelList dataKey="net" position="center" fill="#ffffff" fontWeight="bold" formatter={(value: number) => `Net: ${value}`} />
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
            <Button type="submit" form="add-task-form" disabled={isSubmitDisabled}>{t('coach.addTaskButton')}</Button>
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