import StudentManagement from "@/components/coach/StudentManagement";
import Layout from "@/components/Layout";
import { useTranslation } from "react-i18next";

const CoachDashboard = () => {
  const { t } = useTranslation();
  return (
    <Layout title={t('coach.dashboardTitle')}>
        <div className="dotted-background -mx-4 -my-2 sm:-mx-6 sm:-my-0 p-4 sm:p-6 rounded-lg min-h-[calc(100vh-5rem)]">
            <StudentManagement />
        </div>
    </Layout>
  );
};

export default CoachDashboard;