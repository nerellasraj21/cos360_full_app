import { createFileRoute } from '@tanstack/react-router'
import { CertificateUploadPage } from '@/pages/students/CertificateUploadPage'

export const Route = createFileRoute('/_app/students/certificatesupload')({
  component: CertificateUploadPage,
})

