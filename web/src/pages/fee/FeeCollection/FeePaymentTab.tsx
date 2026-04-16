import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { feeReceiptsApi } from '@/api/fee/receipts';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePayFee, useFeeSummary } from '@/hooks/fee';
import { formatCurrency } from './FeeSummaryTab';
import type { FeePaymentResponse, CollectionPaymentMethod, FeePaymentRequest } from '@/types/fee';

const PAYMENT_METHODS: { value: CollectionPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'dd', label: 'Demand Draft' },
];

const paymentSchema = z.object({
  amount_to_pay: z.number({ required_error: 'Amount is required' }).positive('Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'upi', 'cheque', 'bank_transfer', 'dd'] as const),
  upi_reference: z.string().optional(),
  bank_reference: z.string().optional(),
  cheque_number: z.string().optional(),
  cheque_bank: z.string().optional(),
  cheque_date: z.string().optional(),
  send_sms: z.boolean(),
  print_duplicate: z.boolean(),
  remarks: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.payment_method === 'upi' && !data.upi_reference) {
    ctx.addIssue({ code: 'custom', message: 'UPI reference is required', path: ['upi_reference'] });
  }
  if (data.payment_method === 'cheque' || data.payment_method === 'dd') {
    if (!data.cheque_number) ctx.addIssue({ code: 'custom', message: 'Cheque/DD number is required', path: ['cheque_number'] });
    if (!data.cheque_bank) ctx.addIssue({ code: 'custom', message: 'Bank name is required', path: ['cheque_bank'] });
    if (!data.cheque_date) ctx.addIssue({ code: 'custom', message: 'Cheque/DD date is required', path: ['cheque_date'] });
  }
  if (data.payment_method === 'bank_transfer' && !data.bank_reference) {
    ctx.addIssue({ code: 'custom', message: 'Bank reference is required', path: ['bank_reference'] });
  }
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface FeePaymentTabProps {
  studentId: string;
  studentName: string;
  onPaymentSuccess?: () => void;
}

export default function FeePaymentTab({ studentId, studentName, onPaymentSuccess }: FeePaymentTabProps) {
  const { selectedAcademicYearId } = useAcademicYearStore();
  const { data: summaryData } = useFeeSummary(studentId, selectedAcademicYearId);
  const payFeeMutation = usePayFee();

  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState<FeePaymentResponse | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_method: 'cash',
      send_sms: true,
      print_duplicate: false,
    },
  });

  const paymentMethod = watch('payment_method');
  const amountToPay = watch('amount_to_pay');
  const totalDue = summaryData?.grand_total_due ?? 0;

  function onSubmitForm() {
    setShowConfirm(true);
  }

  function handleConfirmPayment() {
    setShowConfirm(false);
    const formData = watch();

    // Clean up optional fields - remove undefined/empty values
    const cleanedData: Record<string, any> = {
      student_id: studentId,
      academic_year_id: selectedAcademicYearId,
      amount_to_pay: formData.amount_to_pay,
      payment_method: formData.payment_method,
      send_sms: formData.send_sms,
      print_duplicate: formData.print_duplicate,
    };

    // Add optional fields only if they have values
    if (formData.upi_reference) cleanedData.upi_reference = formData.upi_reference;
    if (formData.bank_reference) cleanedData.bank_reference = formData.bank_reference;
    if (formData.cheque_number) cleanedData.cheque_number = formData.cheque_number;
    if (formData.cheque_bank) cleanedData.cheque_bank = formData.cheque_bank;
    if (formData.cheque_date) cleanedData.cheque_date = formData.cheque_date;
    if (formData.remarks) cleanedData.remarks = formData.remarks;

    payFeeMutation.mutate(cleanedData as FeePaymentRequest, {
      onSuccess: (result) => {
        setPaymentResult(result);
        setShowSuccess(true);
        reset();
      },
    });
  }

  function handleCloseSuccess() {
    setShowSuccess(false);
    setPaymentResult(null);
    onPaymentSuccess?.();
  }

  return (
    <div className="space-y-4">
      {/* Due Amount Display */}
      {summaryData && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Due Amount</span>
              <span className={`text-xl font-bold ${totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(totalDue)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Collect Payment</CardTitle>
        </CardHeader>
        <CardContent>
          {payFeeMutation.isError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
              {payFeeMutation.error?.message || 'Failed to process payment. Please try again.'}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount to Pay *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={totalDue || undefined}
                  placeholder="0.00"
                  {...register('amount_to_pay', { valueAsNumber: true })}
                />
                {errors.amount_to_pay && (
                  <p className="text-sm text-destructive">{errors.amount_to_pay.message}</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setValue('payment_method', v as CollectionPaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* UPI Reference */}
              {paymentMethod === 'upi' && (
                <div className="space-y-2">
                  <Label htmlFor="upi_ref">UPI Reference *</Label>
                  <Input id="upi_ref" placeholder="e.g. 1234567890@upi" {...register('upi_reference')} />
                  {errors.upi_reference && (
                    <p className="text-sm text-destructive">{errors.upi_reference.message}</p>
                  )}
                </div>
              )}

              {/* Cheque / DD Fields */}
              {(paymentMethod === 'cheque' || paymentMethod === 'dd') && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="cheque_num">{paymentMethod === 'dd' ? 'DD Number' : 'Cheque Number'} *</Label>
                    <Input id="cheque_num" placeholder={paymentMethod === 'dd' ? 'e.g. DD123456' : 'e.g. CHQ123456'} {...register('cheque_number')} />
                    {errors.cheque_number && (
                      <p className="text-sm text-destructive">{errors.cheque_number.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cheque_bank">Bank Name *</Label>
                    <Input id="cheque_bank" placeholder="e.g. SBI" {...register('cheque_bank')} />
                    {errors.cheque_bank && (
                      <p className="text-sm text-destructive">{errors.cheque_bank.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cheque_date">{paymentMethod === 'dd' ? 'DD Date' : 'Cheque Date'} *</Label>
                    <Input id="cheque_date" type="date" {...register('cheque_date')} />
                    {errors.cheque_date && (
                      <p className="text-sm text-destructive">{errors.cheque_date.message}</p>
                    )}
                  </div>
                </>
              )}

              {/* Bank Transfer Reference */}
              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-2">
                  <Label htmlFor="bank_ref">Bank Reference *</Label>
                  <Input id="bank_ref" placeholder="e.g. TXN123456789" {...register('bank_reference')} />
                  {errors.bank_reference && (
                    <p className="text-sm text-destructive">{errors.bank_reference.message}</p>
                  )}
                </div>
              )}
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" placeholder="Optional notes" {...register('remarks')} />
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="send_sms"
                  checked={watch('send_sms')}
                  onCheckedChange={(v) => setValue('send_sms', v)}
                />
                <Label htmlFor="send_sms" className="cursor-pointer">Send SMS</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="print_dup"
                  checked={watch('print_duplicate')}
                  onCheckedChange={(v) => setValue('print_duplicate', v)}
                />
                <Label htmlFor="print_dup" className="cursor-pointer">Print Duplicate</Label>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={payFeeMutation.isPending || !amountToPay || amountToPay <= 0 || Object.keys(errors).length > 0}
              className="w-full md:w-auto"
            >
              {payFeeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...
                </>
              ) : (
                'Collect Payment'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Collect <strong>{amountToPay ? formatCurrency(amountToPay) : '...'}</strong> from{' '}
              <strong>{studentName}</strong> via{' '}
              <strong>{PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPayment}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={(open) => { if (!open) handleCloseSuccess(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" /> Payment Successful
            </DialogTitle>
          </DialogHeader>
          {paymentResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Transaction #:</span>
                <span className="font-medium">{paymentResult.transaction_number}</span>
                <span className="text-muted-foreground">Receipt #:</span>
                <span className="font-medium">{paymentResult.receipt_number}</span>
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-medium">{formatCurrency(paymentResult.amount_paid)}</span>
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-medium capitalize">{paymentResult.payment_method.replace('_', ' ')}</span>
                <span className="text-muted-foreground">SMS Status:</span>
                <StatusBadge status={paymentResult.sms_status} />
              </div>

              {paymentResult.items_paid.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Items Paid</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fee Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentResult.items_paid.map((item) => (
                        <TableRow key={item.fee_type_id}>
                          <TableCell>{item.fee_type_name}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.amount_paid)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={isDownloading}
                  onClick={async () => {
                    if (isDownloading) return;
                    setIsDownloading(true);
                    try {
                      await feeReceiptsApi.downloadReceiptPdf(paymentResult.receipt_id, paymentResult.receipt_number);
                      toast.success('Receipt downloaded');
                    } catch {
                      toast.error('Failed to download receipt');
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                >
                  {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Download Receipt
                </Button>
                <Button onClick={handleCloseSuccess}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
