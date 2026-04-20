import { createFileRoute } from '@tanstack/react-router';
import CertificateTemplatesPage from '@/pages/students/CertificateTemplatesPage';

export const Route = createFileRoute('/_app/students/certificatetemplates')({
  component: CertificateTemplatesPage,
});
