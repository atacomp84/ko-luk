import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Download, Upload, Trash2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { showError, showSuccess } from '@/utils/toast';
import { Input } from '@/components/ui/input'; // Added Input import

export const DatabaseManagement = () => {
  console.log("[DatabaseManagement] Component rendered.");
  const [isClearDbConfirmOpen, setClearDbConfirmOpen] = useState(false);
  const { t } = useTranslation();

  const handleBackupDatabase = async () => {
    console.log("[DatabaseManagement] Initiating database backup.");
    try {
      const { data, error } = await supabase.functions.invoke('backup-database', {
        method: 'GET',
      });

      if (error) {
        console.error("[DatabaseManagement] Backup error:", error.message);
        showError(t('admin.databaseManagement.backupError'));
        return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supabase_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess(t('admin.databaseManagement.backupSuccess'));
      console.log("[DatabaseManagement] Database backup successful.");
    } catch (err: any) {
      console.error("[DatabaseManagement] Unexpected backup error:", err.message);
      showError(t('admin.databaseManagement.backupError'));
    }
  };

  const handleRestoreDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[DatabaseManagement] Initiating database restore.");
    const file = event.target.files?.[0];
    if (!file) {
      showError(t('admin.databaseManagement.noFileSelected'));
      return;
    }

    try {
      const fileContent = await file.text();
      const backupData = JSON.parse(fileContent);

      const { error } = await supabase.functions.invoke('restore-database', {
        method: 'POST',
        body: backupData,
      });

      if (error) {
        console.error("[DatabaseManagement] Restore error:", error.message);
        showError(t('admin.databaseManagement.restoreError'));
        return;
      }

      showSuccess(t('admin.databaseManagement.restoreSuccess'));
      console.log("[DatabaseManagement] Database restore successful.");
      // Optionally, refresh the page or relevant data after restore
    } catch (err: any) {
      console.error("[DatabaseManagement] Unexpected restore error:", err.message);
      showError(t('admin.databaseManagement.restoreError'));
    }
  };

  const handleClearDatabase = async () => {
    console.log("[DatabaseManagement] Initiating database clear.");
    try {
      const { error } = await supabase.functions.invoke('clear-database', {
        method: 'POST',
      });

      if (error) {
        console.error("[DatabaseManagement] Clear database error:", error.message);
        showError(t('admin.databaseManagement.clearError'));
        return;
      }

      showSuccess(t('admin.databaseManagement.clearSuccess'));
      console.log("[DatabaseManagement] Database cleared successfully.");
      setClearDbConfirmOpen(false);
      // Optionally, force logout or refresh after clearing database
      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (err: any) {
      console.error("[DatabaseManagement] Unexpected clear database error:", err.message);
      showError(t('admin.databaseManagement.clearError'));
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.databaseManagement.title')}</CardTitle>
          <CardDescription>{t('admin.databaseManagement.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleBackupDatabase} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              {t('admin.databaseManagement.backupButton')}
            </Button>
            <label htmlFor="restore-file" className="w-full sm:w-auto">
              <Input id="restore-file" type="file" accept=".json" onChange={handleRestoreDatabase} className="hidden" />
              <Button asChild variant="outline" className="w-full sm:w-auto cursor-pointer">
                <span><Upload className="mr-2 h-4 w-4" />{t('admin.databaseManagement.restoreButton')}</span>
              </Button>
            </label>
          </div>
          <div className="border-t pt-4 mt-4">
            <Button variant="destructive" onClick={() => setClearDbConfirmOpen(true)} className="w-full sm:w-auto">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('admin.databaseManagement.clearButton')}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">{t('admin.databaseManagement.clearWarning')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Clear Database Confirmation Dialog */}
      <AlertDialog open={isClearDbConfirmOpen} onOpenChange={setClearDbConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-6 w-6" />
              {t('admin.databaseManagement.clearConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.databaseManagement.clearConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('coach.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearDatabase} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="mr-2 h-4 w-4" />{t('admin.databaseManagement.clearConfirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};