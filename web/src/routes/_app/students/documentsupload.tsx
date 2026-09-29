import { createFileRoute } from '@tanstack/react-router'
import { DocumentUploadPage } from '@/pages/students/DocumentUploadPage'

export const Route = createFileRoute('/_app/students/documentsupload')({
  component: DocumentUploadPage,
})