import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
    if (!isOpen) return;

    const fetchUnassignedStudents = async () => {
      setLoading(true);
      try {
        // 1. Get all student IDs that are already assigned to a coach.
        const { data: assignedPairs, error: pairsError } = await supabase
          .from('coach_student_pairs')
          .select('student_id');

        if (pairsError) throw pairsError;

        const assignedStudentIds = assignedPairs.map(pair => pair.student_id);

        // 2. Get all profiles with the 'student' role.
        let query = supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('role', 'student');

        // 3. Filter out the students who are already assigned.
        if (assignedStudentIds.length > 0) {
          query = query.not('id', 'in', `(${assignedStudentIds.join(',')})`);
        }

        const { data: unassignedStudentsData, error: studentsError } = await query;

        if (studentsError) throw studentsError;

        setUnassignedStudents(unassignedStudentsData as Student[]);
      } catch (error: any) {
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
  };

  const handleAddStudents = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || selectedStudents.length === 0) return;

    const pairsToInsert = selectedStudents.map(student_id => ({
      coach_id: user.id,
      student_id,
    }));

    const { error } = await supabase.from('coach_student_pairs').insert(pairsToInsert);

    if (error) {
      showError('Öğrenciler eklenirken bir hata oluştu.');
    } else {
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