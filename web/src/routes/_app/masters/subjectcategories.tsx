import SubjectCategoriesPage from '@/pages/masters/subjectcategories'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/masters/subjectcategories')({
    component: SubjectCategoriesPage,
})
