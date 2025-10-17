import React from 'react';
import { Card } from '@/components/ui/card';
import { CertificateTypeManager } from '@/components/students/CertificateTypeManager';

const CertificateTypesPage = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Certificate Types</h1>
      </div>

      <Card className="p-6">
        <CertificateTypeManager />
      </Card>
    </div>
  );
};

export default CertificateTypesPage;