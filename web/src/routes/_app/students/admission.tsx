import AdmissionPage from '@/pages/students/AdmissionPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/students/admission')({
  component: AdmissionPage,
})

