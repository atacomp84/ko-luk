import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserManagement } from "@/components/admin/UserManagement";
import { DatabaseManagement } from "@/components/admin/DatabaseManagement";

const AdminDashboard = () => {
  const { t } = useTranslation();

  return (
    <Layout title={t('admin.dashboardTitle')}>
      <div className="dotted-background -mx-4 -my-2 sm:-mx-6 sm:-my-0 p-4 sm:p-6 rounded-lg min-h-[calc(100vh-5rem)]">
        <Tabs defaultValue="user-management" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user-management">{t('admin.userManagement')}</TabsTrigger>
            <TabsTrigger value="database-management">{t('admin.databaseManagement')}</TabsTrigger>
          </TabsList>
          <TabsContent value="user-management" className="mt-4">
            <UserManagement />
          </TabsContent>
          <TabsContent value="database-management" className="mt-4">
            <DatabaseManagement />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminDashboard;