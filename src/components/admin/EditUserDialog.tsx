import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'coach' | 'admin';
  email: string;
}

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUserUpdated: () => void;
}

export const EditUserDialog = ({ isOpen, onClose, user, onUserUpdated }: EditUserDialogProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    role: 'student' as 'student' | 'coach' | 'admin',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: 'student' | 'coach' | 'admin') => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
      })
      .eq('id', user.id);

    if (error) {
      showError(t('admin.editUser.updateError', { message: error.message }));
    } else {
      showSuccess(t('admin.editUser.updateSuccess'));
      onUserUpdated();
      onClose();
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.editUser.title', { userName: `${user.first_name} ${user.last_name}` })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">{t('auth.firstName')}</Label>
            <Input id="first_name" name="first_name" value={formData.first_name} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">{t('auth.lastName')}</Label>
            <Input id="last_name" name="last_name" value={formData.last_name} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">{t('auth.role')}</Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder={t('auth.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">{t('auth.roleStudent')}</SelectItem>
                <SelectItem value="coach">{t('auth.roleCoach')}</SelectItem>
                <SelectItem value="admin">{t('admin.roleAdmin')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">{t('coach.cancel')}</Button>
            </DialogClose>
            <Button type="submit">{t('admin.editUser.saveChanges')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};