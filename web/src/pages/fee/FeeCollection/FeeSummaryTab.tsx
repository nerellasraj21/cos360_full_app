import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2, MessageSquare, Phone } from 'lucide-react';
import { useState } from 'react';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFeeSummary, useFeeSummarySmsPreview, useSendFeeSummarySms } from '@/hooks/fee';
import type { SmsSummaryPreview } from '@/types/fee';

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface FeeSummaryItem {
  s_no: number;
  fee_type_id: string;
  fee_type_name: string;
  assigned_fee: number;
  fee_after_concession: number;
  paid_amount: number;
  due_amount: number;
  last_paid_date: string | null;
  last_receipt_number: string | null;
  remarks: string | null;
}

interface FeeSummaryTabProps {
  studentId: string;
  onNavigateToOldFees?: () => void;
}

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (isSorted === 'asc') return <ArrowUp className="ml-1 h-3 w-3 inline" />;
  if (isSorted === 'desc') return <ArrowDown className="ml-1 h-3 w-3 inline" />;
  return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />;
}

const columns: ColumnDef<FeeSummaryItem>[] = [
  {
    accessorKey: 's_no',
    header: 'S.No.',
    size: 60,
  },
  {
    accessorKey: 'fee_type_name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Fee Type
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'assigned_fee',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 font-medium w-full justify-end"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Actual Amount
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ getValue }) => (
      <div className="text-right">{formatCurrency(getValue<number>())}</div>
    ),
  },
  {
    accessorKey: 'fee_after_concession',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 font-medium w-full justify-end"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Payable Amount
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ getValue }) => (
      <div className="text-right">{formatCurrency(getValue<number>())}</div>
    ),
  },
  {
    accessorKey: 'paid_amount',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 font-medium w-full justify-end"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Paid
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ getValue }) => (
      <div className="text-right">{formatCurrency(getValue<number>())}</div>
    ),
  },
  {
    accessorKey: 'due_amount',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 font-medium w-full justify-end"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Due
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ getValue }) => {
      const due = getValue<number>();
      return (
        <div className={`text-right font-semibold ${due > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatCurrency(due)}
        </div>
      );
    },
  },
  {
    accessorKey: 'last_paid_date',
    header: 'Last Paid',
    cell: ({ getValue }) => {
      const val = getValue<string | null>();
      return (
        <span className="text-sm">
          {val ? new Date(val).toLocaleDateString('en-IN') : '-'}
        </span>
      );
    },
  },
  {
    accessorKey: 'last_receipt_number',
    header: 'Receipt #',
    cell: ({ getValue }) => (
      <span className="text-sm">{getValue<string | null>() || '-'}</span>
    ),
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
    cell: ({ getValue }) => (
      <span className="text-sm text-muted-foreground">{getValue<string | null>() || '-'}</span>
    ),
  },
];

export default function FeeSummaryTab({ studentId, onNavigateToOldFees }: FeeSummaryTabProps) {
  const { selectedAcademicYearId } = useAcademicYearStore();
  const { data, isLoading, isError, error } = useFeeSummary(studentId, selectedAcademicYearId);
  const previewMutation = useFeeSummarySmsPreview();
  const sendSmsMutation = useSendFeeSummarySms();
  const [preview, setPreview] = useState<SmsSummaryPreview | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  function handleSendSmsClick() {
    previewMutation.mutate(
      { studentId, academicYearId: selectedAcademicYearId },
      { onSuccess: (data) => setPreview(data) }
    );
  }

  function handleConfirmSend() {
    sendSmsMutation.mutate(
      { studentId, academicYearId: selectedAcademicYearId },
      { onSuccess: () => setPreview(null) }
    );
  }

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Loading fee summary...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-4 text-sm text-destructive">
        {(error as Error)?.message || 'Failed to load fee summary'}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No fee data available for this student.
      </div>
    );
  }

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Fee Summary</CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>As of {data.as_of_date}</span>
              <span>|</span>
              <span>AY: {data.academic_year}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendSmsClick}
              disabled={previewMutation.isPending}
            >
              {previewMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-1" />
              )}
              Send SMS
            </Button>
          </div>
        </div>
        {data.old_fee_pending_amount > 0 && (
          <Badge
            variant="destructive"
            className="cursor-pointer w-fit mt-2"
            onClick={onNavigateToOldFees}
          >
            Old Fee Pending: {formatCurrency(data.old_fee_pending_amount)} — View
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="h-12">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow className="bg-muted/50 font-semibold h-12">
                <TableCell colSpan={2}>Grand Total</TableCell>
                <TableCell className="text-right">{formatCurrency(data.grand_total_assigned)}</TableCell>
                <TableCell className="text-right">{formatCurrency(data.grand_total_fee)}</TableCell>
                <TableCell className="text-right">{formatCurrency(data.grand_total_paid)}</TableCell>
                <TableCell className={`text-right ${data.grand_total_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(data.grand_total_due)}
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    {/* SMS Confirmation Dialog */}
    <Dialog open={!!preview} onOpenChange={(open) => { if (!open) setPreview(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm SMS</DialogTitle>
        </DialogHeader>

        {preview && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span className="font-mono">{preview.parent_phone}</span>
              <span className="text-xs">({preview.parent_name})</span>
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-sm leading-relaxed">
              {preview.message}
            </div>

            {!preview.can_send && (
              <p className="text-xs text-destructive">
                No phone number on record — SMS cannot be delivered.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setPreview(null)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSend}
            disabled={!preview?.can_send || sendSmsMutation.isPending}
          >
            {sendSmsMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <MessageSquare className="h-4 w-4 mr-1" />
            )}
            Confirm &amp; Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
