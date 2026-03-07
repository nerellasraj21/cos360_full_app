import { createFileRoute } from '@tanstack/react-router';
import CommunicationPage from '../../pages/Communication';

export const Route = createFileRoute('/_app/communication')({
  component: CommunicationPage,
});
