import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'coach' | 'admin';
  email: string;
  username?: string; // Add username
}

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUserUpdated: () => void;
}

export const EditUserDialog = ({ isOpen, onClose, user, onUserUpdated }: EditUserDialogProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState(''); // Add username state
  const [role, setRole] = useState<'student' | 'coach' | 'admin'>('student');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
      setUsername(user.username || ''); // Set username
      setRole(user.role);
      setNewPassword('');
      setError(null);
    }
  }, [user]);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          first_name: firstName, 
          last_name: lastName, 
          role: role, 
          username: username, // Update username
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.admin.updateUserById(user.id, { email });
        if (emailError) throw emailError;
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword.length < 6) {
          throw new Error(t('settings.passwordLengthError'));
        }
        const { error: passwordError } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
        if (passwordError) throw passwordError;
      }

      showSuccess(t('admin.editUser.updateSuccess'));
      onUserUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message);
      showError(t('admin.editUser.updateError', { message: err.message }));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.editUser.title', { userName: `${user.first_name} ${user.last_name}` })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpdateUser} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('auth.errorTitle')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name">{t('auth.firstNameLabel')}</Label>
              <Input id="edit-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last-name">{t('auth.lastNameLabel')}</Label>
              <Input id="edit-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-username">{t('auth.usernameLabel')}</Label> {/* New username field */}
            <Input id="edit-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">{t('auth.emailLabel')}</Label>
            <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-role">{t('auth.roleLabel')}</Label>
            <Select value={role} onValueChange={(value: 'student' | 'coach' | 'admin') => setRole(value)}>
              <SelectTrigger id="edit-role">
                <SelectValue placeholder={t('auth.roleLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">{t('auth.roleStudent')}</SelectItem>
                <SelectItem value="coach">{t('auth.roleCoach')}</SelectItem>
                <SelectItem value="admin">{t('admin.roleAdmin')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-password">{t('settings.newPasswordLabel')} ({t('admin.editUser.leaveBlankForNoChange')})</Label>
            <Input id="edit-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('settings.passwordPlaceholder')} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">{t('coach.cancel')}</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? t('settings.saving') : t('admin.editUser.saveChanges')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};