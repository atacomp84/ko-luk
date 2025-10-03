import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AddStudentDialog } from './AddStudentDialog';
import { TaskManagementDialog } from './TaskManagementDialog';
import { RewardManagementDialog } from './RewardManagementDialog'; // Yeni import

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
  const [isRewardManagementOpen, setRewardManagementOpen] = useState(false); // Yeni state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('coach_student_pairs')
        .select('profiles(id, first_name, last_name)')
        .eq('coach_id', user.id);

      if (error) {
        console.error('Öğrenciler getirilirken hata:', error);
      } else if (data) {
        const studentData = data.map(item => item.profiles as Student).filter(Boolean);
        setStudents(studentData);
      }
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

  const handleOpenRewardManagement = (student: Student) => { // Yeni fonksiyon
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