import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit, GraduationCap } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn, getInitials } from '@/lib/utils';
import { EditUserDialog } from './EditUserDialog';
import { ReassignStudentDialog } from './ReassignStudentDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'coach' | 'admin';
  email: string;
  username?: string;
}

const avatarColors = [
    "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
    "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
];

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [isReassignStudentDialogOpen, setReassignStudentDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const { t } = useTranslation();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('get-users');

    if (error) {
      showError(t('admin.userManagement.fetchError'));
      setUsers([]);
    } else {
      setUsers(data as UserProfile[]);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditUserDialogOpen(true);
  };

  const handleReassignStudent = (student: UserProfile) => {
    setSelectedUser(student);
    setReassignStudentDialogOpen(true);
  };

  const handleDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setLoading(true);
    setDeleteDialogOpen(false);

    try {
      if (userToDelete.role === 'student') {
        const { error } = await supabase.functions.invoke('delete-student', {
          body: { student_id: userToDelete.id },
        });
        if (error) throw error;
      } else if (userToDelete.role === 'coach') {
        const { error } = await supabase.functions.invoke('delete-coach', {
          body: { coach_id: userToDelete.id },
        });
        if (error) throw error;
      } else {
        throw new Error(t('admin.userManagement.adminDeleteError'));
      }
      showSuccess(t('admin.userManagement.deleteSuccess', { userName: `${userToDelete.first_name} ${userToDelete.last_name}` }));
      fetchUsers();
    } catch (error: any) {
      showError(t('admin.userManagement.deleteError', { message: error.message }));
    } finally {
      setLoading(false);
      setUserToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.userManagement.title')}</CardTitle>
          <CardDescription>{t('admin.userManagement.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : users.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user, index) => (
                <Card key={user.id} className="flex flex-col justify-between">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className={cn("font-bold", avatarColors[index % avatarColors.length])}>
                        {getInitials(user.first_name, user.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{user.first_name} {user.last_name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <Badge variant="secondary" className="mt-1">
                        {user.role === 'student' ? t('auth.roleStudent') : user.role === 'coach' ? t('auth.roleCoach') : t('admin.roleAdmin')}
                      </Badge>
                    </div>
                  </CardContent>
                  <div className="grid grid-cols-3 gap-1 p-2 border-t bg-muted/50">
                      <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)} className="flex flex-col h-auto gap-1 hover:text-blue-600 dark:hover:text-blue-400">
                        <Edit className="h-4 w-4" />
                        <span className="text-xs">{t('admin.userManagement.edit')}</span>
                      </Button>
                      {user.role === 'student' && (
                        <Button variant="ghost" size="sm" onClick={() => handleReassignStudent(user)} className="flex flex-col h-auto gap-1 hover:text-purple-600 dark:hover:text-purple-400">
                          <GraduationCap className="h-4 w-4" />
                          <span className="text-xs">{t('admin.userManagement.reassignCoach')}</span>
                        </Button>
                      )}
                      {user.role !== 'admin' && ( // Prevent deleting admin via this UI
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)} className="flex flex-col h-auto gap-1 text-red-500 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                          <span className="text-xs">{t('admin.userManagement.delete')}</span>
                        </Button>
                      )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">{t('admin.userManagement.noUsers')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <EditUserDialog
        isOpen={isEditUserDialogOpen}
        onClose={() => setEditUserDialogOpen(false)}
        user={selectedUser}
        onUserUpdated={fetchUsers}
      />
      <ReassignStudentDialog
        isOpen={isReassignStudentDialogOpen}
        onClose={() => setReassignStudentDialogOpen(false)}
        student={selectedUser}
        onStudentReassigned={fetchUsers}
      />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.userManagement.confirmDeleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.userManagement.confirmDeleteDescription', { userName: `${userToDelete?.first_name} ${userToDelete?.last_name}`, role: userToDelete?.role === 'student' ? t('auth.roleStudent') : t('auth.roleCoach') })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('coach.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('admin.userManagement.confirmDeleteButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserManagement;