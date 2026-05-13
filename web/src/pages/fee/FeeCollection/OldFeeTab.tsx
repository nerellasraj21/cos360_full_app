import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditButton, DeleteButton, TableActionGroup } from '@/components/common/TableActions';
import {
  useOldFeesForStudent,
  useCreateOldFee,
  useCarryForwardOldFees,
  useUpdateOldFee,
  useSettleOldFee,
  useDeleteOldFee,
} from '@/hooks/fee';
import { usePermission } from '@/hooks/usePermission';
import { formatCurrency } from './FeeSummaryTab';
import type { OldFeeRead, OldFeeUpdate } from '@/types/fee';

// ===== Add Manual Entry Schema =====
const addOldFeeSchema = z.object({
  academic_year_label: z.string().min(1, 'Academic year is required'),
  fee_type_name: z.string().min(1, 'Fee type name is required'),
  original_amount: z.number({ required_error: 'Original amount is required' }).positive('Must be > 0'),
  paid_amount: z.number().min(0, 'Cannot be negative'),
  receipt_manual: z.string().optional(),
  remarks: z.string().optional(),
}).refine((data) => data.paid_amount <= data.original_amount, {
  message: 'Paid amount cannot exceed original amount',
  path: ['paid_amount'],
});

type AddOldFeeForm = z.infer<typeof addOldFeeSchema>;

interface OldFeeTabProps {
  studentId: string;
}

