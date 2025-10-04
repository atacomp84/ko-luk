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
import { Trash2, ClipboardList, Gift, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
  
    handleCloseDeleteDialog();
  
    const { error } = await supabase.functions.invoke('delete-student', {
      body: { student_id: studentToDelete.id },
    });
  
    if (error) {
      showError(t('coach.deleteStudent.error'));
    } else {
      showSuccess(t('coach.deleteStudent.success'));
      fetchStudents();
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
          <Button onClick={() => setAddStudentOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('coach.addStudent')}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : students.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <Card key={student.id} className="flex flex-col justify-between">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {student.first_name?.[0]?.toUpperCase()}
                        {student.last_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">{student.first_name} {student.last_name}</span>
                  </CardContent>
                  <div className="grid grid-cols-3 gap-1 p-2 border-t bg-muted/50">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenTaskManagement(student)} className="flex flex-col h-auto gap-1">
                        <ClipboardList className="h-4 w-4" />
                        <span className="text-xs">{t('coach.manageTasks')}</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenRewardManagement(student)} className="flex flex-col h-auto gap-1">
                        <Gift className="h-4 w-4" />
                        <span className="text-xs">{t('coach.sendReward')}</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDeleteDialog(student)} className="flex flex-col h-auto gap-1 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="text-xs">{t('coach.deleteTask.confirm')}</span>
                      </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">{t('coach.noStudents')}</p>
            </div>
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