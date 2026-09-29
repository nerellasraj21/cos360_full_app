import { createFileRoute } from '@tanstack/react-router'
import { MyDocumentsPage } from '@/pages/students/MyDocumentsPage'

export const Route = createFileRoute('/_app/students/mydocuments')({
  component: MyDocumentsPage,
})