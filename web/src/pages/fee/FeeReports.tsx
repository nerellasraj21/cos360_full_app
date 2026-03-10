import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { PermissionGuard } from '@/components/common';

export function FeeReports() {
  return (
    <PermissionGuard
      resource="fee_reports"
      action="read"
      fallback={
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <BarChart3 className="w-8 h-8 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">
                      You don't have permission to view fee reports.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <FeeReportsContent />
    </PermissionGuard>
  );
}

function FeeReportsContent() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader title="Fee Reports & Export" icon={<BarChart3 className="h-5 w-5" />} subtitle="Generate reports and export fee data" />

            {/* Reports functionality will be implemented here */}
            <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p>Reports functionality is being implemented</p>
            </div>
        </div>
    );
}