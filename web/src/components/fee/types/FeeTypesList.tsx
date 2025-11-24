import { useState } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFeeTypes, useDeleteFeeType } from '@/hooks/fee/useFeeTypes';
import { usePermission } from '@/hooks/usePermission';
import { FeeTypeForm } from './FeeTypeForm';
import type { FeeType } from '@/types/fee';

export function FeeTypesList() {
    const [selectedType, setSelectedType] = useState<FeeType | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const { checkPermission } = usePermission();

    // Check permissions
    const canCreate = checkPermission('fee_types', 'create');
    const canUpdate = checkPermission('fee_types', 'update');
    const canDelete = checkPermission('fee_types', 'delete');

    const { data: types = [], isLoading, error } = useFeeTypes();

    const deleteTypeMutation = useDeleteFeeType();

    const handleEditType = (type: FeeType) => {
        setSelectedType(type);
        setIsFormOpen(true);
    };

    const handleDeleteType = async (type: FeeType) => {
        if (window.confirm(`Are you sure you want to delete "${type.type_name}"? This action cannot be undone.`)) {
            try {
                await deleteTypeMutation.mutateAsync({ id: type.id, categoryId: type.fee_category_id });
            } catch (error) {
                console.error('Failed to delete fee type:', error);
            }
        }
    };

    const handleCreateNew = () => {
        setSelectedType(null);
        setIsFormOpen(true);
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading fee types...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load fee types. Please try again.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Fee Types</CardTitle>
                        {canCreate && (
                            <Button onClick={handleCreateNew}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add New Type
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {types.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-muted-foreground mb-4">
                                No fee types found for the selected academic year.
                            </div>
                            {canCreate && (
                                <Button onClick={handleCreateNew}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create First Type
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Type Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Term</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {types.map((type) => (
                                    <TableRow key={type.id}>
                                        <TableCell className="font-medium">
                                            {type.type_name}
                                        </TableCell>
                                        <TableCell>
                                            {type.fee_category_name || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                if (!type.fee_term_name) return 'N/A';
                                                if (type.fee_term_name === type.fee_term_id) {
                                                    return `Installment ${type.fee_term_name ? 1 : 'N/A'}`;
                                                }
                                                return type.fee_term_name;
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={type.fee_status === 'active' ? 'default' : 'secondary'}>
                                                {type.fee_status === 'active' ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {canUpdate && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditType(type)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteType(type)}
                                                        disabled={deleteTypeMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Fee Type Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedType ? 'Edit Fee Type' : 'Create New Fee Type'}
                        </DialogTitle>
                    </DialogHeader>
                    <FeeTypeForm
                        type={selectedType}
                        onSuccess={() => {
                            setIsFormOpen(false);
                            setSelectedType(null);
                        }}
                        onCancel={() => {
                            setIsFormOpen(false);
                            setSelectedType(null);
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}