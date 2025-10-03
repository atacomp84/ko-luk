import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';

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

  useEffect(() => {
    if (isOpen) {
      const fetchUnassignedStudents = async () => {
        setLoading(true);
        
        // Akıllı Sorgu: Doğrudan hiçbir koça atanmamış öğrencileri getir.
        // coach_student_pairs!left(*) ile bir "sol birleştirme" yapıyoruz.
        // .is('coach_student_pairs.id', null) ile de eşleşmesi olmayanları (yani boşta olanları) filtreliyoruz.
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, coach_student_pairs!left(*)')
          .eq('role', 'student')
          .is('coach_student_pairs.id', null);

        if (error) {
          showError('Boştaki öğrenciler getirilirken bir hata oluştu.');
          console.error(error);
        } else {
          setUnassignedStudents(data as Student[]);
        }
        
        setLoading(false);
      };
      fetchUnassignedStudents();
    }
  }, [isOpen]);

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
      console.error(error);
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
          <DialogTitle>Öğrenci Ekle</DialogTitle>
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
            <p className="text-center text-gray-500">Eklenecek yeni öğrenci bulunamadı.</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">İptal</Button>
          </DialogClose>
          <Button onClick={handleAddStudents} disabled={selectedStudents.length === 0}>
            Seçilenleri Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};