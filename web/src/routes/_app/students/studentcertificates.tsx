import { createFileRoute } from '@tanstack/react-router'
import { StudentCertificatesPage } from '@/pages/students/StudentCertificatesPage'

export const Route = createFileRoute('/_app/students/studentcertificates')({
  component: StudentCertificatesPage,
})