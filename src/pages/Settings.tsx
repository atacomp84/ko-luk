import Layout from "@/components/Layout";
import UserProfileSettings from "@/components/UserProfileSettings";
import { useTranslation } from "react-i18next";

const SettingsPage = () => {
  const { t } = useTranslation();

  return (
    <Layout title={t('settings.title')}>
      <div className="dotted-background -mx-4 -my-2 sm:-mx-6 sm:-my-0 p-4 sm:p-6 rounded-lg min-h-[calc(100vh-5rem)]">
        <div className="max-w-2xl mx-auto">
          <UserProfileSettings />
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;