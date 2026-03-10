import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { FeeTermsList } from '@/components/fee/terms/FeeTermsList';
import { PermissionGuard } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldX, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export function FeeTerms() {
  return (
    <PermissionGuard
      resource="fee_terms"
      action="list"
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
                      You don't have permission to view fee terms.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <FeeTermsContent />
    </PermissionGuard>
  );
}

function FeeTermsContent() {
    const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore();

    // Initialize academic years if not loaded
    useEffect(() => {
        if (academicYears.length === 0) {
            fetchAndSetAcademicYears();
        }
    }, [academicYears.length, fetchAndSetAcademicYears]);

    const currentYear = academicYears.find(year => year.id === selectedAcademicYearId);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/fee">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>
                    <PageHeader title="Fee Terms Management" icon={<Calendar className="h-5 w-5" />} subtitle="Configure fee terms and payment schedules for different fee structures" />
                </div>
            </div>

            {/* Academic Year Info */}
            {currentYear && (
                <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold">Academic Year: {currentYear.title}</h2>
                            <p className="text-sm text-muted-foreground">
                                {new Date(currentYear.start_date).toLocaleDateString()} - {new Date(currentYear.end_date).toLocaleDateString()}
                            </p>
                        </div>
                        {currentYear.is_active && (
                            <span className="bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs font-medium">
                                Active Year
                            </span>
                        )}
                    </div>
                </div>
            )}

            <Separator />

            {/* Fee Terms List */}
            <FeeTermsList />
        </div>
    );
}