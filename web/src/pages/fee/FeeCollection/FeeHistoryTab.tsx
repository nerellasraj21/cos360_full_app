import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFeeHistory } from '@/hooks/fee';
import { feeReceiptsApi } from '@/api/fee';
import { formatCurrency } from './FeeSummaryTab';
import type { FeeHistoryItem } from '@/types/fee';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  dd: 'DD',
};

function SortIcon({ isSorted }: { isSorted: false | 'asc' | 'desc' }) {
  if (isSorted === 'asc') return <ArrowUp className="ml-1 h-3 w-3 inline" />;
  if (isSorted === 'desc') return <ArrowDown className="ml-1 h-3 w-3 inline" />;
  return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />;
}

function DownloadReceiptButton({ receiptId, receiptNumber }: { receiptId: string; receiptNumber: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    if (loading) return;
    setLoading(true);
    try {
      await feeReceiptsApi.downloadReceiptPdf(receiptId, receiptNumber);
      toast.success('Receipt downloaded');
    } catch {
      toast.error('Failed to download receipt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDownload} disabled={loading} title="Download Receipt PDF">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </Button>
  );
}

const columns: ColumnDef<FeeHistoryItem>[] = [
  {
    accessorKey: 's_no',
    header: 'S.No.',
    size: 60,
  },
  {
    accessorKey: 'transaction_date',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Date
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ getValue }) => (
      <span className="text-sm">
        {new Date(getValue<string>()).toLocaleDateString('en-IN')}
      </span>
    ),
  },
  {
    accessorKey: 'receipt_number',
    header: 'Receipt No',
    cell: ({ getValue }) => (
      <span className="text-sm font-mono">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'amount_paid',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 font-medium w-full justify-end"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Amount Paid
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ getValue }) => (
      <div className="text-right font-medium">{formatCurrency(getValue<number>())}</div>
    ),
  },
  {
    accessorKey: 'payment_method',
    header: 'Payment Method',
    cell: ({ getValue }) => {
      const method = getValue<string>();
      return <Badge variant="outline">{PAYMENT_METHOD_LABELS[method] ?? method}</Badge>;
    },
  },
  {
    accessorKey: 'fee_types_paid',
    header: 'Fee Types Paid',
    enableSorting: false,
    cell: ({ getValue }) => {
      const types = getValue<FeeHistoryItem['fee_types_paid']>();
      return (
        <span className="text-sm text-muted-foreground">
          {(types ?? []).map((t) => t.fee_type_name).join(', ') || '-'}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: '',
    size: 48,
    enableSorting: false,
    cell: ({ row }) => (
      <DownloadReceiptButton
        receiptId={row.original.receipt_id}
        receiptNumber={row.original.receipt_number}
      />
    ),
  },
];

interface FeeHistoryTabProps {
  studentId: string;
  isActive: boolean;
}

export default function FeeHistoryTab({ studentId, isActive }: FeeHistoryTabProps) {
  const { selectedAcademicYearId } = useAcademicYearStore();
  const { data, isLoading, isError, error } = useFeeHistory(studentId, selectedAcademicYearId, isActive);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'transaction_date', desc: true }]);

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
        <span className="ml-2 text-sm text-muted-foreground">Loading payment history...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-4 text-sm text-destructive">
        {(error as Error)?.message || 'Failed to load fee history'}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Fee Payment History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {!data || !data.items || data.items.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No payment records found for this academic year.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      >
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

                {/* Grand Total row */}
                <TableRow className="bg-muted/50 font-semibold h-12">
                  <TableCell colSpan={3}>Total Paid</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.total_paid ?? 0)}</TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
