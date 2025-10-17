import CertificateTypesPage from '@/pages/students/CertificateTypesPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/students/certificatetypes')({
  component: CertificateTypesPage,
})