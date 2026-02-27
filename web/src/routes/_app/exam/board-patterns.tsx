import { createFileRoute } from '@tanstack/react-router'
import BoardPatternSetup from '@/pages/exam/BoardPatternSetup'

export const Route = createFileRoute('/_app/exam/board-patterns')({
  component: RouteComponent,
})

function RouteComponent() {
  return <BoardPatternSetup />
}