export default function OldFeeTab({ studentId }: OldFeeTabProps) {
  const { selectedAcademicYearId, academicYears } = useAcademicYearStore();
  const { checkPermission } = usePermission();
  const canCreate = checkPermission('fee_old', 'create');
  const canUpdate = checkPermission('fee_old', 'update');
  const canDelete = checkPermission('fee_old', 'delete');
  const hasAnyAction = canUpdate || canDelete;
  const { data, isLoading, isError, error } = useOldFeesForStudent(studentId, selectedAcademicYearId);

  const createMutation = useCreateOldFee();
  const carryForwardMutation = useCarryForwardOldFees();
  const updateMutation = useUpdateOldFee();
  const settleMutation = useSettleOldFee();
  const deleteMutation = useDeleteOldFee();

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCarryForwardDialog, setShowCarryForwardDialog] = useState(false);
  const [editItem, setEditItem] = useState<OldFeeRead | null>(null);
  const [editData, setEditData] = useState<OldFeeUpdate>({});
  const [settleId, setSettleId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Carry-forward state
  const [sourceYearId, setSourceYearId] = useState('');

  // Add form
  const addForm = useForm<AddOldFeeForm>({
    resolver: zodResolver(addOldFeeSchema),
    defaultValues: { paid_amount: 0 },
  });

  function handleAddSubmit(formData: AddOldFeeForm) {
    createMutation.mutate(
      { student_id: studentId, ...formData },
      { onSuccess: () => { setShowAddDialog(false); addForm.reset(); } }
    );
  }

  function handleCarryForward() {
    if (!sourceYearId) return;
    carryForwardMutation.mutate(
      {
        student_id: studentId,
        source_academic_year_id: sourceYearId,
        target_academic_year_id: selectedAcademicYearId,
      },
      { onSuccess: () => { setShowCarryForwardDialog(false); setSourceYearId(''); } }
    );
  }

  function handleEditOpen(item: OldFeeRead) {
    setEditItem(item);
    setEditData({
      paid_amount: item.paid_amount,
      paid_date: item.paid_date || '',
      receipt_manual: item.receipt_manual || '',
      remarks: item.remarks || '',
    });
  }

  function handleEditSave() {
    if (!editItem) return;
    updateMutation.mutate(
      { id: editItem.id, data: editData },
      { onSuccess: () => setEditItem(null) }
    );
  }

  function handleSettleConfirm() {
    if (!settleId) return;
    settleMutation.mutate(settleId, { onSuccess: () => setSettleId(null) });
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Loading old fees...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-4 text-sm text-destructive">
        {(error as Error)?.message || 'Failed to load old fees'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      {canCreate && (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Manual Entry
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCarryForwardDialog(true)}>
            Carry Forward
          </Button>
        </div>
      )}

      {/* Old Fees Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Old Fee Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!data || data.items.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No old fee records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S.No.</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Settled</TableHead>
                    <TableHead>Receipt</TableHead>
                    {hasAnyAction && <TableHead className="w-28">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item, idx) => (
                    <TableRow key={item.id} className="h-12">
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{item.academic_year_label}</TableCell>
                      <TableCell className="font-medium">{item.fee_type_name}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={item.source === 'manual_entry' ? 'draft' : 'processed'}
                          label={item.source === 'manual_entry' ? 'Manual' : 'Carry Forward'}
                        />
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.original_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.paid_amount)}</TableCell>
                      <TableCell className={`text-right font-semibold ${item.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(item.outstanding)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.is_settled} />
                      </TableCell>
                      <TableCell className="text-sm">{item.receipt_manual || item.receipt_system || '-'}</TableCell>
                      {hasAnyAction && (
                        <TableCell>
                          <TableActionGroup>
                            {canUpdate && <EditButton onClick={() => handleEditOpen(item)} />}
                            {canUpdate && !item.is_settled && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                title="Mark as Settled"
                                onClick={() => setSettleId(item.id)}
                              >
                                <span className="text-xs font-bold">S</span>
                              </Button>
                            )}
                            {canDelete && item.source === 'manual_entry' && !item.is_settled && (
                              <DeleteButton onClick={() => setDeleteId(item.id)} />
                            )}
                          </TableActionGroup>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}

                  {/* Totals */}
                  <TableRow className="bg-muted/50 font-semibold h-12">
                    <TableCell colSpan={4}>Grand Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.grand_total_original)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.grand_total_paid)}</TableCell>
                    <TableCell className={`text-right ${data.grand_total_outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(data.grand_total_outstanding)}
                    </TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Manual Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Old Fee Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Academic Year Label *</Label>
              <Input placeholder="e.g. 2024-25" {...addForm.register('academic_year_label')} />
              {addForm.formState.errors.academic_year_label && (
                <p className="text-sm text-destructive">{addForm.formState.errors.academic_year_label.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Fee Type Name *</Label>
              <Input placeholder="e.g. Tuition Fee" {...addForm.register('fee_type_name')} />
              {addForm.formState.errors.fee_type_name && (
                <p className="text-sm text-destructive">{addForm.formState.errors.fee_type_name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Original Amount *</Label>
                <Input type="number" step="0.01" min="0.01" {...addForm.register('original_amount', { valueAsNumber: true })} />
                {addForm.formState.errors.original_amount && (
                  <p className="text-sm text-destructive">{addForm.formState.errors.original_amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Paid Amount</Label>
                <Input type="number" step="0.01" min="0" {...addForm.register('paid_amount', { valueAsNumber: true })} />
                {addForm.formState.errors.paid_amount && (
                  <p className="text-sm text-destructive">{addForm.formState.errors.paid_amount.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Receipt Number</Label>
              <Input placeholder="Optional" {...addForm.register('receipt_manual')} />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea placeholder="Optional" {...addForm.register('remarks')} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Entry'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Carry Forward Dialog */}
      <Dialog open={showCarryForwardDialog} onOpenChange={setShowCarryForwardDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Carry Forward Old Fees</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Source Academic Year</Label>
              <Select value={sourceYearId} onValueChange={setSourceYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select previous year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears
                    .filter((y) => String(y.id) !== selectedAcademicYearId)
                    .map((y) => (
                      <SelectItem key={y.id} value={String(y.id)}>{y.title}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Target Academic Year</Label>
              <Input
                value={academicYears.find((y) => String(y.id) === selectedAcademicYearId)?.title || 'Current Year'}
                disabled
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This will copy all unpaid fee items from the source year as old fee records in the current year.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCarryForwardDialog(false)}>Cancel</Button>
              <Button
                onClick={handleCarryForward}
                disabled={!sourceYearId || carryForwardMutation.isPending}
              >
                {carryForwardMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Carry Forward'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Old Fee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paid Amount</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={editData.paid_amount ?? ''}
                onChange={(e) => setEditData((d) => ({ ...d, paid_amount: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Paid Date</Label>
              <Input
                type="date"
                value={editData.paid_date ?? ''}
                onChange={(e) => setEditData((d) => ({ ...d, paid_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Receipt Number</Label>
              <Input
                value={editData.receipt_manual ?? ''}
                onChange={(e) => setEditData((d) => ({ ...d, receipt_manual: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={editData.remarks ?? ''}
                onChange={(e) => setEditData((d) => ({ ...d, remarks: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settle Confirm */}
      <AlertDialog open={!!settleId} onOpenChange={(open) => { if (!open) setSettleId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Settled</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this old fee as settled? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSettleConfirm}>Settle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Old Fee Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this manual old fee entry? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
