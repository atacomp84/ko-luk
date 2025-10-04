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
import { Trash2, Book, Calculator, FlaskConical, Globe, Palette, MessageSquare, History, Youtube, ChevronsDownUp, BookMarked, ClipboardList, BookOpen, Download, HelpCircle, CheckCircle2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { startOfWeek, format, isWithinInterval, subDays, subMonths } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { generateWordReport } from '@/lib/reportGenerator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'all';

const getSubjectIconComponent = (subject: string): React.ElementType => {
    switch (subject) {
        case "Kitap Okuma": return BookOpen;
        case "Türkçe": return Book;
        case "Matematik": return Calculator;
        case "Fen Bilimleri": return FlaskConical;
        case "T.C. İnkılap Tarihi ve Atatürkçülük": return History;
        case "Din Kültürü ve Ahlak Bilgisi": return MessageSquare;
        case "İngilizce": return Globe;
        default: return Palette;
    }
};

const getSubjectColorClass = (subject: string): string => {
    switch (subject) {
        case "Kitap Okuma": return "text-orange-500";
        case "Türkçe": return "text-blue-500";
        case "Matematik": return "text-green-500";
        case "Fen Bilimleri": return "text-purple-500";
        case "T.C. İnkılap Tarihi ve Atatürkçülük": return "text-red-500";
        case "Din Kültürü ve Ahlak Bilgisi": return "text-yellow-500";
        case "İngilizce": return "text-indigo-500";
        default: return "text-gray-500";
    }
};

const topicColors = [
  "text-sky-500", "text-emerald-500", "text-violet-500", "text-fuchsia-500",
  "text-cyan-500", "text-rose-500", "text-indigo-500", "text-teal-500",
];

const getTopicColorClass = (index: number): string => {
  if (index < 0) return "text-foreground";
  return topicColors[index % topicColors.length];
};

const getInitials = (firstName = '', lastName = '') => {
    const firstInitial = firstName ? firstName[0] : '';
    const lastInitial = lastName ? lastName[0] : '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
};

const CustomizedAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const value = payload.value as string;
    
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={5} textAnchor="end" fill="hsl(var(--foreground))" fontSize={13} fontWeight="bold" transform="rotate(-65)">
                {value}
            </text>
        </g>
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
  const [openCollapsibles, setOpenCollapsibles] = useState<string[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('weekly');
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);

  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'tr' ? tr : enUS;

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

  useEffect(() => {
    setOpenCollapsibles(Object.keys(groupedTasks));
  }, [groupedTasks]);

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
    
    const isReadingTask = selectedSubject === 'Kitap Okuma';

    if (!isReadingTask && taskType === 'soru_cozumu' && (questionCount === '' || Number(questionCount) <= 0)) {
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
      task_type: isReadingTask ? 'kitap_okuma' : taskType,
      description: (isReadingTask || taskType === 'konu_anlatimi') ? (description || null) : null,
      question_count: !isReadingTask && taskType === 'soru_cozumu' ? Number(questionCount) : null,
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
    if (task.subject === 'Kitap Okuma') {
        let title = `${task.subject}: ${task.topic}`;
        if (task.description) {
            title += ` (${task.description})`;
        }
        return title;
    }
    let title = `${task.topic}`;
    if (task.task_type === 'soru_cozumu' && task.question_count) {
      title += ` (${task.question_count} ${t('coach.questionSolving')})`;
    } else {
      title += ` (${t('coach.topicExplanation')})`;
    }
    return title;
  };

  const topicAssignmentStats = useMemo(() => {
    const stats: Record<string, { explanations: number; questions: number; readings: number }> = {};
    tasks.forEach(task => {
        if (!stats[task.topic]) {
            stats[task.topic] = { explanations: 0, questions: 0, readings: 0 };
        }
        if (task.task_type === 'konu_anlatimi') {
            stats[task.topic].explanations += 1;
        } else if (task.task_type === 'soru_cozumu' && task.question_count) {
            stats[task.topic].questions += task.question_count;
        } else if (task.task_type === 'kitap_okuma') {
            stats[task.topic].readings += 1;
        }
    });
    return stats;
  }, [tasks]);

  const isSubmitDisabled = !selectedTopic || (selectedSubject !== 'Kitap Okuma' && taskType === 'soru_cozumu' && (questionCount === '' || Number(questionCount) <= 0));

  const filteredTasks = useMemo(() => {
    const now = new Date();
    if (timePeriod === 'daily') {
      const yesterday = subDays(now, 1);
      return tasks.filter(task => isWithinInterval(new Date(task.created_at), { start: yesterday, end: now }));
    }
    if (timePeriod === 'weekly') {
      const lastWeek = subDays(now, 7);
      return tasks.filter(task => isWithinInterval(new Date(task.created_at), { start: lastWeek, end: now }));
    }
    if (timePeriod === 'monthly') {
      const lastMonth = subMonths(now, 1);
      return tasks.filter(task => isWithinInterval(new Date(task.created_at), { start: lastMonth, end: now }));
    }
    return tasks;
  }, [tasks, timePeriod]);

  const analyticsData = useMemo(() => {
    const questionTasks = filteredTasks.filter(task => 
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

    return Object.entries(dataBySubject).map(([subject, topics]) => ({
      subject,
      data: Object.entries(topics).map(([topic, counts]) => {
        const total = counts.correct + counts.wrong + counts.empty;
        return {
          topic,
          ...counts,
          total,
          net: (counts.correct - counts.wrong / 3),
        };
      }),
    }));
  }, [filteredTasks]);

  const readingAnalyticsData = useMemo(() => {
    const readingTasks = filteredTasks.filter(task => 
      task.subject === 'Kitap Okuma' && 
      task.status === 'completed'
    );

    const weekStarts = [...new Set(readingTasks.map(t => startOfWeek(new Date(t.created_at), { locale: dateLocale }).getTime()))].sort();
    const weekMap = new Map(weekStarts.map((ws, i) => [ws, `${i + 1}. ${t('student.week', 'Hafta')}`]));

    const dataByWeek = readingTasks.reduce((acc, task) => {
      const weekStartTimestamp = startOfWeek(new Date(task.created_at), { locale: dateLocale }).getTime();
      const weekLabel = weekMap.get(weekStartTimestamp) || '';
      const pages = parseInt(task.topic, 10) || 0;
      
      if (!acc[weekLabel]) {
        acc[weekLabel] = 0;
      }
      acc[weekLabel] += pages;
      
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(dataByWeek)
      .map(([week, pages]) => ({ week, pages }));
  }, [filteredTasks, dateLocale, t]);

  useEffect(() => {
    const defaultOpen = analyticsData.map(d => d.subject);
    if (readingAnalyticsData.length > 0) {
        defaultOpen.push('kitap-okuma');
    }
    setOpenAccordions(defaultOpen);
  }, [analyticsData, readingAnalyticsData]);

  const handleGenerateReport = () => {
    if (!student) return;
    const timePeriodText = t(`coach.timeFilters.${timePeriod}`);
    generateWordReport(
      `${student.first_name} ${student.last_name}`,
      timePeriodText,
      analyticsData,
      readingAnalyticsData
    );
  };

  const getStatusBorderClass = (status: string) => {
    switch (status) {
      case 'completed': return 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'pending':
      case 'pending_approval': return 'border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'not_completed': return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20';
      default: return '';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'completed') return 'bg-green-200 text-green-800 dark:bg-green-800/30 dark:text-green-200';
    if (status === 'not_completed') return 'bg-red-200 text-red-800 dark:bg-red-800/30 dark:text-red-200';
    if (status === 'pending_approval' || status === 'pending') return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200';
    return 'bg-gray-200 text-gray-800 dark:bg-gray-800/30 dark:text-gray-200';
  };

  const getStatusTranslationKey = (status: string) => {
    if (status === 'completed') return 'coach.statusCompleted';
    if (status === 'not_completed') return 'coach.statusNotCompleted';
    if (status === 'pending_approval') return 'coach.statusPendingApproval';
    return 'coach.statusPending';
  };

  const getTaskTypeIcon = (task: Task): ReactNode => {
    const baseClasses = "h-10 w-10 rounded-md flex items-center justify-center";
    const iconClasses = "h-5 w-5";

    if (task.task_type === 'soru_cozumu') {
        return <div className={`${baseClasses} bg-green-100 dark:bg-green-900/20`}>
            <HelpCircle className={`${iconClasses} text-green-600 dark:text-green-400`} />
        </div>;
    }
    return <div className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/20`}>
        <BookOpen className={`${iconClasses} text-yellow-600 dark:text-yellow-400`} />
    </div>;
  }

  if (!student) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6">
            <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                        {getInitials(student.first_name, student.last_name)}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <DialogTitle className="text-xl font-bold tracking-tight">
                        {`${student.first_name?.toUpperCase()} ${student.last_name?.toUpperCase()}`} için Görev Yönetimi
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1">{t('coach.taskManagementDescription')}</DialogDescription>
                </div>
            </div>
          </DialogHeader>
          <div className="px-6 mt-4">
            <Tabs defaultValue="addTask" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-lg h-auto">
                    <TabsTrigger value="addTask" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md py-2">{t('coach.addNewTaskTab')}</TabsTrigger>
                    <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md py-2">{t('coach.analytics')}</TabsTrigger>
                </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 overflow-hidden mt-4">
            <Tabs value={activeTab} className="h-full">
                <TabsContent value="addTask" className="h-full overflow-hidden">
                <div className="grid md:grid-cols-2 gap-6 px-6 py-4 h-full">
                    <form id="add-task-form" onSubmit={handleAddTask} className="flex flex-col h-full">
                        <div className="flex-1 space-y-6 overflow-y-auto pr-4 pb-4">
                            <div className="space-y-2">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <BookMarked className="h-5 w-5 text-primary" />
                                    {t('coach.selectTopic')}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                        <SelectTrigger><SelectValue placeholder={t('coach.selectSubjectPlaceholder')} /></SelectTrigger>
                                        <SelectContent>{lgsSubjects.map(subject => {
                                            const Icon = getSubjectIconComponent(subject.name);
                                            const colorClass = getSubjectColorClass(subject.name);
                                            return (<SelectItem key={subject.name} value={subject.name}>
                                                <div className="flex items-center gap-2">
                                                    <Icon className={`h-5 w-5 ${colorClass}`} />
                                                    <span className={colorClass}>{subject.name}</span>
                                                </div>
                                            </SelectItem>)
                                        })}</SelectContent>
                                    </Select>
                                    <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={!selectedSubject}>
                                        <SelectTrigger>
                                            {selectedTopic ? (
                                                <span className={`font-medium ${getTopicColorClass(availableTopics.indexOf(selectedTopic))}`}>
                                                    {selectedTopic}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    {selectedSubject === 'Kitap Okuma' 
                                                        ? t('coach.selectPageCountPlaceholder', 'Sayfa Sayısı Seçin') 
                                                        : t('coach.selectTopicPlaceholder')}
                                                </span>
                                            )}
                                        </SelectTrigger>
                                        <SelectContent>{availableTopics.map((topic, index) => (
                                            <SelectItem key={topic} value={topic}>
                                                <div className="flex items-center justify-between w-full">
                                                    <span className={`font-medium ${getTopicColorClass(index)}`}>{topic}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        {topicAssignmentStats[topic]?.explanations > 0 && <Badge variant="outline" className="bg-blue-100 text-blue-700">{topicAssignmentStats[topic].explanations} Anlatım</Badge>}
                                                        {topicAssignmentStats[topic]?.questions > 0 && <Badge variant="outline" className="bg-purple-100 text-purple-700">{topicAssignmentStats[topic].questions} Soru</Badge>}
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        ))}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {selectedTopic && (
                                selectedSubject === 'Kitap Okuma' ? (
                                    <div className="space-y-2 pt-6">
                                        <Label htmlFor="description">{t('coach.bookTitleLabel')}</Label>
                                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Okunacak kitabın adı..." />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <h3 className="font-semibold">{t('coach.selectTaskType')}</h3>
                                            <RadioGroup value={taskType} onValueChange={(v: 'konu_anlatimi' | 'soru_cozumu') => setTaskType(v)}>
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="konu_anlatimi" id="r1" /><Label htmlFor="r1">{t('coach.topicExplanation')}</Label></div>
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="soru_cozumu" id="r2" /><Label htmlFor="r2">{t('coach.questionSolving')}</Label></div>
                                            </RadioGroup>
                                        </div>
                                        {taskType === 'soru_cozumu' && (<div className="space-y-2"><Label htmlFor="question-count">{t('coach.questionCount')}</Label><NumberInput value={questionCount} onChange={setQuestionCount} required /></div>)}
                                        {taskType === 'konu_anlatimi' && (<div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="description">{t('coach.taskDescriptionLabel')}</Label><Button asChild variant="ghost" size="icon"><a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer"><Youtube className="h-5 w-5 text-red-500" /></a></Button></div><Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Öğrenciye not veya video linki..." /></div>)}
                                    </div>
                                )
                            )}
                        </div>
                    </form>
                    <div className="space-y-4 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-primary" />
                                {t('coach.assignedTasks')}
                            </h3>
                            <Button variant="ghost" size="icon" onClick={() => setOpenCollapsibles([])}>
                                <ChevronsDownUp className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {loading ? <Skeleton className="h-24 w-full" /> : Object.keys(groupedTasks).length > 0 ? (
                            Object.entries(groupedTasks).map(([subject, subjectTasks]) => {
                            const pendingCount = subjectTasks.filter(t => t.status === 'pending' || t.status === 'pending_approval').length;
                            const completedCount = subjectTasks.filter(t => t.status === 'completed').length;
                            const Icon = getSubjectIconComponent(subject);
                            const colorClass = getSubjectColorClass(subject);
                            return (
                                <Collapsible key={subject} open={openCollapsibles.includes(subject)} onOpenChange={(isOpen) => setOpenCollapsibles(prev => isOpen ? [...prev, subject] : prev.filter(s => s !== subject))} className="space-y-2">
                                <CollapsibleTrigger className="flex justify-between items-center w-full p-2 bg-muted rounded-md">
                                    <div className="flex items-center gap-2">
                                        <Icon className={`h-5 w-5 ${colorClass}`} />
                                        <span className="font-bold">{subject}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-mono text-xs">
                                        {pendingCount > 0 && <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400 rounded-full h-5 w-5 flex items-center justify-center p-0">{pendingCount}</Badge>}
                                        {completedCount > 0 && <Badge className="bg-green-500 text-white hover:bg-green-500 rounded-full h-5 w-5 flex items-center justify-center p-0">{completedCount}</Badge>}
                                    </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-2 pl-4 pt-2">
                                    {subjectTasks.map(task => (
                                    <Card key={task.id} className={`cursor-pointer hover:shadow-md transition-shadow rounded-lg ${getStatusBorderClass(task.status)}`} onClick={() => handleTaskClick(task)}>
                                        <CardContent className="p-3 flex items-center gap-4">
                                            {getTaskTypeIcon(task)}
                                            <div className="flex-grow">
                                                <p className="font-semibold">{formatTaskTitle(task)}</p>
                                                <Badge className={`mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border-0 ${getStatusBadgeClass(task.status)}`}>
                                                    {t(getStatusTranslationKey(task.status))}
                                                </Badge>
                                            </div>
                                            <Button variant="ghost" size="icon" className="ml-2 shrink-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(task); }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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
                <TabsContent value="analytics" className="h-full overflow-y-auto p-6 space-y-4">
                <Tabs defaultValue="weekly" onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
                    <div className="flex justify-between items-center">
                    <TabsList>
                        <TabsTrigger value="daily">{t('coach.timeFilters.daily')}</TabsTrigger>
                        <TabsTrigger value="weekly">{t('coach.timeFilters.weekly')}</TabsTrigger>
                        <TabsTrigger value="monthly">{t('coach.timeFilters.monthly')}</TabsTrigger>
                        <TabsTrigger value="all">{t('coach.timeFilters.all')}</TabsTrigger>
                    </TabsList>
                    <div className="flex items-center gap-2">
                        <Button onClick={handleGenerateReport}>
                        <Download className="mr-2 h-4 w-4" />
                        {t('coach.getReport')}
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setOpenAccordions([])}>
                            <ChevronsDownUp className="h-4 w-4" />
                        </Button>
                    </div>
                    </div>
                    <div className="mt-4">
                    {loading ? <Skeleton className="h-full w-full" /> : (
                        <Accordion type="multiple" value={openAccordions} onValueChange={setOpenAccordions} className="w-full space-y-2">
                        {readingAnalyticsData.length > 0 && (
                            <AccordionItem value="kitap-okuma" className="border rounded-md px-4">
                                <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-6 w-6 text-orange-500" />
                                        <span className="font-bold text-lg">Kitap Okuma Performansı</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={readingAnalyticsData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="week" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="pages" fill="#f97316" name="Okunan Sayfa">
                                            <LabelList dataKey="pages" position="top" />
                                        </Bar>
                                    </BarChart>
                                    </ResponsiveContainer>
                                </AccordionContent>
                            </AccordionItem>
                        )}
                        {analyticsData.length > 0 ? (
                            analyticsData.map(({ subject, data }) => {
                                const Icon = getSubjectIconComponent(subject);
                                const colorClass = getSubjectColorClass(subject);
                                return (
                                <AccordionItem value={subject} key={subject} className="border rounded-md px-4">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            <Icon className={`h-6 w-6 ${colorClass}`} />
                                            <span className="font-bold text-lg">{subject}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 80 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="topic" height={100} interval={0} tick={<CustomizedAxisTick />} axisLine={false} tickLine={false} />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="correct" stackId="a" fill="#22c55e" name={t('coach.scoreEntry.correct')} />
                                            <Bar dataKey="wrong" stackId="a" fill="#ef4444" name={t('coach.scoreEntry.wrong')} />
                                            <Bar dataKey="empty" stackId="a" fill="#3b82f6" name={t('coach.scoreEntry.empty')}>
                                                <LabelList dataKey="net" position="top" offset={5} fill="hsl(var(--foreground))" fontSize={12} fontWeight="bold" formatter={(value: number) => `Net: ${value.toFixed(2)}`} />
                                            </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </AccordionContent>
                                </AccordionItem>
                            )})
                        ) : readingAnalyticsData.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10">{t('coach.noTasksForChart')}</div>
                        ) : null}
                        </Accordion>
                    )}
                    </div>
                </Tabs>
                </TabsContent>
            </Tabs>
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 border-t">
            <DialogClose asChild><Button type="button" variant="outline" onClick={onClose}>{t('coach.close')}</Button></DialogClose>
            {activeTab === 'addTask' && (
              <Button type="submit" form="add-task-form" disabled={isSubmitDisabled}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {t('coach.addTaskButton')}
              </Button>
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