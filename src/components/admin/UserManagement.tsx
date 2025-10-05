import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { User, Mail, Trash2, Edit, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/utils/toast';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { User as AuthUser } from '@supabase/supabase-js'; // AuthUser tipini içe aktar

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'student' | 'coach' | 'admin';
}

// Supabase'den gelen profil verisi için tip tanımı
interface SupabaseProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'coach' | 'admin';
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

export const UserManagement = () => {
  console.log("[UserManagement] Component rendered.");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'student' | 'coach' | 'admin'>('student');
  const { t } = useTranslation();

  const fetchUsers = useCallback(async () => {
    console.log("[UserManagement] Fetching all users.");
    setLoading(true);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role');

    if (profilesError) {
      console.error("[UserManagement] Error fetching profiles:", profilesError.message);
      showError(t('admin.userManagement.fetchError'));
      setUsers([]);
      setLoading(false);
      return;
    }

    // profiles'ın tipini SupabaseProfile[] olarak belirt
    const typedProfiles: SupabaseProfile[] = profiles as SupabaseProfile[];

    const userIds = typedProfiles.map(p => p.id);
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers();

    if (authUsersError) {
      console.error("[UserManagement] Error fetching auth users:", authUsersError.message);
      showError(t('admin.userManagement.fetchError'));
      setUsers([]);
      setLoading(false);
      return;
    }

    const combinedUsers: UserProfile[] = typedProfiles.map(profile => {
      const authUser = authUsers.users.find((u: AuthUser) => u.id === profile.id); // AuthUser tipini burada kullan
      return {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: authUser?.email || 'N/A',
        role: profile.role,
      };
    });

    setUsers(combinedUsers);
    setLoading(false);
    console.log(`[UserManagement] Fetched ${combinedUsers.length} users.`);
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditUser = (user: UserProfile) => {
    console.log("[UserManagement] Editing user:", user.id);
    setCurrentUser(user);
    setEditFirstName(user.first_name);
    setEditLastName(user.last_name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!currentUser) return;
    console.log("[UserManagement] Updating user:", currentUser.id);

    // Update profile table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ first_name: editFirstName, last_name: editLastName, role: editRole })
      .eq('id', currentUser.id);

    if (profileError) {
      console.error("[UserManagement] Error updating profile:", profileError.message);
      showError(t('admin.userManagement.updateError'));
      return;
    }

    // Update auth.users table (email)
    const { error: authError } = await supabase.auth.admin.updateUserById(currentUser.id, {
      email: editEmail,
    });

    if (authError) {
      console.error("[UserManagement] Error updating auth user:", authError.message);
      showError(t('admin.userManagement.updateError'));
      return;
    }

    showSuccess(t('admin.userManagement.updateSuccess'));
    setEditDialogOpen(false);
    fetchUsers();
    console.log("[UserManagement] User updated successfully:", currentUser.id);
  };

  const handleDeleteUser = (user: UserProfile) => {
    console.log("[UserManagement] Deleting user:", user.id);
    setCurrentUser(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!currentUser) return;
    console.log("[UserManagement] Confirming delete for user:", currentUser.id);

    // Delete user from auth.users (this should cascade delete from profiles due to foreign key)
    const { error: authError } = await supabase.auth.admin.deleteUser(currentUser.id);

    if (authError) {
      console.error("[UserManagement] Error deleting user:", authError.message);
      showError(t('admin.userManagement.deleteError'));
      return;
    }

    showSuccess(t('admin.userManagement.deleteSuccess'));
    setDeleteDialogOpen(false);
    fetchUsers();
    console.log("[UserManagement] User deleted successfully:", currentUser.id);
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
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-4">
              {users.map((user, index) => (
                <Card key={user.id} className="flex items-center p-4">
                  <Avatar className={cn("h-10 w-10", avatarColors[index % avatarColors.length])}>
                    <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 flex-1">
                    <p className="font-semibold">{user.first_name} {user.last_name} ({user.role})</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleEditUser(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteUser(user)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">{t('admin.userManagement.noUsers')}</p>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.userManagement.editUserTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name">{t('auth.firstNameLabel')}</Label>
              <Input id="edit-first-name" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last-name">{t('auth.lastNameLabel')}</Label>
              <Input id="edit-last-name" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('auth.emailLabel')}</Label>
              <Input id="edit-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">{t('auth.roleLabel')}</Label>
              <Select value={editRole} onValueChange={(value: 'student' | 'coach' | 'admin') => setEditRole(value)}>
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder={t('auth.roleLabel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{t('auth.roleStudent')}</SelectItem>
                  <SelectItem value="coach">{t('auth.roleCoach')}</SelectItem>
                  <SelectItem value="admin">{t('auth.roleAdmin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline"><X className="mr-2 h-4 w-4" />{t('coach.cancel')}</Button>
            </DialogClose>
            <Button onClick={handleUpdateUser}><Save className="mr-2 h-4 w-4" />{t('admin.userManagement.saveChanges')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.userManagement.deleteUserTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.userManagement.deleteUserDescription', { userName: `${currentUser?.first_name} ${currentUser?.last_name}` })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('coach.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="mr-2 h-4 w-4" />{t('admin.userManagement.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};