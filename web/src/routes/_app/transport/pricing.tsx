import { createFileRoute } from '@tanstack/react-router'
import TransportPricingPage from '@/pages/transport/pricing';

export const Route = createFileRoute('/_app/transport/pricing')({
  component: RouteComponent,
})

function RouteComponent() {
  return <TransportPricingPage />
}
