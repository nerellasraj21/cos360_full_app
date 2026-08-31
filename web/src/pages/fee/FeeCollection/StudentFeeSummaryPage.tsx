import { DollarSign, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMyOutstandingFees } from '@/api/hooks/fee/transactions';
import { formatCurrency } from './FeeSummaryTab';

export default function StudentFeeSummaryPage() {
  const { data, isLoading, isError, error } = useMyOutstandingFees();

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Fee Summary"
        subtitle="View your current fee status"
        icon={<DollarSign className="h-5 w-5" />}
      />

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading fee summary...</span>
        </div>
      )}

      {isError && (
        <div className="text-center py-4 text-sm text-destructive">
          {(error as Error)?.message || 'Failed to load fee summary'}
        </div>
      )}

      {data && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b text-sm text-muted-foreground flex gap-4">
              <span>Admission #: <strong className="text-foreground">{data.student_admission_num}</strong></span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">S.No.</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Fee Term</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.outstanding_items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No outstanding fees — you're all paid up.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.outstanding_items.map((item, idx) => (
                      <TableRow key={`${item.fee_type_id}-${item.fee_term_id}`} className="h-12">
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{item.fee_type_name}</TableCell>
                        <TableCell>{item.fee_term_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount_due)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.amount_paid)}</TableCell>
                        <TableCell className={`text-right font-semibold ${item.outstanding_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(item.outstanding_amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="bg-muted/50 font-semibold h-12">
                    <TableCell colSpan={5}>Total Outstanding</TableCell>
                    <TableCell className={`text-right ${data.total_outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(data.total_outstanding)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
