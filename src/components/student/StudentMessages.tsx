import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import ChatModule from '../ChatModule';
import { Skeleton } from '../ui/skeleton';
import { Card, CardContent } from '../ui/card';

interface CoachProfile {
  id: string;
  first_name: string;
  last_name: string;
}

const StudentMessages = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [coach, setCoach] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCoach = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: pair, error: pairError } = await supabase
        .from('coach_student_pairs')
        .select('coach_id')
        .eq('student_id', user.id)
        .single();
      if (pairError || !pair) {
        setCoach(null);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', pair.coach_id)
        .single();
      if (profileError) throw profileError;
      setCoach(profile as CoachProfile);
    } catch (error) {
      showError(t('messages.fetchCoachError'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    fetchCoach();
  }, [fetchCoach]);

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!coach) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">{t('messages.noCoachAssigned')}</p>
        </CardContent>
      </Card>
    );
  }

  return <ChatModule chatPartner={coach} />;
};

export default StudentMessages;