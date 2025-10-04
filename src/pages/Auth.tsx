"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Rocket } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function AuthPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<"student" | "coach">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!authLoading && session) {
      navigate("/");
    }
  }, [session, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AuthPage] Kayıt işlemi başlatıldı.');
    setLoading(true);
    setError(null); // Önceki giriş hatalarını temizle
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: role,
        },
      },
    });

    if (signUpError) {
      console.error('[AuthPage] Kayıt sırasında hata:', signUpError.message);
      setLoading(false);
      showError(signUpError.message); // Hata durumunda popup göster
    } else {
      console.log('[AuthPage] Kayıt başarılı. Oturum kapatılıyor ve giriş sekmesine yönlendiriliyor.');
      await supabase.auth.signOut();
      setLoading(false);
      showSuccess(t('auth.registerSuccess')); // Başarı durumunda popup göster
      setPassword("");
      setActiveTab("login");
      console.log(`[AuthPage] Giriş sekmesine geçildi. E-posta alanı "${email}" olarak kalacak.`);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setError(null); // Sekme değiştirildiğinde hata mesajını temizle
  };

  if (authLoading || session) {
    return <div className="flex h-screen w-full items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary/50 p-4">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md space-y-4 text-center">
        <Rocket className="h-12 w-12 text-primary mx-auto" />
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
            <TabsTrigger value="register">{t('auth.register')}</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>{t('auth.loginTitle')}</CardTitle>
                <CardDescription>
                  {t('auth.loginDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin}>
                  <div className="space-y-4">
                    <div className="space-y-2 text-left">
                      <Label htmlFor="login-email">{t('auth.emailLabel')}</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="login-password">{t('auth.passwordLabel')}</Label>
                      <Input
                        id="login-password"
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
                      {loading ? t('auth.loggingIn') : t('auth.loginButton')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>{t('auth.registerTitle')}</CardTitle>
                <CardDescription>
                  {t('auth.registerDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister}>
                  <div className="space-y-4 text-left">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">{t('auth.firstNameLabel')}</Label>
                        <Input id="first-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name">{t('auth.lastNameLabel')}</Label>
                        <Input id="last-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">{t('auth.emailLabel')}</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">{t('auth.passwordLabel')}</Label>
                      <Input
                        id="register-password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('auth.roleLabel')}</Label>
                      <RadioGroup defaultValue="student" value={role} onValueChange={(value: "student" | "coach") => setRole(value)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="student" id="role-student" />
                          <Label htmlFor="role-student">{t('auth.roleStudent')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="coach" id="role-coach" />
                          <Label htmlFor="role-coach">{t('auth.roleCoach')}</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? t('auth.registering') : t('auth.registerButton')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}