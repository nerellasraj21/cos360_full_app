import { createFileRoute } from '@tanstack/react-router'
import SubjectGradeSchemes from '@/pages/exam/SubjectGradeSchemes'

export const Route = createFileRoute('/_app/exam/grading/subject-schemes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <SubjectGradeSchemes />
}
