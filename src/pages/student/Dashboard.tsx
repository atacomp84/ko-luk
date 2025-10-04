import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import StudentTasks from "@/components/student/StudentTasks";
import StudentRewards from "@/components/student/StudentRewards";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";

const StudentDashboard = () => {
  const { profile } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
        }
    };
    fetchUser();
  }, []);

  const handleCopyId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      showSuccess(t('student.userIdCopied'));
    }
  };

  return (
    <Layout title={t('student.dashboardTitle')}>
        <div className="space-y-6">
          <div className="p-8 bg-card rounded-lg border">
            <h2 className="text-xl font-semibold">{t('student.welcome', { firstName: profile?.first_name })}</h2>
          </div>

          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks">{t('student.myTasks')}</TabsTrigger>
              <TabsTrigger value="rewards">{t('student.myRewards')}</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks">
              <StudentTasks />
            </TabsContent>
            <TabsContent value="rewards">
              <StudentRewards />
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>{t('student.yourUserId')}</CardTitle>
              <CardDescription>
                {t('student.yourUserIdDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 bg-secondary rounded-md">
                <pre className="text-sm font-mono overflow-x-auto">
                  <code>{userId || '...'}</code>
                </pre>
                <Button variant="ghost" size="icon" onClick={handleCopyId} disabled={!userId} aria-label={t('student.copyUserId')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
    </Layout>
  );
};

export default StudentDashboard;