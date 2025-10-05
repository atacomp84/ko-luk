import Layout from "@/components/Layout";
import { useTranslation } from "react-i18next";
import UserManagement from "@/components/admin/UserManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge"; // Assuming messages might be relevant for admin too

const AdminDashboard = () => {
  const { t } = useTranslation();
  return (
    <Layout title={t('admin.dashboardTitle')}>
        {(unreadMessageCount: number) => ( // unreadMessageCount is passed but not used in admin for now
            <div className="dotted-background -mx-4 -my-2 sm:-mx-6 sm:-my-0 p-4 sm:p-6 rounded-lg min-h-[calc(100vh-5rem)]">
                <Tabs defaultValue="user-management" className="w-full">
                    <TabsList className="grid w-full grid-cols-1"> {/* Admin için tek sekme */}
                        <TabsTrigger value="user-management">{t('admin.userManagement.title')}</TabsTrigger>
                        {/* Admin için mesajlar veya başka sekmeler eklenebilir */}
                    </TabsList>
                    <TabsContent value="user-management" className="mt-4">
                        <UserManagement />
                    </TabsContent>
                </Tabs>
            </div>
        )}
    </Layout>
  );
};

export default AdminDashboard;