import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

interface Reward {
    id: string;
    title: string;
    description: string;
    is_claimed: boolean;
}

const StudentRewards = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      showError('Ödüller getirilirken bir hata oluştu.');
    } else {
      setRewards(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const handleClaimReward = async (rewardId: string) => {
    const { error } = await supabase
      .from('rewards')
      .update({ is_claimed: true })
      .eq('id', rewardId);

    if (error) {
      showError('Ödül kullanılırken bir hata oluştu.');
    } else {
      showSuccess('Ödül kullanıldı!');
      fetchRewards();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('student.myRewards')}</CardTitle>
        <CardDescription>{t('student.rewardsDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : rewards.length > 0 ? (
          <div className="space-y-4">
            {rewards.map(reward => (
              <div key={reward.id} className={`p-4 rounded-lg border ${reward.is_claimed ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' : 'bg-background'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-bold ${reward.is_claimed ? 'line-through text-muted-foreground' : ''}`}>{reward.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{reward.description}</p>
                  </div>
                  {!reward.is_claimed && (
                    <Button size="sm" onClick={() => handleClaimReward(reward.id)}>
                      <Gift className="h-4 w-4 mr-2" />
                      {t('student.claimReward')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">{t('student.noRewards')}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentRewards;