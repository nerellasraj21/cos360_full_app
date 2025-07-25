import TripsPage from '@/pages/transport/trips';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/transport/trips')({
    component: RouteComponent,
});

function RouteComponent() {
    return <TripsPage />;
} 