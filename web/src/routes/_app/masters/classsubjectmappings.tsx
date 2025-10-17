import ClassSubjectMappingsPage from '@/pages/masters/classsubjectmappings'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/masters/classsubjectmappings')({
  component: ClassSubjectMappingsPage,
})