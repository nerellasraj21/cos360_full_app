import { Loader2 } from 'lucide-react';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFeeSummary } from '@/hooks/fee';

export function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface FeeSummaryTabProps {
  studentId: string;
  onNavigateToOldFees?: () => void;
}

export default function FeeSummaryTab({ studentId, onNavigateToOldFees }: FeeSummaryTabProps) {
  const { selectedAcademicYearId } = useAcademicYearStore();
  const { data, isLoading, isError, error } = useFeeSummary(studentId, selectedAcademicYearId);

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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Fee Summary</CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>As of {data.as_of_date}</span>
            <span>|</span>
            <span>AY: {data.academic_year}</span>
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
              <TableRow>
                <TableHead className="w-16">S.No.</TableHead>
                <TableHead>Fee Type</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
                <TableHead className="text-right">After Concession</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead>Last Paid</TableHead>
                <TableHead>Receipt #</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.fee_type_id} className="h-12">
                  <TableCell>{item.s_no}</TableCell>
                  <TableCell className="font-medium">{item.fee_type_name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.assigned_fee)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.fee_after_concession)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.paid_amount)}</TableCell>
                  <TableCell className={`text-right font-semibold ${item.due_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(item.due_amount)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.last_paid_date
                      ? new Date(item.last_paid_date).toLocaleDateString('en-IN')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm">{item.last_receipt_number || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.remarks || '-'}</TableCell>
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
  );
}
