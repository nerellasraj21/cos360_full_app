import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { EditButton, DeleteButton, TableActionGroup } from '@/components/common/TableActions';
import {
  useConcessionSummary,
  useConcessionHistory,
  useBulkCreateConcessions,
  useUpdateConcession,
  useDeleteConcession,
} from '@/hooks/fee';
import { usePermission } from '@/hooks/usePermission';
import { formatCurrency } from './FeeSummaryTab';
import type { ConcessionHistoryItem, ConcessionUpdate } from '@/types/fee';

const APPROVERS = [
  { value: 'owner', label: 'Owner' },
  { value: 'principal', label: 'Principal' },
  { value: 'management', label: 'Management' },
  { value: 'correspondent', label: 'Correspondent' },
];

interface ConcessionRow {
  fee_type_id: string;
  fee_type_name: string;
  assigned_fee: number;
  due_amount: number;
  due_date: string | null;
  is_settled: boolean;
  // The amount for a NEW concession entry being added on top of whatever is
  // already applied (0 unless the user is actively typing one in). This is
  // never pre-filled from an existing record — concessions stack, they
  // don't get silently resubmitted.
  concession_amount: number;
  // The total concession already saved on the backend for this fee type
  // (i.e. already baked into `due_amount`). Purely informational / used to
  // cap the single-record edit in Concession History below.
  original_concession_amount: number;
  reason: string;
  approved_by: string;
}

// Editing a single existing Concession History record: its due_amount
// already has that record's amount applied (due_amount = assigned_fee -
// concession_amount - paid_amount). So the most that one record can be set
// to — without pushing the due amount negative, i.e. "refunding" money
// already collected — is the current due plus what that record already
// contributes.
function maxConcessionFor(dueAmount: number, existingConcessionAmount: number): number {
  return dueAmount + existingConcessionAmount;
}

interface ConcessionTabProps {
  studentId: string;
}

