import React from 'react';
import { FeeCategoryTree } from '@/components/fee/categories/FeeCategoryTree';
import { PermissionGuard } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldX, Tag } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export function FeeCategories() {
    return (
        <PermissionGuard
            resource="fee_categories"
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
                                            You don't have permission to view fee categories.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            }
        >
            <div className="p-6 space-y-6">
                <PageHeader title="Fee Categories Management" icon={<Tag className="h-5 w-5" />} />

                <FeeCategoryTree />
            </div>
        </PermissionGuard>
    );
}

export default FeeCategories;