import { createFileRoute } from '@tanstack/react-router'
import MyMarksPage from '@/pages/exam/MyMarksPage'

export const Route = createFileRoute('/_app/exam/my-marks/$examId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <MyMarksPage />
}
