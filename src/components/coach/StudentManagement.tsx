import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AddStudentDialog } from './AddStudentDialog';
import { TaskManagementDialog } from './TaskManagementDialog';
import { RewardManagementDialog } from './RewardManagementDialog';
import { DeleteStudentDialog } from './DeleteStudentDialog';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

const StudentManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddStudentOpen, setAddStudentOpen] = useState(false);
  const [isTaskManagementOpen, setTaskManagementOpen] = useState(false);
  const [isRewardManagementOpen, setRewardManagementOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const { t } = useTranslation();

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: pairs, error: pairsError } = await supabase
      .from('coach_student_pairs')
      .select('student_id')
      .eq('coach_id', user.id);

    if (pairsError) {
      showError('Öğrenci listesi getirilirken bir hata oluştu.');
      setStudents([]);
      setLoading(false);
      return;
    }

    const studentIds = pairs.map(p => p.student_id);

    if (studentIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', studentIds);

      if (profilesError) {
        showError('Öğrenci profilleri getirilirken bir hata oluştu.');
        setStudents([]);
      } else {
        setStudents(profiles as Student[]);
      }
    } else {
      setStudents([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleOpenTaskManagement = (student: Student) => {
    setSelectedStudent(student);
    setTaskManagementOpen(true);
  };

  const handleOpenRewardManagement = (student: Student) => {
    setSelectedStudent(student);
    setRewardManagementOpen(true);
  };

  const handleOpenDeleteDialog = (student: Student) => {
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setStudentToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('coach_student_pairs')
      .delete()
      .match({ coach_id: user.id, student_id: studentToDelete.id });

    if (error) {
      console.error("Öğrenci-koç eşleşmesi silinirken hata:", error);
      showError(t('coach.deleteStudent.error'));
    } else {
      showSuccess(t('coach.deleteStudent.success'));
      // Arayüzü anında güncellemek için öğrenciyi yerel state'den kaldır
      setStudents(prevStudents => prevStudents.filter(student => student.id !== studentToDelete.id));
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('coach.myStudents')}</CardTitle>
            <CardDescription>{t('coach.myStudentsDescription')}</CardDescription>
          </div>
          <Button onClick={() => setAddStudentOpen(true)}>{t('coach.addStudent')}</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : students.length > 0 ? (
            <ul className="space-y-2">
              {students.map((student) => (
                <li key={student.id} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                  <span>{student.first_name} {student.last_name}</span>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenTaskManagement(student)}>
                      {t('coach.manageTasks')}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleOpenRewardManagement(student)}>
                      {t('coach.sendReward')}
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleOpenDeleteDialog(student)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground py-4">{t('coach.noStudents')}</p>
          )}
        </CardContent>
      </Card>
      <AddStudentDialog 
        isOpen={isAddStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        onStudentAdded={fetchStudents}
      />
      <TaskManagementDialog
        student={selectedStudent}
        isOpen={isTaskManagementOpen}
        onClose={() => setTaskManagementOpen(false)}
      />
      <RewardManagementDialog
        student={selectedStudent}
        isOpen={isRewardManagementOpen}
        onClose={() => setRewardManagementOpen(false)}
      />
      <DeleteStudentDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        student={studentToDelete}
      />
    </>
  );
};

export default StudentManagement;