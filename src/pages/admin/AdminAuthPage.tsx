import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function AdminAuthPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!authLoading && session && profile?.role === 'admin') {
      navigate("/admin/dashboard");
    } else if (!authLoading && session && profile?.role !== 'admin') {
      // If logged in but not admin, redirect to their respective dashboard
      navigate(profile?.role === 'coach' ? '/coach/dashboard' : '/student/dashboard');
    }
  }, [session, authLoading, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      showError(error.message);
      setLoading(false);
      return;
    }

    // After successful login, check if the user is an admin
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user?.id)
      .single();

    if (profileError || userProfile?.role !== 'admin') {
      setError(t('admin.login.notAdminError'));
      showError(t('admin.login.notAdminError'));
      await supabase.auth.signOut(); // Log out non-admin users
      setLoading(false);
      return;
    }
    
    navigate("/admin/dashboard");
  };

  if (authLoading || (session && profile?.role === 'admin')) {
    return <div className="flex h-screen w-full items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary/50 p-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-4 text-center">
        <ShieldCheck className="h-12 w-12 text-primary mx-auto" />
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.login.title')}</CardTitle>
            <CardDescription>
              {t('admin.login.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="admin-email">{t('auth.emailLabel')}</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="admin-password">{t('auth.passwordLabel')}</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('auth.errorTitle')}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('admin.login.loggingIn') : t('admin.login.button')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}