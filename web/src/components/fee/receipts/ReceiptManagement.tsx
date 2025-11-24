import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, RefreshCw, Shield, Search, Plus, Eye, Printer, Receipt, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { feeReceiptsApi } from '@/api/fee/receipts';
import { searchTransactions } from '@/api/fee/transactions';
import { useAcademicYearStore } from '@/lib/academicYearStore';
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
      setReceipts(response.items || []);
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
      const response = await searchTransactions({
        academic_year_id: selectedAcademicYearId,
        status: 'completed', // Only show completed transactions for receipt generation
        limit: 100
      });
      setTransactions(response.data || []);
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
      toast.success('Receipt reprinted successfully');
    } catch (error) {
      console.error('Error reprinting receipt:', error);
      toast.error('Failed to reprint receipt');
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
      // For now, we'll just show a message since PDF download requires backend implementation
      toast.info('PDF download functionality will be implemented with backend integration');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
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
        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogTrigger asChild>
            <Button>
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
            <div className="space-y-4">
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
                      onValueChange={setSelectedTransactionId}
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
                                {transaction.student_name || 'N/A'} • ₹{transaction.total_amount.toLocaleString()} • {transaction.payment_method.toUpperCase()}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {transactions.length === 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        No completed transactions found for the current academic year.
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
                          <div>Student: {selectedTx.student_name || 'N/A'}</div>
                          <div>Payment: {selectedTx.payment_method.toUpperCase()}</div>
                          <div>Date: {new Date(selectedTx.transaction_date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowGenerateDialog(false);
                  setSelectedTransactionId('');
                }}>
                  Cancel
                </Button>
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
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search Receipts
          </CardTitle>
        </CardHeader>
        <CardContent>
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
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receipt Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Receipt</CardTitle>
          </CardHeader>
          <CardContent>
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
                  <Button onClick={handleReprintReceipt} className="w-full" variant="outline">
                    <Printer className="w-4 h-4 mr-2" />
                    Reprint Receipt
                  </Button>
                  <Button onClick={handleDownloadReceipt} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Receipt Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receipt Details</CardTitle>
          </CardHeader>
          <CardContent>
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
                      {selectedReceipt.reprint_count !== "0" && (
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
          </CardContent>
        </Card>
      </div>

      {/* Receipt Content */}
      {receiptContent && (
        <Card>
          <CardHeader>
            <CardTitle>Receipt Content</CardTitle>
          </CardHeader>
          <CardContent>
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
                <div>
                  <Label className="text-sm font-medium">Collected By</Label>
                  <p>{receiptContent.collected_by_user}</p>
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
        </Card>
      )}

      {/* Verification Results */}
      {verification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Receipt Integrity Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
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
        </Card>
      )}

      {/* Receipts List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Loading receipts...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : receipts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No receipts found
                  </TableCell>
                </TableRow>
              ) : (
                receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
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
                        {receipt.reprint_count !== "0" && (
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