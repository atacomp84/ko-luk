import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AddStudentDialog } from './AddStudentDialog';
import { TaskManagementDialog } from './TaskManagementDialog';
import { RewardManagementDialog } from './RewardManagementDialog';
import { showError } from '@/utils/toast';

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
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Adım 1: Koçun öğrenci ID'lerini al
    const { data: pairs, error: pairsError } = await supabase
      .from('coach_student_pairs')
      .select('student_id')
      .eq('coach_id', user.id);

    if (pairsError) {
      showError('Öğrenci listesi getirilirken bir hata oluştu.');
      console.error('Error fetching student pairs:', pairsError);
      setStudents([]);
      setLoading(false);
      return;
    }

    const studentIds = pairs.map(p => p.student_id);

    if (studentIds.length > 0) {
      // Adım 2: ID'leri kullanarak profil bilgilerini al
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', studentIds);

      if (profilesError) {
        showError('Öğrenci profilleri getirilirken bir hata oluştu.');
        console.error('Error fetching profiles:', profilesError);
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

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Öğrencilerim</CardTitle>
            <CardDescription>Size kayıtlı olan öğrencileri burada görebilirsiniz.</CardDescription>
          </div>
          <Button onClick={() => setAddStudentOpen(true)}>Öğrenci Ekle</Button>
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
                <li key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <span>{student.first_name} {student.last_name}</span>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenTaskManagement(student)}>
                      Görevleri Yönet
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleOpenRewardManagement(student)}>
                      Ödül Gönder
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 py-4">Henüz size kayıtlı bir öğrenci yok.</p>
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
    </>
  );
};

export default StudentManagement;