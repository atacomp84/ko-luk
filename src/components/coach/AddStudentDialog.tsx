import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError, showSuccess } from '@/utils/toast';

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentAdded: () => void;
}

const AddStudentDialog = ({ isOpen, onClose, onStudentAdded }: AddStudentDialogProps) => {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
        showError('Lütfen bir öğrenci ID girin.');
        return;
    }
    setLoading(true);

    const { data: studentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', studentId.trim())
      .single();

    if (profileError || !studentProfile) {
      showError('Öğrenci bulunamadı veya ID geçersiz.');
      setLoading(false);
      return;
    }

    if (studentProfile.role !== 'student') {
      showError('Bu kullanıcı bir öğrenci değil.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError('Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('coach_student_pairs')
      .insert({ coach_id: user.id, student_id: studentProfile.id });

    if (insertError) {
      if (insertError.code === '23505') {
        showError('Bu öğrenci zaten listenizde.');
      } else {
        showError('Öğrenci eklenirken bir hata oluştu: ' + insertError.message);
      }
    } else {
      showSuccess('Öğrenci başarıyla eklendi!');
      onStudentAdded();
      onClose();
    }

    setLoading(false);
    setStudentId('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Yeni Öğrenci Ekle</DialogTitle>
          <DialogDescription>
            Öğrencinizin size verdiği kullanıcı ID'sini girerek onu listenize ekleyin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddStudent}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="student-id" className="text-right">
                Öğrenci ID
              </Label>
              <Input
                id="student-id"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="col-span-3"
                placeholder="Öğrencinin kullanıcı ID'si"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Ekleniyor...' : 'Öğrenci Ekle'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;