import { createFileRoute } from '@tanstack/react-router';
import CertificatePage from '@/pages/students/CertificatePage';

export const Route = createFileRoute('/_app/students/mycertificates')({
  component: CertificatePage,
});
