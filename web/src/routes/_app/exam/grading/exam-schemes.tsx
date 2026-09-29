import { createFileRoute } from '@tanstack/react-router'
import ExamGradeSchemes from '@/pages/exam/ExamGradeSchemes'

export const Route = createFileRoute('/_app/exam/grading/exam-schemes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ExamGradeSchemes />
}
