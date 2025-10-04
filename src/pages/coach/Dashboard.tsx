import StudentManagement from "@/components/coach/StudentManagement";
import Layout from "@/components/Layout";
import { useTranslation } from "react-i18next";

const CoachDashboard = () => {
  const { t } = useTranslation();
  return (
    <Layout title={t('coach.dashboardTitle')}>
        <StudentManagement />
    </Layout>
  );
};

export default CoachDashboard;