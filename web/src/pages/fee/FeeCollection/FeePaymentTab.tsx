import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { feeReceiptsApi } from '@/api/fee/receipts';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { QuickSendButton } from '@/components/communication/QuickSendButton';
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
import { usePayFee, useFeeSummary, useTermsDue, useConcessionSummary } from '@/hooks/fee';
import { usePermission } from '@/hooks/usePermission';
import { formatCurrency } from './FeeSummaryTab';
import type { FeePaymentResponse, CollectionPaymentMethod, FeePaymentRequest } from '@/types/fee';


const PAYMENT_METHODS: { value: CollectionPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'dd', label: 'Demand Draft' },
];

function generateReceiptNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const seq = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  return `RCP-${yy}${mm}${dd}-${seq}`;
}

const paymentSchema = z.object({
  receipt_number: z.string().min(1, 'Receipt number is required').max(30, 'Max 30 characters'),
  amount_to_pay: z.number({ required_error: 'Amount is required' }).positive('Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'upi', 'cheque', 'bank_transfer', 'dd'] as const),
  upi_reference: z.string().max(30, 'Max 30 characters').optional(),
  bank_reference: z.string().max(30, 'Max 30 characters').optional(),
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
    if (!data.cheque_date) {
      ctx.addIssue({ code: 'custom', message: 'Cheque/DD date is required', path: ['cheque_date'] });
    } else {
      const chequeDate = new Date(data.cheque_date);
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      maxDate.setHours(23, 59, 59, 999);
      if (chequeDate > maxDate) {
        ctx.addIssue({ code: 'custom', message: 'Cheque/DD date cannot be more than 90 days in the future', path: ['cheque_date'] });
      }
    }
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
  const { checkPermission } = usePermission();
  const canCreate = checkPermission('fee_transactions', 'create');

  // Fetch ALL this student's term installment dates using a far-future sentinel.
  // useTermsDue is student-scoped, so it returns only dates relevant to this student's fee types.
  const { data: allTermsDue, isLoading: allTermsLoading } = useTermsDue(
    studentId,
    selectedAcademicYearId,
    '2099-12-31'
  );

  const installmentOptions = useMemo(() => {
    if (!allTermsDue) return [];
    const allItems = [
      ...(allTermsDue.overdue_terms ?? []),
      ...(allTermsDue.current_month_terms ?? []),
    ];
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    allItems
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .forEach((item) => {
        if (!seen.has(item.due_date)) {
          seen.add(item.due_date);
          const displayDate = new Date(item.due_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
          options.push({
            value: item.due_date,
            label: `${item.term_name} (${displayDate})`,
          });
        }
      });
    return options;
  }, [allTermsDue]);

  const [asOfDate, setAsOfDate] = useState('');
  const { data: termsDue, isFetching: termsFetching } = useTermsDue(studentId, selectedAcademicYearId, asOfDate);
  const { data: concessionData } = useConcessionSummary(studentId, selectedAcademicYearId);

  // Compute fee rows — concession-adjusted pending amounts per fee type up to selected date
  const feeRows = useMemo(() => {
    if (!asOfDate || !termsDue) return [];
    const all = [...(termsDue.overdue_terms ?? []), ...(termsDue.current_month_terms ?? [])];

    // Sum raw pending per fee type
    const map = new Map<string, { name: string; amount: number }>();
    all.forEach((item) => {
      const ex = map.get(item.fee_type_id);
      if (ex) ex.amount += item.pending_amount;
      else map.set(item.fee_type_id, { name: item.fee_type_name, amount: item.pending_amount });
    });

    // Apply concession per fee type
    concessionData?.items.forEach((c) => {
      const entry = map.get(c.fee_type_id);
      if (entry && c.concession_amount > 0) {
        entry.amount = Math.max(0, entry.amount - c.concession_amount);
      }
    });

    const rows: { fee_type_id: string; fee_type_name: string; amount: number }[] = [];
    map.forEach((v, k) => { if (v.amount > 0) rows.push({ fee_type_id: k, fee_type_name: v.name, amount: v.amount }); });
    return rows;
  }, [asOfDate, termsDue, concessionData]);

  // Received amounts per fee type — blank by default, user enters what they collect
  const [receivedAmounts, setReceivedAmounts] = useState<Record<string, string>>({});
  useEffect(() => {
    setReceivedAmounts({});
  }, [feeRows]);

  const totalReceived = feeRows.reduce((s, r) => s + (parseFloat(receivedAmounts[r.fee_type_id] || '0') || 0), 0);

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
      receipt_number: generateReceiptNumber(),
      payment_method: 'cash',
      send_sms: true,
      print_duplicate: false,
    },
  });

  const paymentMethod = watch('payment_method');
  const totalDue = summaryData?.grand_total_due ?? 0;

  // Keep amount_to_pay in sync with the receivedAmounts table so Zod validates correctly on submit
  useEffect(() => {
    setValue('amount_to_pay', totalReceived, { shouldValidate: false });
  }, [totalReceived, setValue]);

  function onSubmitForm() {
    if (!canCreate) {
      toast.error("You don't have permission to collect fee payments.");
      return;
    }
    setShowConfirm(true);
  }

  function handleConfirmPayment() {
    setShowConfirm(false);
    const formData = watch();

    // Carry the per-fee-type amounts the user actually entered through to the
    // API, so payment is applied to the fee types selected — not
    // auto-distributed top-down across whatever fee types have dues.
    const fee_items = feeRows
      .map((row) => ({
        fee_type_id: row.fee_type_id,
        amount: parseFloat(receivedAmounts[row.fee_type_id] || '0') || 0,
      }))
      .filter((item) => item.amount > 0);

    // Clean up optional fields - remove undefined/empty values
    const cleanedData: Record<string, any> = {
      student_id: studentId,
      academic_year_id: selectedAcademicYearId,
      amount_to_pay: formData.amount_to_pay,
      fee_items,
      payment_method: formData.payment_method,
      receipt_number: formData.receipt_number,
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
        reset({ receipt_number: generateReceiptNumber(), payment_method: 'cash', send_sms: true, print_duplicate: false });
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

      {/* Installment Dropdown */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Label className="shrink-0 text-sm">Payment Up To</Label>
            <Select value={asOfDate} onValueChange={setAsOfDate} disabled={allTermsLoading}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder={
                  allTermsLoading
                    ? 'Loading installments...'
                    : installmentOptions.length === 0
                    ? 'No installments for this student'
                    : 'Select installment...'
                } />
              </SelectTrigger>
              <SelectContent>
                {installmentOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(allTermsLoading || termsFetching) && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fees to Pay — editable received amount per fee head */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {asOfDate
              ? `Fees Due Up To ${new Date(asOfDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
              : 'Fee Heads'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {termsFetching ? (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : feeRows.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              {asOfDate ? 'No fees due for this term.' : 'Select a "Payment Up To" date above to see fee heads.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">S.No.</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead className="text-right">Actual Amount</TableHead>
                    <TableHead className="w-36">Received Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeRows.map((row, idx) => (
                    <TableRow key={row.fee_type_id} className="h-11">
                      <TableCell className="text-sm text-center">{idx + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{row.fee_type_name}</TableCell>
                      <TableCell className="text-right text-sm text-red-600 font-medium">
                        {formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={row.amount}
                          step="0.01"
                          className="h-8 w-32"
                          placeholder="Amount"
                          value={receivedAmounts[row.fee_type_id] ?? ''}
                          readOnly={!canCreate}
                          disabled={!canCreate}
                          onChange={(e) => {
                            if (!canCreate) return;
                            const raw = e.target.value;
                            const num = parseFloat(raw);
                            if (!isNaN(num) && num > row.amount) {
                              toast.error(
                                `Amount should not exceed ${formatCurrency(row.amount)} for ${row.fee_type_name}`
                              );
                              setReceivedAmounts((prev) => ({ ...prev, [row.fee_type_id]: String(row.amount) }));
                              return;
                            }
                            setReceivedAmounts((prev) => ({ ...prev, [row.fee_type_id]: raw }));
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-semibold h-10">
                    <TableCell colSpan={2} className="text-right text-sm">Total</TableCell>
                    <TableCell className="text-right text-sm text-red-600">
                      {formatCurrency(feeRows.reduce((s, r) => s + r.amount, 0))}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-green-700 pl-2">
                      {totalReceived > 0 ? formatCurrency(totalReceived) : '—'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Collect Payment</CardTitle>
        </CardHeader>
        <CardContent>
          {!canCreate && (
            <div className="mb-4 p-3 bg-muted border rounded-md text-sm text-muted-foreground">
              You don't have permission to collect fee payments. Contact an administrator for access.
            </div>
          )}
          {payFeeMutation.isError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded-md text-sm">
              {payFeeMutation.error?.message || 'Failed to process payment. Please try again.'}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Receipt Number */}
              <div className="space-y-2">
                <Label htmlFor="receipt_number">Receipt Number *</Label>
                <Input
                  id="receipt_number"
                  placeholder="e.g. RCP-260616-0930"
                  {...register('receipt_number')}
                />
                {errors.receipt_number && (
                  <p className="text-sm text-destructive">{errors.receipt_number.message}</p>
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
                    <Input
                      id="cheque_date"
                      type="date"
                      max={(() => { const d = new Date(); d.setDate(d.getDate() + 90); return d.toISOString().split('T')[0]; })()}
                      {...register('cheque_date')}
                    />
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
              disabled={!canCreate || payFeeMutation.isPending || totalReceived <= 0 || Object.keys(errors).length > 0}
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
              Collect <strong>{formatCurrency(totalReceived)}</strong> from{' '}
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
              <CheckCircle className="h-5 w-5 text-green-600" /> Payment Recorded
            </DialogTitle>
          </DialogHeader>
          {paymentResult && (() => {
            const isChequePending = paymentResult.payment_method === 'cheque' || paymentResult.payment_method === 'dd';
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Transaction #:</span>
                  <span className="font-medium">{paymentResult.transaction_number}</span>
                  {!isChequePending && (
                    <>
                      <span className="text-muted-foreground">Receipt #:</span>
                      <span className="font-semibold text-primary">{paymentResult.receipt_number}</span>
                    </>
                  )}
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

                {isChequePending ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-300">
                    Cheque/DD pending clearance — receipt will be generated once the instrument clears.
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <QuickSendButton
                      templateName="Fee Collection"
                      targetType="individual_student"
                      targetRef={{ student_id: studentId }}
                      recipientLabel={studentName}
                      variant="button"
                      label="Send Receipt SMS"
                      variables={{
                        student_name: studentName,
                        amount: paymentResult.amount_paid,
                        receipt_no: paymentResult.receipt_number,
                      }}
                      title="Send Fee Collection Message"
                    />
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
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleCloseSuccess}>Close</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
