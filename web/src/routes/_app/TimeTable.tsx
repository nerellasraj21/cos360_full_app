import { createFileRoute } from '@tanstack/react-router'
import TimeTableEditor from '@/pages/masters/TimeTableEditor'

export const Route = createFileRoute('/_app/TimeTable')({
  component: RouteComponent,
})

function RouteComponent() {
  return <TimeTableEditor />
}
