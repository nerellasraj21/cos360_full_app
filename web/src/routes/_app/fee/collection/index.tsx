import { createFileRoute } from '@tanstack/react-router';
import FeeCollectionPage from '@/pages/fee/FeeCollection';

export const Route = createFileRoute('/_app/fee/collection/')({
  component: FeeCollectionPage,
});
