import { useEffect } from 'react';
import { Calendar, ShieldX } from 'lucide-react';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { FeeTermsList } from '@/components/fee/terms/FeeTermsList';
import { PermissionGuard } from '@/components/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
            <PageHeader title="Fee Terms Management" icon={<Calendar className="h-5 w-5" />} subtitle="Configure fee terms and payment schedules for different fee structures" />

            {/* Merged Card: Academic Year Info + Fee Terms List */}
            <Card>
                {/* Academic Year Info - Header Section */}
                {currentYear && (
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Academic Year: {currentYear.title}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {new Date(currentYear.start_date).toLocaleDateString()} - {new Date(currentYear.end_date).toLocaleDateString()}
                                </p>
                            </div>
                            {currentYear.is_active && (
                                <span className="bg-accent text-accent-foreground px-2 py-1 rounded-full text-xs font-medium">
                                    Active Year
                                </span>
                            )}
                        </div>
                    </CardHeader>
                )}

                {/* Fee Terms List - Content Section */}
                <CardContent className={currentYear ? 'pt-0' : ''}>
                    <FeeTermsList />
                </CardContent>
            </Card>
        </div>
    );
}