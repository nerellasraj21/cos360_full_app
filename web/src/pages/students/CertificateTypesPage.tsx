import React from 'react';
import { Card } from '@/components/ui/card';
import { Tag } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { CertificateTypeManager } from '@/components/students/CertificateTypeManager';

const CertificateTypesPage = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader title="Certificate Types" icon={<Tag className="h-5 w-5" />} />

      <Card className="p-6">
        <CertificateTypeManager />
      </Card>
    </div>
  );
};

export default CertificateTypesPage;