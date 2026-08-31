import { useState } from 'react';
import { Receipt, Loader2, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMyReceipts, useMyChildrenReceipts } from '@/api/hooks/fee/receipts';
import { downloadReceiptPdf } from '@/api/fee/receipts';
import { useAuthStore } from '@/lib/authStore';
import { toast } from 'sonner';

export default function MyReceiptsPage() {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const role = useAuthStore((s) => s.role);
  const selectedStudent = useAuthStore((s) => s.selectedStudent);
  const availableStudents = useAuthStore((s) => s.availableStudents);
  const isParent = role?.name.toLowerCase() === 'parent';

  // Parent has no fee_receipts:list_own grant (that's Student-only), so its
  // query must call the list_related endpoint instead — same role-branch
  // pattern as My Transactions. Only the query matching the current role is
  // ever enabled — the other role's endpoint 403s.
  const mine = useMyReceipts(!isParent);
  const childrens = useMyChildrenReceipts(isParent);
  const { data: allReceipts = [], isLoading, isError, error } = isParent ? childrens : mine;

  // Filter the combined "all children" list down to whichever child is
  // active in the header switcher so the parent sees exactly one child at a
  // time, same as the student's own view above.
  const receipts = isParent
    ? allReceipts.filter((r) => r.student_admission_num === selectedStudent?.admission_number)
    : allReceipts;

  const handleDownload = async (receiptId: string, receiptNumber: string) => {
    try {
      setDownloadingId(receiptId);
      await downloadReceiptPdf(receiptId, receiptNumber);
    } catch {
      toast.error('Failed to download receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Receipts"
        subtitle={
          isParent
            ? selectedStudent
              ? `Fee payment receipts for ${selectedStudent.name}`
              : "View and download your children's fee payment receipts"
            : 'View and download your fee payment receipts'
        }
        icon={<Receipt className="h-5 w-5" />}
      />

      {isParent && availableStudents.length > 0 && !selectedStudent && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No child selected. Use the child switcher in the header above.
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading receipts...</span>
        </div>
      )}

      {isError && (
        <div className="text-center py-4 text-sm text-destructive">
          {(error as Error)?.message || 'Failed to load receipts'}
        </div>
      )}

      {!isLoading && !isError && (!isParent || selectedStudent) && receipts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No receipts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Receipts will appear here once a fee payment is recorded for you.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && (!isParent || selectedStudent) && receipts.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">S.No.</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead>Class / Section</TableHead>
                    <TableHead>Generated On</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt, idx) => (
                    <TableRow key={receipt.id} className="h-12">
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                      <TableCell>{receipt.academic_year}</TableCell>
                      <TableCell>{receipt.class_section}</TableCell>
                      <TableCell className="text-sm">
                        {receipt.generated_at
                          ? new Date(receipt.generated_at).toLocaleDateString('en-IN')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={downloadingId === receipt.id}
                          onClick={() => handleDownload(receipt.id, receipt.receipt_number)}
                        >
                          {downloadingId === receipt.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
