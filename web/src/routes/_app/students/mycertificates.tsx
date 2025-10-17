import { createFileRoute } from '@tanstack/react-router'
import { MyCertificatesPage } from '@/pages/students/MyCertificatesPage'

export const Route = createFileRoute('/_app/students/mycertificates')({
  component: MyCertificatesPage,
})