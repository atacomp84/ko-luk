import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface Reward {
    id: string;
    title: string;
    description: string;
    is_claimed: boolean;
}

interface RewardManagementDialogProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RewardManagementDialog = ({ student, isOpen, onClose }: RewardManagementDialogProps) => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const { t } = useTranslation();

  const fetchRewards = async () => {
    if (!student) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      showError('Ödüller getirilirken hata oluştu.');
    } else {
      setRewards(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen && student) {
      fetchRewards();
    }
  }, [isOpen, student]);

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !title) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('rewards').insert({
      coach_id: user.id,
      student_id: student.id,
      title,
      description,
    });

    if (error) {
      showError('Ödül eklenirken bir hata oluştu.');
    } else {
      showSuccess('Ödül başarıyla gönderildi.');
      setTitle('');
      setDescription('');
      fetchRewards();
    }
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('coach.rewardManagementTitle', { firstName: student.first_name, lastName: student.last_name })}</DialogTitle>
          <DialogDescription>{t('coach.rewardManagementDescription')}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
                <h3 className="font-semibold">{t('coach.sendNewReward')}</h3>
                <form onSubmit={handleAddReward} className="space-y-4">
                    <div>
                        <Label htmlFor="reward-title">{t('coach.rewardTitleLabel')}</Label>
                        <Input id="reward-title" value={title} onChange={e => setTitle(e.target.value)} required />
                    </div>
                    <div>
                        <Label htmlFor="reward-description">{t('coach.taskDescriptionLabel')}</Label>
                        <Textarea id="reward-description" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <Button type="submit">{t('coach.sendRewardButton')}</Button>
                </form>
            </div>
            <div className="space-y-4">
                <h3 className="font-semibold">{t('coach.sentRewards')}</h3>
                <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                {loading ? (
                    <Skeleton className="h-20 w-full" />
                ) : rewards.length > 0 ? (
                    rewards.map(reward => (
                    <div key={reward.id} className={`p-3 rounded-md ${reward.is_claimed ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-secondary'}`}>
                        <p className="font-bold">{reward.title}</p>
                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                        <p className="text-xs font-semibold mt-1 capitalize">{t('coach.statusLabel')}: {reward.is_claimed ? t('coach.statusClaimed') : t('coach.statusPending')}</p>
                    </div>
                    ))
                ) : (
                    <p className="text-center text-muted-foreground py-4">{t('coach.noSentRewards')}</p>
                )}
                </div>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('coach.close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};