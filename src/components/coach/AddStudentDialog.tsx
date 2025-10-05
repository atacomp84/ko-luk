import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface AddStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentAdded: () => void;
}

export const AddStudentDialog = ({ isOpen, onClose, onStudentAdded }: AddStudentDialogProps) => {
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) {
      console.log('[AddStudentDialog] Dialog closed, resetting selected students.');
      setSelectedStudents([]); // Diyalog kapandığında seçili öğrencileri sıfırla
      return;
    }

    const fetchUnassignedStudents = async () => {
      console.log('[AddStudentDialog] Fetching unassigned students...');
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-unassigned-students');
        if (error) {
          console.error('[AddStudentDialog] Error invoking get-unassigned-students:', error);
          throw error;
        }
        console.log('[AddStudentDialog] Fetched unassigned students:', data);
        setUnassignedStudents(data as Student[]);
      } catch (error: any) {
        console.error('[AddStudentDialog] Error fetching unassigned students:', error.message);
        showError(t('coach.fetchUnassignedError', 'Boştaki öğrenciler getirilirken bir hata oluştu.'));
        setUnassignedStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUnassignedStudents();
  }, [isOpen, t]);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
    console.log('[AddStudentDialog] Selected students updated:', selectedStudents);
  };

  const handleAddStudents = async () => {
    console.log('[AddStudentDialog] Attempting to add selected students:', selectedStudents);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || selectedStudents.length === 0) {
      console.warn('[AddStudentDialog] No user or no students selected. Aborting add operation.');
      return;
    }

    const pairsToInsert = selectedStudents.map(student_id => ({
      coach_id: user.id,
      student_id,
    }));

    console.log('[AddStudentDialog] Inserting pairs:', pairsToInsert);
    const { error } = await supabase.from('coach_student_pairs').insert(pairsToInsert);

    if (error) {
      console.error('[AddStudentDialog] Error adding students:', error.message);
      showError('Öğrenciler eklenirken bir hata oluştu.');
    } else {
      console.log('[AddStudentDialog] Students added successfully.');
      showSuccess('Öğrenciler başarıyla eklendi.');
      onStudentAdded();
      onClose();
      setSelectedStudents([]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('coach.addStudentTitle')}</DialogTitle>
          <DialogDescription>{t('coach.addStudentDescription', 'Koç atanmamış öğrencileri listenize ekleyin.')}</DialogDescription>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </>
          ) : unassignedStudents.length > 0 ? (
            unassignedStudents.map(student => (
              <div key={student.id} className="flex items-center space-x-2">
                <Checkbox
                  id={student.id}
                  onCheckedChange={() => handleSelectStudent(student.id)}
                  checked={selectedStudents.includes(student.id)}
                />
                <Label htmlFor={student.id} className="cursor-pointer">
                  {student.first_name} {student.last_name}
                </Label>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">{t('coach.noNewStudents')}</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('coach.cancel')}</Button>
          </DialogClose>
          <Button onClick={handleAddStudents} disabled={selectedStudents.length === 0}>
            {t('coach.addSelected')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};