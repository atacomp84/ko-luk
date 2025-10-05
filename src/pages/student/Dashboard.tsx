import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentTasks from "@/components/student/StudentTasks";
import StudentRewards from "@/components/student/StudentRewards";
import Layout from "@/components/Layout";

const StudentDashboard = () => {
  const { t } = useTranslation();

  return (
    <Layout title={t('student.dashboardTitle')}>
        <div className="dotted-background -mx-4 -my-2 sm:-mx-6 sm:-my-0 p-4 sm:p-6 rounded-lg min-h-[calc(100vh-5rem)]">
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks">{t('student.myTasks')}</TabsTrigger>
              <TabsTrigger value="rewards">{t('student.myRewards')}</TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-4">
              <StudentTasks />
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