import { useState, useEffect } from 'react';
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

  // Diyalog kapandığında adımı sıfırla
  useEffect(() => {
    if (!isOpen) {
      // Animasyonun bitmesi için küçük bir gecikme
      const timer = setTimeout(() => setStep(1), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm();
  };

  if (!student) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
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
              <AlertDialogCancel>{t('coach.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => {
                e.preventDefault(); // Anahtar düzeltme: Diyalogun kapanmasını engelle
                setStep(2);
              }}>{t('coach.deleteStudent.step1.continue')}</AlertDialogAction>
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
              <AlertDialogCancel>{t('coach.cancel')}</AlertDialogCancel>
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