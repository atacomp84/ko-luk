import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit, GraduationCap, Shield, User, UserCog } from 'lucide-react';
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
  coach_id?: string | null;
  coach_name?: string | null;
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

const roleBorderClasses = {
  admin: "border-red-500 dark:border-red-700",
  coach: "border-blue-500 dark:border-blue-700",
  student: "border-green-500 dark:border-green-700",
};

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
    console.log('[UserManagement] Fetching all users for admin panel.');
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('get-users');

    if (error) {
      console.error('[UserManagement] Error fetching users:', error.message);
      showError(t('admin.userManagement.fetchError'));
      setUsers([]);
    } else {
      console.log(`[UserManagement] Fetched ${data.length} users.`);
      setUsers(data as UserProfile[]);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const groupedUsers = useMemo(() => {
    return users.reduce((acc, user) => {
      const role = user.role || 'student';
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(user);
      return acc;
    }, {} as Record<string, UserProfile[]>);
  }, [users]);

  const handleEditUser = (user: UserProfile) => {
    console.log('[UserManagement] Opening edit dialog for user:', user.id);
    setSelectedUser(user);
    setEditUserDialogOpen(true);
  };

  const handleReassignStudent = (student: UserProfile) => {
    console.log('[UserManagement] Opening reassign dialog for student:', student.id);
    setSelectedUser(student);
    setReassignStudentDialogOpen(true);
  };

  const handleDeleteUser = (user: UserProfile) => {
    console.log('[UserManagement] Opening delete confirmation for user:', user.id);
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
  
    console.log('[UserManagement] Confirming deletion for user:', userToDelete.id);
    setLoading(true);
    setDeleteDialogOpen(false);

    try {
      if (userToDelete.role === 'student') {
        console.log('[UserManagement] Deleting student via Edge Function:', userToDelete.id);
        const { error } = await supabase.functions.invoke('delete-student', {
          body: { student_id: userToDelete.id },
        });
        if (error) throw error;
      } else if (userToDelete.role === 'coach') {
        console.log('[UserManagement] Deleting coach via Edge Function:', userToDelete.id);
        const { error } = await supabase.functions.invoke('delete-coach', {
          body: { coach_id: userToDelete.id },
        });
        if (error) throw error;
      } else {
        console.error('[UserManagement] Attempted to delete admin user via UI. Forbidden.');
        throw new Error(t('admin.userManagement.adminDeleteError'));
      }
      showSuccess(t('admin.userManagement.deleteSuccess', { userName: `${userToDelete.first_name} ${userToDelete.last_name}` }));
      console.log('[UserManagement] User deleted successfully. Re-fetching users.');
      fetchUsers();
    } catch (error: any) {
      console.error('[UserManagement] Error during user deletion:', error.message);
      showError(t('admin.userManagement.deleteError', { message: error.message }));
    } finally {
      setLoading(false);
      setUserToDelete(null);
      console.log('[UserManagement] User deletion process finished.');
    }
  };

  const renderUserGroup = (title: string, icon: React.ReactNode, userList: UserProfile[], roleKey: 'admin' | 'coach' | 'student') => {
    if (!userList || userList.length === 0) return null;
    return (
      <div key={title} className={cn("border-2 rounded-lg p-4 mb-6", roleBorderClasses[roleKey])}> {/* Added wrapper div for the border */}
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 mt-0"> {/* Adjusted margin-top */}
          {icon}
          {title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userList.map((user, index) => (
            <Card key={user.id} className="flex flex-col justify-between"> {/* Removed individual card border */}
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar>
                  <AvatarFallback className={cn("font-bold", avatarColors[index % avatarColors.length])}>
                    {getInitials(user.first_name, user.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{user.first_name} {user.last_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  {user.role === 'student' && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <strong>{t('admin.reassignStudent.currentCoach')}:</strong> {user.coach_name || t('admin.reassignStudent.noCoachAssigned')}
                    </div>
                  )}
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
                  {user.role !== 'admin' && (
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)} className="flex flex-col h-auto gap-1 text-red-500 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                      <span className="text-xs">{t('admin.userManagement.delete')}</span>
                    </Button>
                  )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  console.log('[UserManagement] Rendering user management section.');
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
            <div>
              {renderUserGroup(t('admin.roleAdminPlural'), <Shield className="h-5 w-5 text-red-500" />, groupedUsers['admin'], 'admin')}
              {renderUserGroup(t('auth.roleCoachPlural'), <UserCog className="h-5 w-5 text-blue-500" />, groupedUsers['coach'], 'coach')}
              {renderUserGroup(t('auth.roleStudentPlural'), <User className="h-5 w-5 text-green-500" />, groupedUsers['student'], 'student')}
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