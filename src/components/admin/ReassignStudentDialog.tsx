import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../ui/skeleton';
import { Input } from '@/components/ui/input';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'coach' | 'admin';
  coach_id?: string | null;
  coach_name?: string | null;
}

interface Coach {
  id: string;
  first_name: string;
  last_name: string;
}

interface ReassignStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: UserProfile | null;
  onStudentReassigned: () => void;
}

export const ReassignStudentDialog = ({ isOpen, onClose, student, onStudentReassigned }: ReassignStudentDialogProps) => {
  const [selectedCoachId, setSelectedCoachId] = useState<string>('unassign');
  const [availableCoaches, setAvailableCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchCoaches = async () => {
      if (!student) return;
      setLoading(true);
      try {
        const { data: coachesData, error: coachesError } = await supabase.functions.invoke('get-coaches');
        if (coachesError) throw coachesError;
        setAvailableCoaches(coachesData as Coach[]);
        setSelectedCoachId(student.coach_id || 'unassign');
      } catch (error: any) {
        showError(t('admin.reassignStudent.fetchCoachesError'));
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && student) {
      fetchCoaches();
    }
  }, [isOpen, student, t]);

  const handleReassign = async () => {
    if (!student) return;
    setLoading(true);

    const { error } = await supabase.functions.invoke('reassign-coach-admin', {
      body: { 
        student_id: student.id, 
        coach_id: selectedCoachId === 'unassign' ? null : selectedCoachId 
      },
    });

    if (error) {
      showError(t('admin.reassignStudent.reassignError', { message: error.message }));
    } else {
      showSuccess(t('admin.reassignStudent.reassignSuccess'));
      onStudentReassigned();
      onClose();
    }
    setLoading(false);
  };

  if (!student) return null;

  const currentCoachName = student.coach_name || t('admin.reassignStudent.noCoachAssigned');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.reassignStudent.title', { studentName: `${student.first_name} ${student.last_name}` })}</DialogTitle>
          <DialogDescription>
            {t('admin.reassignStudent.description')}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('admin.reassignStudent.currentCoach')}</Label>
              <Input
                value={currentCoachName}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="select-new-coach">{t('admin.reassignStudent.selectNewCoach')}</Label>
              <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                <SelectTrigger id="select-new-coach">
                  <SelectValue placeholder={t('admin.reassignStudent.selectCoachPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassign">{t('admin.reassignStudent.unassignCoach')}</SelectItem>
                  {availableCoaches.map(coach => (
                    <SelectItem key={coach.id} value={coach.id}>
                      {coach.first_name} {coach.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">{t('coach.cancel')}</Button>
          </DialogClose>
          <Button onClick={handleReassign} disabled={loading || selectedCoachId === (student.coach_id || 'unassign')}>
            {loading ? t('settings.saving') : t('admin.reassignStudent.reassignButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};