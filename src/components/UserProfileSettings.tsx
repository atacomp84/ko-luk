import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

const UserProfileSettings = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); // Mevcut şifre alanı
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (profile && user) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setUsername(profile.username || '');
      setEmail(user.email || '');
    }
  }, [profile, user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!user) {
      setError(t('settings.noUserError'));
      setLoading(false);
      return;
    }

    try {
      if (username !== profile?.username) {
        const { data: existingUser, error: usernameCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single();

        if (existingUser && existingUser.id !== user.id) {
          throw new Error(t('auth.usernameExistsError'));
        }
        if (usernameCheckError && usernameCheckError.code !== 'PGRST116') {
          throw usernameCheckError;
        }
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          first_name: firstName, 
          last_name: lastName, 
          username: username,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      showSuccess(t('settings.profileUpdateSuccess'));
      await refreshProfile();
    } catch (err: any) {
      setError(err.message);
      showError(t('settings.profileUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!user) {
      setError(t('settings.noUserError'));
      setLoading(false);
      return;
    }

    if (email === user.email) {
      setError(t('settings.emailSameError'));
      setLoading(false);
      return;
    }

    console.log("[handleEmailUpdate] Attempting to re-authenticate for email update...");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!, // Current email
      password: currentPassword,
    });

    if (signInError) {
      console.error("[handleEmailUpdate] Re-authentication failed:", signInError.message);
      setError(signInError.message);
      showError(signInError.message);
      setLoading(false);
      return;
    }
    console.log("[handleEmailUpdate] Re-authentication successful. Refreshing session...");

    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshedSession) {
        console.error("[handleEmailUpdate] Failed to refresh session:", refreshError?.message);
        setError(t('settings.emailUpdateError') + ": " + (refreshError?.message || "Session refresh failed."));
        showError(t('settings.emailUpdateError'));
        setLoading(false);
        return;
    }
    console.log("[handleEmailUpdate] Session refreshed. Attempting to update email...");

    const { error: emailUpdateError } = await supabase.auth.updateUser({ email });

    if (emailUpdateError) {
      console.error("[handleEmailUpdate] Email update failed:", emailUpdateError.message);
      setError(emailUpdateError.message);
      showError(t('settings.emailUpdateError'));
    } else {
      console.log("[handleEmailUpdate] Email update initiated successfully.");
      showSuccess(t('settings.emailUpdateSuccess'));
      setCurrentPassword(''); // Clear current password after successful update
      await refreshProfile(); // Refresh profile to get the new email in context
    }
    setLoading(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!user) {
      setError(t('settings.noUserError'));
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('settings.passwordMismatchError'));
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError(t('settings.passwordLengthError'));
      setLoading(false);
      return;
    }

    // Prevent updating to the same password
    if (newPassword === currentPassword) {
        setError(t('settings.passwordSameError')); // Add this translation key
        showError(t('settings.passwordSameError'));
        setLoading(false);
        return;
    }

    console.log("[handlePasswordUpdate] Attempting to re-authenticate for password update...");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!, // Current email
      password: currentPassword,
    });

    if (signInError) {
      console.error("[handlePasswordUpdate] Re-authentication failed:", signInError.message);
      setError(signInError.message);
      showError(signInError.message);
      setLoading(false);
      return;
    }
    console.log("[handlePasswordUpdate] Re-authentication successful. Refreshing session...");

    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshedSession) {
        console.error("[handlePasswordUpdate] Failed to refresh session:", refreshError?.message);
        setError(t('settings.passwordUpdateError') + ": " + (refreshError?.message || "Session refresh failed."));
        showError(t('settings.passwordUpdateError'));
        setLoading(false);
        return;
    }
    console.log("[handlePasswordUpdate] Session refreshed. Attempting to update password...");

    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });

    if (passwordError) {
      console.error("[handlePasswordUpdate] Password update failed:", passwordError.message);
      setError(passwordError.message);
      showError(t('settings.passwordUpdateError'));
    } else {
      console.log("[handlePasswordUpdate] Password updated successfully.");
      showSuccess(t('settings.passwordUpdateSuccess'));
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword(''); // Clear current password after successful update
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('auth.errorTitle')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profileInfoTitle')}</CardTitle>
          <CardDescription>{t('settings.profileInfoDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">{t('auth.firstNameLabel')}</Label>
                <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">{t('auth.lastNameLabel')}</Label>
                <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">{t('auth.usernameLabel')}</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('settings.saving') : t('settings.saveProfile')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.emailTitle')}</CardTitle>
          <CardDescription>{t('settings.emailDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.emailLabel')}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-password-email">{t('settings.currentPasswordLabel')}</Label>
              <Input id="current-password-email" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('settings.saving') : t('settings.updateEmail')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.passwordTitle')}</CardTitle>
          <CardDescription>{t('settings.passwordDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">{t('settings.currentPasswordLabel')}</Label>
              <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('settings.newPasswordLabel')}</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('settings.confirmPasswordLabel')}</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('settings.saving') : t('settings.updatePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfileSettings;