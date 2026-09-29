import { createFileRoute } from '@tanstack/react-router'
import RemarkGradeSets from '@/pages/exam/RemarkGradeSets'

export const Route = createFileRoute('/_app/exam/grading/remarks')({
  component: RouteComponent,
})

function RouteComponent() {
  return <RemarkGradeSets />
}
