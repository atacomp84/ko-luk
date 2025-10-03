import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Skeleton } from '@/components/ui/skeleton';

interface Profile {
  first_name: string;
  role: 'coach' | 'student';
}

const Index = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, role')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
      }
      setLoading(false);
    };

    fetchUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
         fetchUserAndProfile();
      }
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        navigate('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderLoading = () => (
    <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-24" />
    </div>
  );

  const renderGuestView = () => (
    <>
      <h1 className="text-4xl font-bold mb-4">Welcome to the LGS Coaching Platform</h1>
      <p className="text-xl text-gray-600 mb-6">
        Please log in or register to continue.
      </p>
      <Button onClick={() => navigate('/auth')}>Login / Register</Button>
    </>
  );

  const renderUserView = () => (
    <>
      <h1 className="text-4xl font-bold mb-4">Welcome, {profile?.first_name}!</h1>
      <p className="text-xl text-gray-600 mb-6">
        You are logged in as a {profile?.role}.
      </p>
      <Button onClick={handleLogout}>Logout</Button>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center p-8">
        {loading ? renderLoading() : (profile ? renderUserView() : renderGuestView())}
      </div>
      <div className="absolute bottom-4">
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;