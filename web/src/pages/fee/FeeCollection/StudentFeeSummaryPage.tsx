import { DollarSign, Loader2 } from 'lucide-react';
import { useAcademicYearStore } from '@/lib/academicYearStore';
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
import { useMyFeeSummary } from '@/hooks/fee';
import { formatCurrency } from './FeeSummaryTab';

export default function StudentFeeSummaryPage() {
  const { selectedAcademicYearId } = useAcademicYearStore();
  const { data, isLoading, isError, error } = useMyFeeSummary(selectedAcademicYearId);

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
              <span>Student: <strong className="text-foreground">{data.student_name}</strong></span>
              <span>Class: <strong className="text-foreground">{data.class_name} - {data.section_name}</strong></span>
              <span>AY: <strong className="text-foreground">{data.academic_year}</strong></span>
            </div>
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
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold h-12">
                    <TableCell colSpan={2}>Grand Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.grand_total_assigned)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.grand_total_fee)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.grand_total_paid)}</TableCell>
                    <TableCell className={`text-right ${data.grand_total_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(data.grand_total_due)}
                    </TableCell>
                    <TableCell colSpan={2} />
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
