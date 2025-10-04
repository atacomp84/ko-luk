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
    console.log("[fetchStudents] Adım 1: Öğrenci listesi çekme işlemi başladı.");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("[fetchStudents] Adım 1.1: Kullanıcı bulunamadı. İşlem durduruldu.");
      setLoading(false);
      return;
    }
    console.log(`[fetchStudents] Adım 2: Mevcut koç kullanıcısı bulundu: ${user.id}`);

    const { data: pairs, error: pairsError } = await supabase
      .from('coach_student_pairs')
      .select('student_id')
      .eq('coach_id', user.id);

    if (pairsError) {
      console.error("[fetchStudents] Adım 2.1 HATA: Öğrenci-koç eşleşmeleri çekilirken hata oluştu.", pairsError);
      showError('Öğrenci listesi getirilirken bir hata oluştu.');
      setStudents([]);
      setLoading(false);
      return;
    }
    console.log("[fetchStudents] Adım 3: Öğrenci-koç eşleşmeleri başarıyla çekildi.", pairs);

    const studentIds = pairs.map(p => p.student_id);
    console.log(`[fetchStudents] Adım 4: Eşleşen öğrenci ID'leri:`, studentIds);

    if (studentIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', studentIds);

      if (profilesError) {
        console.error("[fetchStudents] Adım 4.1 HATA: Öğrenci profilleri çekilirken hata oluştu.", profilesError);
        showError('Öğrenci profilleri getirilirken bir hata oluştu.');
        setStudents([]);
      } else {
        console.log("[fetchStudents] Adım 5: Öğrenci profilleri başarıyla çekildi.", profiles);
        setStudents(profiles as Student[]);
      }
    } else {
      console.log("[fetchStudents] Adım 4.1: Koça atanmış öğrenci bulunamadı.");
      setStudents([]);
    }

    console.log("[fetchStudents] Adım 6: Öğrenci listesi çekme işlemi tamamlandı.");
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleOpenTaskManagement = (student: Student) => {
    console.log(`[handleOpenTaskManagement] Görev yönetimi penceresi açılıyor: ${student.first_name} ${student.last_name} (ID: ${student.id})`);
    setSelectedStudent(student);
    setTaskManagementOpen(true);
  };

  const handleOpenRewardManagement = (student: Student) => {
    console.log(`[handleOpenRewardManagement] Ödül yönetimi penceresi açılıyor: ${student.first_name} ${student.last_name} (ID: ${student.id})`);
    setSelectedStudent(student);
    setRewardManagementOpen(true);
  };

  const handleOpenDeleteDialog = (student: Student) => {
    console.log(`[handleOpenDeleteDialog] Öğrenci silme onayı isteniyor: ${student.first_name} ${student.last_name} (ID: ${student.id})`);
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    console.log("[handleCloseDeleteDialog] Öğrenci silme penceresi kapatıldı.");
    setDeleteDialogOpen(false);
    setStudentToDelete(null);
  };

  const handleConfirmDelete = async () => {
    console.log("[handleConfirmDelete] Adım 1: Öğrenci silme işlemi onaylandı.");
    if (!studentToDelete) {
      console.error("[handleConfirmDelete] HATA: Silinecek öğrenci bulunamadı.");
      return;
    }
    console.log(`[handleConfirmDelete] Adım 2: Silinecek öğrenci: ${studentToDelete.first_name} ${studentToDelete.last_name} (ID: ${studentToDelete.id})`);
  
    handleCloseDeleteDialog();
  
    console.log(`[handleConfirmDelete] Adım 4: 'delete-student' edge function çağrılıyor...`);
    const { error } = await supabase.functions.invoke('delete-student', {
      body: { student_id: studentToDelete.id },
    });
  
    if (error) {
      console.error("[handleConfirmDelete] Adım 4.1 HATA: Öğrenci silinirken edge function hatası oluştu:", error);
      showError(t('coach.deleteStudent.error'));
    } else {
      console.log("[handleConfirmDelete] Adım 5: Öğrenci edge function ile başarıyla silindi.");
      showSuccess(t('coach.deleteStudent.success'));
      console.log("[handleConfirmDelete] Adım 6: Arayüzü güncellemek için öğrenci listesi yeniden çekiliyor.");
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
          <Button onClick={() => {
            console.log("[AddStudent] Öğrenci ekleme penceresi açılıyor.");
            setAddStudentOpen(true);
          }}>{t('coach.addStudent')}</Button>
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
        onClose={() => {
          console.log("[AddStudent] Öğrenci ekleme penceresi kapatıldı.");
          setAddStudentOpen(false);
        }}
        onStudentAdded={fetchStudents}
      />
      <TaskManagementDialog
        student={selectedStudent}
        isOpen={isTaskManagementOpen}
        onClose={() => {
          console.log("[TaskManagement] Görev yönetimi penceresi kapatıldı.");
          setTaskManagementOpen(false);
        }}
      />
      <RewardManagementDialog
        student={selectedStudent}
        isOpen={isRewardManagementOpen}
        onClose={() => {
          console.log("[RewardManagement] Ödül yönetimi penceresi kapatıldı.");
          setRewardManagementOpen(false);
        }}
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