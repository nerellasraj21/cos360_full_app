import { createFileRoute } from '@tanstack/react-router'
import { StudentDocumentsPage } from '@/pages/students/StudentDocumentsPage'

export const Route = createFileRoute('/_app/students/studentdocuments')({
  component: StudentDocumentsPage,
})