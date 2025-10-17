import { FeeNavigation } from '@/components/fee/dashboard/FeeNavigation';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldX } from 'lucide-react';

export default function FeeDashboard() {
  return (
    <PermissionGuard
      permissions={[["fee_categories", "list"], ["fee_types", "list"], ["fee_terms", "list"]]}
      requireAll={false}
      fallback={
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <ShieldX className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">
                      You don't have permission to view the fee dashboard.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <FeeDashboardContent />
    </PermissionGuard>
  );
}

function FeeDashboardContent() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Fee Management Dashboard</h1>
                <p className="text-muted-foreground">
                    Comprehensive overview and management of all fee-related components
                </p>
            </div>

            {/* Navigation to Fee Sections */}
            <FeeNavigation />
        </div>
    );
}