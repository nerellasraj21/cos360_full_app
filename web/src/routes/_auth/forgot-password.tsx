import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPasswordPage,
}) 