export default function ConcessionTab({ studentId }: ConcessionTabProps) {
  const { selectedAcademicYearId } = useAcademicYearStore();
  const { checkPermission } = usePermission();
  const canCreate = checkPermission('fee_concessions', 'create');
  const canUpdate = checkPermission('fee_concessions', 'update');
  const canDelete = checkPermission('fee_concessions', 'delete');
  const hasAnyHistoryAction = canUpdate || canDelete;
  const { data: summaryData, isLoading } = useConcessionSummary(studentId, selectedAcademicYearId);
  const bulkCreateMutation = useBulkCreateConcessions();

  const [rows, setRows] = useState<ConcessionRow[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Edit/Delete state
  const [editItem, setEditItem] = useState<ConcessionHistoryItem | null>(null);
  const [editData, setEditData] = useState<ConcessionUpdate>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: historyItems = [], isLoading: historyLoading } = useConcessionHistory(
    studentId,
    selectedAcademicYearId,
    historyOpen
  );
  const updateMutation = useUpdateConcession();
  const deleteMutation = useDeleteConcession();

  // Initialize rows from summary data
  useEffect(() => {
    if (summaryData?.items) {
      setRows(
        summaryData.items.map((item) => ({
          fee_type_id: item.fee_type_id,
          fee_type_name: item.fee_type_name,
          assigned_fee: item.assigned_fee,
          due_amount: item.due_amount,
          due_date: item.due_date,
          is_settled: item.is_settled,
          concession_amount: 0,
          original_concession_amount: item.concession_amount || 0,
          reason: '',
          approved_by: '',
        }))
      );
    }
  }, [summaryData]);

  function updateRow(index: number, field: keyof ConcessionRow, value: string | number) {
    setRows((prev) => {
      const next = [...prev];
      const row = next[index];

      // Never let the new concession amount push the due amount below zero.
      // due_amount already nets out any concession(s) already applied, so
      // the cap for an additional entry is simply what's still owed.
      if (field === 'concession_amount') {
        const numericValue = Number(value) || 0;
        const max = row.due_amount;
        if (numericValue > max) {
          toast.error(
            `Concession for ${row.fee_type_name} cannot exceed the due amount of ${formatCurrency(max)}.`
          );
          next[index] = { ...row, concession_amount: max };
          return next;
        }
      }

      next[index] = { ...row, [field]: value };
      return next;
    });
  }

  function handleSaveAll() {
    // /fee/concessions/bulk is a CREATE endpoint — it always creates new
    // concession records, it does not upsert. Concessions stack: a fee type
    // that already has one can get another on top (each amount entered here
    // is always a fresh, additive record — see `concession_amount` init in
    // the effect above, which never pre-fills an existing amount so a save
    // can't accidentally resubmit/duplicate one). Editing or removing a
    // specific existing entry is still done via Concession History below.
    const isValidRow = (r: ConcessionRow) =>
      r.concession_amount > 0 &&
      r.concession_amount <= r.due_amount &&
      r.reason.trim().length >= 5 &&
      !!r.approved_by;
    const isTouchedRow = (r: ConcessionRow) =>
      r.concession_amount > 0 || r.reason.trim().length > 0 || !!r.approved_by;

    const validRows = rows.filter(isValidRow);
    const incompleteRows = rows.filter((r) => isTouchedRow(r) && !isValidRow(r));

    if (validRows.length === 0) {
      toast.error('Enter a concession amount, a reason (min 5 characters), and select an approver before saving.');
      return;
    }

    if (incompleteRows.length > 0) {
      toast.error(
        `Skipped ${incompleteRows.length} incomplete row(s): ${incompleteRows
          .map((r) => r.fee_type_name)
          .join(', ')} — amount, reason (min 5 chars), and approver are all required.`
      );
    }

    const concessions = validRows.map((r) => ({
      fee_type_id: r.fee_type_id,
      concession_amount: r.concession_amount,
      reason: r.reason,
      approved_by: r.approved_by as 'owner' | 'principal' | 'management' | 'correspondent',
    }));

    bulkCreateMutation.mutate({
      student_id: studentId,
      academic_year_id: selectedAcademicYearId,
      concessions,
    });
  }

  function handleEditOpen(item: ConcessionHistoryItem) {
    setEditItem(item);
    setEditData({
      concession_amount: item.amount,
      reason: item.reason,
      approved_by: item.approver,
    });
  }

  // Concession history doesn't carry the fee type's due amount, so look it up
  // from the current summary rows (matched by fee type name) to enforce the
  // same "never push due amount negative" cap in the edit dialog.
  const editMatchedRow = editItem
    ? rows.find((r) => r.fee_type_name === editItem.fee_type_name)
    : undefined;
  const editMaxConcession = editMatchedRow
    ? maxConcessionFor(editMatchedRow.due_amount, editMatchedRow.original_concession_amount)
    : undefined;

  function handleEditAmountChange(value: string) {
    const numericValue = Number(value) || 0;
    if (editMaxConcession !== undefined && numericValue > editMaxConcession) {
      toast.error(`Concession cannot exceed the due amount of ${formatCurrency(editMaxConcession)}.`);
      setEditData((d) => ({ ...d, concession_amount: editMaxConcession }));
      return;
    }
    setEditData((d) => ({ ...d, concession_amount: numericValue }));
  }

  function handleEditSave() {
    if (!editItem) return;
    if (editMaxConcession !== undefined && (editData.concession_amount ?? 0) > editMaxConcession) {
      toast.error(`Concession cannot exceed the due amount of ${formatCurrency(editMaxConcession)}.`);
      return;
    }
    updateMutation.mutate(
      { id: editItem.id, data: editData },
      { onSuccess: () => setEditItem(null) }
    );
  }

  function handleDeleteConfirm() {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  }


  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Loading concession data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Concessions (Editable) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Apply Concessions</CardTitle>
            {canCreate && (
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={bulkCreateMutation.isPending}
              >
                {bulkCreateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...
                  </>
                ) : (
                  'Save All Concessions'
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">S.No.</TableHead>
                  <TableHead>Fee Type</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">Due Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Settled</TableHead>
                  <TableHead className="w-32">Concession Amt</TableHead>
                  <TableHead className="w-48">Reason (min 5 chars)</TableHead>
                  <TableHead className="w-40">Approved By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => {
                  // Already has a saved concession — still editable here,
                  // but whatever is typed is a NEW additive entry on top of
                  // it (see handleSaveAll), not a replacement.
                  const isLocked = row.original_concession_amount > 0;
                  return (
                  <TableRow key={row.fee_type_id} className="h-12">
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{row.fee_type_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.assigned_fee)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.due_amount)}</TableCell>
                    <TableCell className="text-sm">
                      {row.due_date ? new Date(row.due_date).toLocaleDateString('en-IN') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.is_settled ? 'default' : 'destructive'}>
                        {row.is_settled ? 'Settled' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={row.due_amount}
                        step="0.01"
                        value={row.concession_amount || ''}
                        onChange={(e) => canCreate && updateRow(idx, 'concession_amount', Number(e.target.value))}
                        readOnly={!canCreate}
                        placeholder={isLocked ? 'Add more...' : undefined}
                        title={isLocked ? `${formatCurrency(row.original_concession_amount)} already applied — this adds a new entry on top` : undefined}
                        className="h-8 w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.reason}
                        onChange={(e) => canCreate && updateRow(idx, 'reason', e.target.value)}
                        readOnly={!canCreate}
                        placeholder="Reason..."
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.approved_by}
                        onValueChange={(v) => canCreate && updateRow(idx, 'approved_by', v)}
                        disabled={!canCreate}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {APPROVERS.map((a) => (
                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                  );
                })}

                {/* Totals */}
                {summaryData && (
                  <TableRow className="bg-muted/50 font-semibold h-12">
                    <TableCell colSpan={2}>Grand Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(summaryData.grand_total_assigned)}</TableCell>
                    <TableCell colSpan={3} />
                    <TableCell>{formatCurrency(summaryData.grand_total_concession)}</TableCell>
                    <TableCell colSpan={2}>
                      After Concession: {formatCurrency(summaryData.grand_total_fee_after_concession)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Concession History (Collapsible) */}
      <Card>
        <CardHeader
          className="pb-3 cursor-pointer"
          onClick={() => setHistoryOpen((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Concession History</CardTitle>
            {historyOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {historyOpen && (
          <CardContent className="p-0">
            {historyLoading ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : historyItems.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No concession history found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Approver</TableHead>
                      <TableHead>Recorded By</TableHead>
                      {hasAnyHistoryAction && <TableHead className="w-20">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyItems.map((item) => (
                      <TableRow key={item.id} className="h-12">
                        <TableCell className="text-sm">
                          {new Date(item.date_applied).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>{item.fee_type_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                        <TableCell className="text-sm">{item.reason}</TableCell>
                        <TableCell className="text-sm capitalize">{item.approver}</TableCell>
                        <TableCell className="text-sm">{item.recorded_by_staff_name || '-'}</TableCell>
                        {hasAnyHistoryAction && (
                          <TableCell>
                            <TableActionGroup>
                              {canUpdate && <EditButton onClick={() => handleEditOpen(item)} />}
                              {canDelete && <DeleteButton onClick={() => setDeleteId(item.id)} />}
                            </TableActionGroup>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Concession</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Concession Amount</Label>
              <Input
                type="number"
                min={0}
                max={editMaxConcession}
                step="0.01"
                value={editData.concession_amount ?? ''}
                onChange={(e) => handleEditAmountChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason (min 5 characters)</Label>
              <Input
                value={editData.reason ?? ''}
                onChange={(e) => setEditData((d) => ({ ...d, reason: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Approved By</Label>
              <Select
                value={editData.approved_by ?? ''}
                onValueChange={(v) => setEditData((d) => ({ ...d, approved_by: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {APPROVERS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button
                onClick={handleEditSave}
                disabled={updateMutation.isPending || !editData.reason || (editData.reason?.length ?? 0) < 5}
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Concession</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this concession? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Revoke</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
