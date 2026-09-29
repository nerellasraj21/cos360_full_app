import React from 'react';
import { ParentsTable } from '@/components/masters/parents/ParentsTable';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export function ParentsPage() {
    return (
        <div className="p-6 space-y-6">
            <PageHeader title="Parent Management" icon={<Users className="h-5 w-5" />} subtitle="Manage parent profiles and their relationships with students" />

            <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold">Parent Portal Access</h2>
                        <p className="text-sm text-muted-foreground">
                            Parents can access their children's information through secure authentication
                        </p>
                    </div>
                </div>
            </div>

            <ParentsTable />
        </div>
    );
}

export default ParentsPage;