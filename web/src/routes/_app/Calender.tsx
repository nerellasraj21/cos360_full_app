import { createFileRoute } from '@tanstack/react-router'
import { Calendar } from '@/components/calendar/Calendar'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

export const Route = createFileRoute('/_app/Calender')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DndProvider backend={HTML5Backend}>
      <Calendar />
    </DndProvider>
  )
}
