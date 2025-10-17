import React from 'react';
import { ParentsTable } from '@/components/masters/parents/ParentsTable';

export function ParentsPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Parent Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage parent profiles and their relationships with students
                    </p>
                </div>
            </div>

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