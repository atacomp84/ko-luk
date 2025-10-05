import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../ui/skeleton';
import { Input } from '@/components/ui/input'; // <-- Eklendi

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  role: 'student' | 'coach' | 'admin';
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
  const [currentCoachId, setCurrentCoachId] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [availableCoaches, setAvailableCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const fetchCoachesAndCurrentAssignment = async () => {
    setLoading(true);
    if (!student) {
      setLoading(false);
      return;
    }

    // Fetch all coaches
    const { data: coachesData, error: coachesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'coach');

    if (coachesError) {
      showError(t('admin.reassignStudent.fetchCoachesError'));
      setAvailableCoaches([]);
      setLoading(false);
      return;
    }
    setAvailableCoaches(coachesData as Coach[]);

    // Fetch current coach for the student
    const { data: pairData, error: pairError } = await supabase
      .from('coach_student_pairs')
      .select('coach_id')
      .eq('student_id', student.id)
      .single();

    if (pairError && pairError.code !== 'PGRST116') { // PGRST116 means "no rows found"
      showError(t('admin.reassignStudent.fetchCurrentCoachError'));
      setCurrentCoachId(null);
      setSelectedCoachId(null);
    } else if (pairData) {
      setCurrentCoachId(pairData.coach_id);
      setSelectedCoachId(pairData.coach_id);
    } else {
      setCurrentCoachId(null);
      setSelectedCoachId(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && student) {
      fetchCoachesAndCurrentAssignment();
    } else {
      setCurrentCoachId(null);
      setSelectedCoachId(null);
      setAvailableCoaches([]);
    }
  }, [isOpen, student]);

  const handleReassign = async () => {
    if (!student) return;

    setLoading(true);

    try {
      if (currentCoachId) {
        // If there's a current coach, delete the existing pair
        const { error: deleteError } = await supabase
          .from('coach_student_pairs')
          .delete()
          .eq('student_id', student.id)
          .eq('coach_id', currentCoachId);
        if (deleteError) throw deleteError;
      }

      if (selectedCoachId) {
        // Create a new pair with the selected coach
        const { error: insertError } = await supabase
          .from('coach_student_pairs')
          .insert({ student_id: student.id, coach_id: selectedCoachId });
        if (insertError) throw insertError;
      }

      showSuccess(t('admin.reassignStudent.reassignSuccess'));
      onStudentReassigned();
      onClose();
    } catch (err: any) {
      showError(t('admin.reassignStudent.reassignError', { message: err.message }));
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.reassignStudent.title', { studentName: `${student.first_name} ${student.last_name}` })}</DialogTitle>
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
                value={availableCoaches.find(c => c.id === currentCoachId)?.first_name + ' ' + availableCoaches.find(c => c.id === currentCoachId)?.last_name || t('admin.reassignStudent.noCoachAssigned')}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="select-new-coach">{t('admin.reassignStudent.selectNewCoach')}</Label>
              <Select value={selectedCoachId || ''} onValueChange={setSelectedCoachId}>
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
          <Button onClick={handleReassign} disabled={loading || (selectedCoachId === currentCoachId && selectedCoachId !== 'unassign')}>
            {loading ? t('settings.saving') : t('admin.reassignStudent.reassignButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};