import { createFileRoute } from '@tanstack/react-router';
import SetPasswordPage from '@/pages/auth/SetPasswordPage';

export const Route = createFileRoute('/_auth/set-password')({
  component: SetPasswordPage,
});
