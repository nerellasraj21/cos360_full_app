import SubjectPage from '@/pages/masters/subject'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/masters/subjects')({
  component: SubjectPage,
})

