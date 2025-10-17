import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/staff/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_app/staff/"!</div>
}
