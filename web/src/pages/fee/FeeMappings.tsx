import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClassMappingTable } from '@/components/fee/mappings/ClassMappingTable';
import { StudentMappingTable } from '@/components/fee/mappings/StudentMappingTable';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldX, Map } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export function FeeMappings() {
  return (
    <PermissionGuard
      permissions={[["fee_student_mappings", "list"], ["fee_class_mappings", "list"]]}
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
                      You don't have permission to view fee mappings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <FeeMappingsContent />
    </PermissionGuard>
  );
}

function FeeMappingsContent() {
    const { academicYears, fetchAndSetAcademicYears, selectedAcademicYearId } = useAcademicYearStore();
    const location = useLocation();

    const [activeTab, setActiveTab] = useState(() =>
        location.hash === 'class-mappings' || location.hash === 'class-mappings-term-amounts'
            ? 'class-mappings'
            : 'student-mappings'
    );
    // Numeric key — increments on every sidebar click so highlight always re-triggers
    const [highlightKey, setHighlightKey] = useState(() =>
        location.hash === 'class-mappings-term-amounts' ? 1 : 0
    );

    // React to every navigation (including repeated clicks on the same sidebar item)
    useEffect(() => {
        if (location.hash === 'class-mappings-term-amounts') {
            setActiveTab('class-mappings');
            setHighlightKey(k => k + 1);
        } else if (location.hash === 'class-mappings') {
            setActiveTab('class-mappings');
        }
    }, [location]);

    // Initialize academic years if not loaded
    useEffect(() => {
        if (academicYears.length === 0) {
            fetchAndSetAcademicYears();
        }
    }, [academicYears.length, fetchAndSetAcademicYears]);

    return (
        <div className="p-6 space-y-6">
            <PageHeader title="Fee Mappings Management" icon={<Map className="h-5 w-5" />} />

            <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">Academic Year Context</h2>
                        <p className="text-sm text-muted-foreground">
                            Manage fee assignments for classes and individual students within the selected academic year
                        </p>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="student-mappings">Student Mappings</TabsTrigger>
                    <TabsTrigger value="class-mappings">Class Mappings</TabsTrigger>
                </TabsList>

                <TabsContent value="student-mappings" className="space-y-6">
                    <StudentMappingTable academicYearId={selectedAcademicYearId} />
                </TabsContent>

                <TabsContent value="class-mappings" className="space-y-6">
                    <ClassMappingTable highlightKey={highlightKey} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default FeeMappings;
