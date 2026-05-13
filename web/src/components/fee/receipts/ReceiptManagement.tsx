import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, RefreshCw, Shield, Search, Plus, Eye, Printer, Receipt, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { feeReceiptsApi } from '@/api/fee/receipts';
import { searchTransactions } from '@/api/fee/transactions';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { usePermission } from '@/hooks/usePermission';
import type {
  FeeReceipt,
  ReceiptContent,
  ReceiptVerification,
  FeeReceiptSearchParams,
  FeeReceiptListResponse
} from '@/types/fee/receipt';
import type { FeeTransaction } from '@/types/fee/transaction';

interface ReceiptManagementProps {
  className?: string;
}

export function ReceiptManagement({ className }: ReceiptManagementProps) {
  const { selectedAcademicYearId } = useAcademicYearStore();
  const { checkPermission } = usePermission();
  const canCreate = checkPermission('fee_receipts', 'create');
  const canUpdate = checkPermission('fee_receipts', 'update');
  const [receipts, setReceipts] = useState<FeeReceipt[]>([]);
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<FeeReceipt | null>(null);
  const [receiptContent, setReceiptContent] = useState<ReceiptContent | null>(null);
  const [verification, setVerification] = useState<ReceiptVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<FeeReceiptSearchParams>({
    limit: 50,
    offset: 0
  });
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showReprintDialog, setShowReprintDialog] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');

  // Load receipts on component mount and when search params change
  useEffect(() => {
    loadReceipts();
  }, [searchParams]);

  // Load transactions when generate dialog opens
  useEffect(() => {
    if (showGenerateDialog && selectedAcademicYearId) {
      loadTransactions();
    }
  }, [showGenerateDialog, selectedAcademicYearId]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const response = await feeReceiptsApi.searchReceipts(searchParams);
      setReceipts(Array.isArray(response) ? response as unknown as FeeReceipt[] : response.items || []);
    } catch (error) {
      console.error('Error loading receipts:', error);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setTransactionsLoading(true);
      const body = await searchTransactions({
        academic_year_id: selectedAcademicYearId,
        status: 'completed',
        has_receipt: false, // backend filter (small addition per backend dev)
        limit: 100,
      });
      // body is already the parsed response — handle array, { data: [] }, or { items: [] }
      const raw: FeeTransaction[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body?.items)
        ? body.items
        : [];
      // Client-side fallback: if backend ignores has_receipt, filter ourselves
      const list = raw.filter((tx) => !tx.receipt_generated);
      setTransactions(list);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleReceiptSelect = async (receiptId: string) => {
    try {
      const receipt = await feeReceiptsApi.getReceiptById(receiptId);
      setSelectedReceipt(receipt);
      setReceiptContent(null);
      setVerification(null);
    } catch (error) {
      console.error('Error loading receipt:', error);
      toast.error('Failed to load receipt details');
    }
  };

  const handleViewContent = async () => {
    if (!selectedReceipt) return;

    try {
      const content = await feeReceiptsApi.getReceiptContent(selectedReceipt.id);
      setReceiptContent(content);
    } catch (error) {
      console.error('Error loading receipt content:', error);
      toast.error('Failed to load receipt content');
    }
  };

  const handleVerifyReceipt = async () => {
    if (!selectedReceipt) return;

    try {
      const verificationResult = await feeReceiptsApi.verifyReceipt(selectedReceipt.id);
      setVerification(verificationResult);
    } catch (error) {
      console.error('Error verifying receipt:', error);
      toast.error('Failed to verify receipt integrity');
    }
  };

  const handleReprintReceipt = async () => {
    if (!selectedReceipt) return;

    try {
      const reprintedReceipt = await feeReceiptsApi.reprintReceipt(selectedReceipt.id);
      setSelectedReceipt(reprintedReceipt);
      setShowReprintDialog(true);
    } catch (error) {
      console.error('Error reprinting receipt:', error);
      toast.error('Failed to reprint receipt');
    }
  };

  const handleReprintPrint = async () => {
    if (!selectedReceipt) return;
    try {
      const blobUrl = await feeReceiptsApi.getReceiptPdfBlobUrl(selectedReceipt.id);
      const win = window.open(blobUrl);
      win?.addEventListener('load', () => {
        win.print();
        window.URL.revokeObjectURL(blobUrl);
      });
      setShowReprintDialog(false);
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Failed to print receipt');
    }
  };

  const handleReprintDownload = async () => {
    if (!selectedReceipt) return;
    try {
      await feeReceiptsApi.downloadReceiptPdf(selectedReceipt.id, selectedReceipt.receipt_number);
      toast.success('Receipt PDF downloaded');
      setShowReprintDialog(false);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt PDF');
    }
  };

  const handleGenerateReceipt = async () => {
    if (!selectedTransactionId.trim()) {
      toast.error('Please select a transaction');
      return;
    }

    try {
      const newReceipt = await feeReceiptsApi.generateReceipt(selectedTransactionId);
      toast.success('Receipt generated successfully');
      setIsFormDirty(false);
      setShowGenerateDialog(false);
      setSelectedTransactionId('');
      loadReceipts(); // Refresh the list
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Failed to generate receipt');
    }
  };

  const handleDownloadReceipt = async () => {
    if (!selectedReceipt) return;

    try {
      await feeReceiptsApi.downloadReceiptPdf(selectedReceipt.id, selectedReceipt.receipt_number);
      toast.success('Receipt PDF downloaded');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt PDF');
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Fee Receipt Management</h2>
          <p className="text-muted-foreground">
            Generate, view, and manage fee receipts with integrity verification
          </p>
        </div>
        {canCreate && (
        <Dialog
          open={showGenerateDialog}
          onOpenChange={setShowGenerateDialog}
          guardDirty={isFormDirty}
          onDirtyDiscard={() => setIsFormDirty(false)}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setIsFormDirty(false)}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Receipt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generate New Receipt</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Select a completed transaction to generate a receipt
              </p>
            </DialogHeader>
            <div className="space-y-4" onChange={() => setIsFormDirty(true)}>
              <div>
                <Label htmlFor="transactionSelect">Select Transaction</Label>
                {transactionsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading transactions...</span>
                  </div>
                ) : (
                  <>
                    <Select
                      value={selectedTransactionId}
                      onValueChange={(value) => { setSelectedTransactionId(value); setIsFormDirty(true); }}
                      disabled={transactionsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a transaction..." />
                      </SelectTrigger>
                      <SelectContent>
                        {transactions.map((transaction) => (
                          <SelectItem key={transaction.id} value={transaction.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{transaction.transaction_number}</span>
                              <span className="text-sm text-muted-foreground">
                                {transaction.student_admission_num || 'N/A'} • ₹{transaction.total_amount.toLocaleString()} • {transaction.payment_method.toUpperCase()}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {transactions.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        No pending transactions found. Receipts are auto-generated for cash/UPI payments. Only cleared cheque/DD payments without a receipt will appear here.
                      </p>
                    )}
                  </>
                )}
              </div>

              {selectedTransactionId && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  {(() => {
                    const selectedTx = transactions.find(tx => tx.id === selectedTransactionId);
                    return selectedTx ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{selectedTx.transaction_number}</span>
                          <Badge variant="default">₹{selectedTx.total_amount.toLocaleString()}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>Student: {selectedTx.student_admission_num || 'N/A'}</div>
                          <div>Payment: {selectedTx.payment_method.toUpperCase()}</div>
                          <div>Date: {new Date(selectedTx.transaction_date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline" onClick={() => {
                    setSelectedTransactionId('');
                  }}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleGenerateReceipt}
                  disabled={!selectedTransactionId || transactionsLoading}
                >
                  Generate Receipt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Reprint Options Dialog */}
      <Dialog open={showReprintDialog} onOpenChange={setShowReprintDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reprint Receipt</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Choose how you'd like to receive the reprinted copy
            </p>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button onClick={handleReprintPrint} className="w-full" variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleReprintDownload} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Merged Card: All Sections */}
      <Card>
        {/* Search and Filters Section */}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search & Management
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="receiptNumber">Receipt Number</Label>
              <Input
                id="receiptNumber"
                value={searchParams.receipt_number || ''}
                onChange={(e) => setSearchParams(prev => ({ ...prev, receipt_number: e.target.value }))}
                placeholder="Search by receipt number"
              />
            </div>
            <div>
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                value={searchParams.student_id || ''}
                onChange={(e) => setSearchParams(prev => ({ ...prev, student_id: e.target.value }))}
                placeholder="Filter by student ID"
              />
            </div>
            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={searchParams.date_from || ''}
                onChange={(e) => setSearchParams(prev => ({ ...prev, date_from: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={searchParams.date_to || ''}
                onChange={(e) => setSearchParams(prev => ({ ...prev, date_to: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>

        {/* Separator */}
        <div className="px-6">
          <Separator />
        </div>

        {/* Receipt Selection & Details Section */}
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Receipt Selection */}
            <div>
              <h3 className="font-semibold mb-4">Select Receipt</h3>
              <div className="space-y-4">
                <Select onValueChange={handleReceiptSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a receipt..." />
                </SelectTrigger>
                <SelectContent>
                  {receipts.map((receipt) => (
                    <SelectItem key={receipt.id} value={receipt.id}>
                      {receipt.receipt_number} - {receipt.student_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedReceipt && (
                <div className="space-y-2">
                  <Button onClick={handleViewContent} className="w-full" variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    View Content
                  </Button>
                  <Button onClick={handleVerifyReceipt} className="w-full" variant="outline">
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Integrity
                  </Button>
                  {canUpdate && (
                    <Button onClick={handleReprintReceipt} className="w-full" variant="outline">
                      <Printer className="w-4 h-4 mr-2" />
                      Reprint Receipt
                    </Button>
                  )}
                  <Button onClick={handleDownloadReceipt} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              )}
              </div>
            </div>

            {/* Receipt Details */}
            <div className="lg:col-span-2">
              <h3 className="font-semibold mb-4">Receipt Details</h3>
            {selectedReceipt ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Receipt Number</Label>
                    <p className="text-lg font-semibold">{selectedReceipt.receipt_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant={selectedReceipt.is_reprinted ? "secondary" : "default"}>
                        {selectedReceipt.is_reprinted ? "Reprinted" : "Original"}
                      </Badge>
                      {selectedReceipt.reprint_count !== 0 && (
                        <Badge variant="outline">
                          Prints: {selectedReceipt.reprint_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Student</Label>
                    <p>{selectedReceipt.student_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Admission: {selectedReceipt.student_admission_num}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Academic Year</Label>
                    <p>{selectedReceipt.academic_year}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Class & Section</Label>
                    <p>{selectedReceipt.class_section}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Generated At</Label>
                    <p>{new Date(selectedReceipt.generated_at).toLocaleString()}</p>
                  </div>
                </div>

                {selectedReceipt.remarks && (
                  <div>
                    <Label className="text-sm font-medium">Remarks</Label>
                    <p className="text-sm text-muted-foreground">{selectedReceipt.remarks}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a receipt to view details</p>
              </div>
            )}
            </div>
          </div>
        </CardContent>

        {/* Receipt Content Section */}
        {receiptContent && (
          <>
            <div className="px-6">
              <Separator />
            </div>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Receipt Content</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Transaction Number</Label>
                  <p>{receiptContent.transaction_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <p>{receiptContent.payment_method}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Amount</Label>
                  <p className="text-lg font-semibold">₹{receiptContent.total_amount.toLocaleString()}</p>
                </div>
                {receiptContent.payment_reference && (
                  <div>
                    <Label className="text-sm font-medium">Payment Reference</Label>
                    <p>{receiptContent.payment_reference}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Collected By</Label>
                  <p>
                    {receiptContent.collected_by_user}
                    {receiptContent.collected_by_designation && (
                      <span className="text-muted-foreground ml-1">({receiptContent.collected_by_designation})</span>
                    )}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium mb-2 block">Fee Breakdown</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receiptContent.receipt_items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.fee_type_name}</TableCell>
                        <TableCell>{item.fee_term_name}</TableCell>
                        <TableCell className="text-right">₹{item.amount_paid.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            </CardContent>
          </>
        )}

        {/* Verification Results Section */}
        {verification && (
          <>
            <div className="px-6">
              <Separator />
            </div>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Receipt Integrity Verification
              </h3>
            <Alert className={verification.is_valid ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {verification.is_valid ? (
                      <Shield className="w-4 h-4 text-green-600" />
                    ) : (
                      <Shield className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`font-medium ${verification.is_valid ? 'text-green-800' : 'text-red-800'}`}>
                      {verification.is_valid ? 'Receipt is valid and untampered' : 'Receipt integrity compromised'}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    <p><strong>Receipt:</strong> {verification.receipt_number}</p>
                    <p><strong>Verification Date:</strong> {new Date(verification.verification_date).toLocaleString()}</p>
                    {!verification.is_valid && (
                      <div className="mt-2 p-2 bg-red-100 rounded text-red-800 text-xs">
                        <p><strong>Stored Hash:</strong> {verification.stored_hash}</p>
                        <p><strong>Current Hash:</strong> {verification.current_hash}</p>
                      </div>
                    )}
                  </div>
                </div>
              </AlertDescription>
              </Alert>
            </CardContent>
          </>
        )}

        {/* Recent Receipts Section */}
        <div className="px-6">
          <Separator />
        </div>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Recent Receipts</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No.</TableHead>
                <TableHead>Receipt Number</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Generated At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading receipts...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No receipts found
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((receipt, index) => (
                  <TableRow key={receipt.id} style={{ height: '48px' }}>
                    <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                    <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{receipt.student_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {receipt.student_admission_num}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(receipt.generated_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={receipt.is_reprinted ? "secondary" : "default"}>
                          {receipt.is_reprinted ? "Reprinted" : "Original"}
                        </Badge>
                        {receipt.reprint_count !== 0 && (
                          <Badge variant="outline" className="text-xs">
                            {receipt.reprint_count}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReceiptSelect(receipt.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}