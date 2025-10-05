import StudentManagement from "@/components/coach/StudentManagement";
import Layout from "@/components/Layout";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CoachMessages from "@/components/coach/CoachMessages";
import { Badge } from "@/components/ui/badge";

const CoachDashboard = () => {
  const { t } = useTranslation();
  return (
    <Layout title={t('coach.dashboardTitle')}>
        {(unreadMessageCount: number) => (
            <div className="dotted-background -mx-4 -my-2 sm:-mx-6 sm:-my-0 p-4 sm:p-6 rounded-lg min-h-[calc(100vh-5rem)]">
                <Tabs defaultValue="student-management" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="student-management">{t('coach.myStudents')}</TabsTrigger>
                        <TabsTrigger value="messages" className="relative">
                            {t('messages.title')}
                            {unreadMessageCount > 0 && (
                                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white">
                                    {unreadMessageCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="student-management" className="mt-4">
                        <StudentManagement />
                    </TabsContent>
                    <TabsContent value="messages" className="mt-4">
                        <CoachMessages />
                    </TabsContent>
                </Tabs>
            </div>
        )}
    </Layout>
  );
};

export default CoachDashboard;