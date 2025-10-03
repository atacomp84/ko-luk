import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface Profile {
    first_name: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
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

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Öğrenci Paneli</h1>
          <Button onClick={handleLogout} variant="outline">Çıkış Yap</Button>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="p-8 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold">Hoş Geldin, {profile?.first_name}!</h2>
            <p className="mt-2 text-gray-600">Ödevlerini ve ödüllerini görmek için yakında burayı kontrol edebilirsin.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;