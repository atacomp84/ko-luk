import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface DeleteStudentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  student: Student | null;
}

export const DeleteStudentDialog = ({ isOpen, onClose, onConfirm, student }: DeleteStudentDialogProps) => {
  const [step, setStep] = useState(1);
  const { t } = useTranslation();

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
  };

  if (!student) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        {step === 1 && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('coach.deleteStudent.step1.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('coach.deleteStudent.step1.description', { studentName: `${student.first_name} ${student.last_name}` })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleClose}>{t('coach.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => setStep(2)}>{t('coach.deleteStudent.step1.continue')}</AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
        {step === 2 && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('coach.deleteStudent.step2.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('coach.deleteStudent.step2.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleClose}>{t('coach.cancel')}</AlertDialogCancel>
              <Button variant="destructive" onClick={handleConfirm}>
                {t('coach.deleteStudent.step2.confirm')}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};