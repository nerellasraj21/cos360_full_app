import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  isDirty: boolean;
  children: React.ReactNode;
  maxWidth?: string;
}

/**
 * Drop-in Dialog wrapper for forms with unsaved-changes protection.
 *
 * - Blocks outside-click close when form is dirty → shows confirmation
 * - Pass `isDirty` from useFormGuard hook or React Hook Form formState.isDirty
 * - Children should call onAttemptClose (from parent) on Cancel button
 *
 * Pattern:
 *   const [isDirty, setIsDirty] = useState(false);
 *   <FormDialog open={open} onClose={onClose} title="..." isDirty={isDirty}>
 *     <form onChange={() => setIsDirty(true)}>
 *       ...
 *       <Button onClick={() => handleAttemptClose()}>Cancel</Button>
 *     </form>
 *   </FormDialog>
 */
export function FormDialog({ open, onClose, title, isDirty, children, maxWidth = 'sm:max-w-lg' }: FormDialogProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowConfirm(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleAttemptClose(); }}>
        <DialogContent
          className={maxWidth}
          onInteractOutside={(e) => { e.preventDefault(); handleAttemptClose(); }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved data in this form. If you close now, all entered data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)}>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>Discard & Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
