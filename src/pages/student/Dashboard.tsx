import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import StudentTasks from "@/components/student/StudentTasks";

interface Profile {
    first_name: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            const { data } = await supabase.from('profiles').select('first_name').eq('id', user.id).single();
            setProfile(data);
        }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleCopyId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId);
      showSuccess("Kullanıcı ID'si panoya kopyalandı!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Öğrenci Paneli</h1>
          <Button onClick={handleLogout} variant="outline">Çıkış Yap</Button>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 space-y-6">
          <div className="p-8 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold">Hoş Geldin, {profile?.first_name}!</h2>
          </div>

          <StudentTasks />

          <Card>
            <CardHeader>
              <CardTitle>Kullanıcı ID'niz</CardTitle>
              <CardDescription>
                Bu ID, sistemdeki benzersiz kimliğinizdir.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 bg-gray-100 rounded-md">
                <pre className="text-sm font-mono overflow-x-auto">
                  <code>{userId || 'Yükleniyor...'}</code>
                </pre>
                <Button variant="ghost" size="icon" onClick={handleCopyId} disabled={!userId} aria-label="Kullanıcı ID'sini kopyala">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;