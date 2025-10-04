import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentTasks from "@/components/student/StudentTasks";
import StudentRewards from "@/components/student/StudentRewards";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";

const StudentDashboard = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();

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
        </div>
    </Layout>
  );
};

export default StudentDashboard;