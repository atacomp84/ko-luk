import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudentCurrentTasks from "@/components/student/StudentCurrentTasks";
import StudentCompletedTasks from "@/components/student/StudentCompletedTasks";
import Layout from "@/components/Layout";
import StudentMessages from "@/components/student/StudentMessages";
import { cn } from "@/lib/utils";

const StudentDashboard = () => {
  const { t } = useTranslation();

  return (
    <Layout title={t('student.dashboardTitle')}>
        {(unreadMessageCount: number) => (
            <div className="dotted-background -mx-4 -my-2 sm:-mx-6 sm:-my-0 p-4 sm:p-6 rounded-lg min-h-[calc(100vh-5rem)]">
                <Tabs defaultValue="current-tasks" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="current-tasks">{t('student.currentTasks')}</TabsTrigger>
                        <TabsTrigger value="completed-tasks">{t('student.completedTasks')}</TabsTrigger>
                        <TabsTrigger value="messages" className={cn(unreadMessageCount > 0 && "text-red-500 animate-blink font-bold")}>
                            {t('messages.title')}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="current-tasks" className="mt-4">
                        <StudentCurrentTasks />
                    </TabsContent>
                    <TabsContent value="completed-tasks" className="mt-4">
                        <StudentCompletedTasks />
                    </TabsContent>
                    <TabsContent value="messages" className="mt-4">
                        <StudentMessages />
                    </TabsContent>
                </Tabs>
            </div>
        )}
    </Layout>
  );
};

export default StudentDashboard;