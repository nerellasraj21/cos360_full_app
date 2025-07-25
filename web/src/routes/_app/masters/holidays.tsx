import { Calendar } from '@/components/calendar/Calendar'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/masters/holidays')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DndProvider backend={HTML5Backend}>
      <Calendar />
    </DndProvider>
  )
}
