import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { format } from 'date-fns';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface Task {
    id: string;
    title: string;
    description: string;
    due_date: string;
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const fetchTasks = async () => {
    if (!student) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      showError('Görevler getirilirken hata oluştu.');
      console.error(error);
    } else {
      setTasks(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && student) {
      fetchTasks();
    }
  }, [isOpen, student]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !title) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('tasks').insert({
      coach_id: user.id,
      student_id: student.id,
      title,
      description,
      due_date: dueDate || null,
    });

    if (error) {
      showError('Görev eklenirken bir hata oluştu.');
      console.error(error);
    } else {
      showSuccess('Görev başarıyla eklendi.');
      setTitle('');
      setDescription('');
      setDueDate('');
      fetchTasks(); // Listeyi yenile
    }
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{student.first_name} {student.last_name} - Görev Yönetimi</DialogTitle>
          <DialogDescription>Bu öğrenciye yeni görevler atayın ve mevcut görevlerini görüntüleyin.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 py-4">
            {/* Yeni Görev Formu */}
            <div className="space-y-4">
                <h3 className="font-semibold">Yeni Görev Ekle</h3>
                <form onSubmit={handleAddTask} className="space-y-4">
                    <div>
                        <Label htmlFor="title">Başlık</Label>
                        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>
                    <div>
                        <Label htmlFor="description">Açıklama</Label>
                        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="due-date">Bitiş Tarihi</Label>
                        <Input id="due-date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                    </div>
                    <Button type="submit">Görevi Ekle</Button>
                </form>
            </div>
            {/* Görev Listesi */}
            <div className="space-y-4">
                <h3 className="font-semibold">Atanmış Görevler</h3>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                {loading ? (
                    <Skeleton className="h-20 w-full" />
                ) : tasks.length > 0 ? (
                    tasks.map(task => (
                    <div key={task.id} className={`p-3 rounded-md ${task.status === 'completed' ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <p className="font-bold">{task.title}</p>
                        <p className="text-sm text-gray-600">{task.description}</p>
                        {task.due_date && <p className="text-xs text-gray-500 mt-1">Bitiş: {format(new Date(task.due_date), 'dd/MM/yyyy')}</p>}
                        <p className="text-xs font-semibold mt-1 capitalize">Durum: {task.status === 'pending' ? 'Bekliyor' : 'Tamamlandı'}</p>
                    </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 py-4">Henüz atanmış bir görev yok.</p>
                )}
                </div>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Kapat</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};