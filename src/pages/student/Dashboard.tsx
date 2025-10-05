import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentCurrentTasks from "@/components/student/StudentCurrentTasks";
import StudentCompletedTasks from "@/components/student/StudentCompletedTasks";
import StudentRewards from "@/components/student/StudentRewards"; // StudentRewards import edildi
import Layout from "@/components/Layout";

const StudentDashboard = () => {
  const { t } = useTranslation();

  return (
    <Layout title={t('student.dashboardTitle')}>
        <div className="dotted-background -mx-4 -my-2 sm:-mx-6 sm:-my-0 p-4 sm:p-6 rounded-lg min-h-[calc(100vh-5rem)]">
          <Tabs defaultValue="current-tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="current-tasks">{t('student.currentTasks')}</TabsTrigger>
              <TabsTrigger value="completed-tasks">{t('student.completedTasks')}</TabsTrigger>
              <TabsTrigger value="rewards">{t('student.myRewards')}</TabsTrigger>
            </TabsList>
            <TabsContent value="current-tasks" className="mt-4">
              <StudentCurrentTasks />
            </TabsContent>
            <TabsContent value="completed-tasks" className="mt-4">
              <StudentCompletedTasks />
            </TabsContent>
            <TabsContent value="rewards" className="mt-4">
              <StudentRewards />
            </TabsContent>
          </Tabs>
        </div>
    </Layout>
  );
};

export default StudentDashboard;