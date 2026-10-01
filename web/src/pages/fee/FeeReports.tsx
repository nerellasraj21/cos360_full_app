import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Download, DollarSign, Users, Clock, Layers, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar } from '@/components/ui/FilterBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PermissionGuard } from '@/components/common';
import { ClassesDropdown } from '@/components/dropdown-system/components/ClassesDropdown';
import { SectionsByClassDropdown } from '@/components/dropdown-system/components/SectionsByClassDropdown';
import { useFeeCategories } from '@/hooks/fee';
import {
  useFeeCollectionSummary,
  useFeeCollectionStats,
  usePendingFees,
  usePendingFeesStats,
  useFeeStructure,
  useFeeStructureStats,
  useExportFeeReport,
} from '@/hooks/fee/useFeeReports';
import type {
  FeeCollectionFilter,
  PendingFeesFilter,
  FeeStructureFilter,
  FeeExportFormat,
  FeeCollectionStats,
  PendingFeesStats,
  FeeStructureStats,
  FeeCollectionSummaryItem,
  PendingFeesItem,
  FeeStructureItem,
} from '@/types/fee/report';

function formatCurrency(amount: number): string {
  return `\u20B9${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type ReportTab = 'collection' | 'pending' | 'structure';

export function FeeReports() {
  return (
    <PermissionGuard
      resource="fee_reports"
      action="read"
      fallback={
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <BarChart3 className="w-8 h-8 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">
                      You don't have permission to view fee reports.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <FeeReportsContent />
    </PermissionGuard>
  );
}

function FeeReportsContent() {
  const [activeTab, setActiveTab] = useState<ReportTab>('collection');
  const [exportFormat, setExportFormat] = useState<FeeExportFormat>('xlsx');
  const exportMutation = useExportFeeReport();

  // --- Collection Summary filters ---
  const [collectionFilters, setCollectionFilters] = useState<FeeCollectionFilter>({
    page: 1,
    page_size: 50,
    sort_order: 'desc',
  });

  // --- Pending Fees filters ---
  const [pendingFilters, setPendingFilters] = useState<PendingFeesFilter>({
    page: 1,
    page_size: 50,
    sort_order: 'asc',
  });

  // --- Fee Structure filters ---
  const [structureFilters, setStructureFilters] = useState<FeeStructureFilter>({
    page: 1,
    page_size: 50,
    sort_order: 'asc',
  });

  // Shared dropdown filter state
  const [classId, setClassId] = useState<string>('');
  const [sectionId, setSectionId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // Build active filters from shared state
  const activeCollectionFilters = useMemo<FeeCollectionFilter>(() => ({
    ...collectionFilters,
    class_id: classId || undefined,
    section_id: sectionId || undefined,
    fee_category_id: categoryId || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    payment_method: paymentMethod || undefined,
    status: status || undefined,
  }), [collectionFilters, classId, sectionId, categoryId, dateFrom, dateTo, paymentMethod, status]);

  const activePendingFilters = useMemo<PendingFeesFilter>(() => ({
    ...pendingFilters,
    class_id: classId || undefined,
    section_id: sectionId || undefined,
    fee_category_id: categoryId || undefined,
  }), [pendingFilters, classId, sectionId, categoryId]);

  const activeStructureFilters = useMemo<FeeStructureFilter>(() => ({
    ...structureFilters,
    class_id: classId || undefined,
    fee_category_id: categoryId || undefined,
  }), [structureFilters, classId, categoryId]);

  // Stats filter (no pagination)
  const statsFilter = useMemo(() => ({
    class_id: classId || undefined,
    section_id: sectionId || undefined,
    fee_category_id: categoryId || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    payment_method: paymentMethod || undefined,
    status: status || undefined,
  }), [classId, sectionId, categoryId, dateFrom, dateTo, paymentMethod, status]);

  // Queries
  const collectionQuery = useFeeCollectionSummary(activeCollectionFilters);
  const collectionStatsQuery = useFeeCollectionStats(statsFilter);
  const pendingQuery = usePendingFees(activePendingFilters);
  const pendingStatsQuery = usePendingFeesStats(statsFilter);
  const structureQuery = useFeeStructure(activeStructureFilters);
  const structureStatsQuery = useFeeStructureStats(statsFilter);

  // Fee categories for dropdown
  const { data: categoriesData } = useFeeCategories();
  const categories = Array.isArray(categoriesData) ? categoriesData : (categoriesData as { items?: unknown[] })?.items || [];

  const hasAnyFilter = classId || sectionId || categoryId || dateFrom || dateTo || paymentMethod || status;

  const handleClearFilters = () => {
    setClassId('');
    setSectionId('');
    setCategoryId('');
    setDateFrom('');
    setDateTo('');
    setPaymentMethod('');
    setStatus('');
  };

  const handleExport = () => {
    const reportTypeMap: Record<ReportTab, 'fee_collection_summary' | 'pending_fees' | 'fee_structure'> = {
      collection: 'fee_collection_summary',
      pending: 'pending_fees',
      structure: 'fee_structure',
    };
    exportMutation.mutate({
      report_type: reportTypeMap[activeTab],
      filters: statsFilter,
      format: exportFormat,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Reports & Export"
        icon={<BarChart3 className="h-5 w-5" />}
        subtitle="Generate reports and export fee data"
        actions={
          <div className="flex items-center gap-2">
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as FeeExportFormat)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} disabled={exportMutation.isPending || !hasAnyFilter} variant="outline">
              {exportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Export
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <FilterBar>
        <div className="w-[160px]">
          <ClassesDropdown
            value={classId || undefined}
            onChange={(val) => {
              setClassId(val ? String(val) : '');
              setSectionId('');
            }}
            placeholder="All Classes"
            clearable
          />
        </div>
        {classId && (
          <div className="w-[160px]">
            <SectionsByClassDropdown
              classId={classId}
              value={sectionId || undefined}
              onChange={(val) => setSectionId(val ? String(val) : '')}
              placeholder="All Sections"
              clearable
            />
          </div>
        )}
        <div className="w-[160px]">
          <Select value={categoryId || '__all__'} onValueChange={(v) => setCategoryId(v === '__all__' ? '' : v)}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Categories</SelectItem>
              {(categories as { id: string; name: string }[]).map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {activeTab === 'collection' && (
          <>
            <div>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" className="w-[140px]" />
            </div>
            <div>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" className="w-[140px]" />
            </div>
            <div className="w-[140px]">
              <Select value={paymentMethod || '__all__'} onValueChange={(v) => setPaymentMethod(v === '__all__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <Select value={status || '__all__'} onValueChange={(v) => setStatus(v === '__all__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        {hasAnyFilter && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear
          </Button>
        )}
      </FilterBar>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportTab)}>
        <TabsList>
          <TabsTrigger value="collection">Collection Summary</TabsTrigger>
          <TabsTrigger value="pending">Pending Fees</TabsTrigger>
          <TabsTrigger value="structure">Fee Structure</TabsTrigger>
        </TabsList>

        <TabsContent value="collection" className="space-y-4 mt-4">
          <CollectionStatsCards stats={collectionStatsQuery.data} isLoading={collectionStatsQuery.isLoading} />
          <CollectionTable
            data={collectionQuery.data?.data || []}
            isLoading={collectionQuery.isLoading}
            error={collectionQuery.error}
            page={collectionFilters.page || 1}
            totalPages={collectionQuery.data?.total_pages || 1}
            totalCount={collectionQuery.data?.total_count || 0}
            onPageChange={(p) => setCollectionFilters((prev) => ({ ...prev, page: p }))}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4 mt-4">
          <PendingStatsCards stats={pendingStatsQuery.data} isLoading={pendingStatsQuery.isLoading} />
          <PendingTable
            data={pendingQuery.data?.data || []}
            isLoading={pendingQuery.isLoading}
            error={pendingQuery.error}
            page={pendingFilters.page || 1}
            totalPages={pendingQuery.data?.total_pages || 1}
            totalCount={pendingQuery.data?.total_count || 0}
            onPageChange={(p) => setPendingFilters((prev) => ({ ...prev, page: p }))}
          />
        </TabsContent>

        <TabsContent value="structure" className="space-y-4 mt-4">
          <StructureStatsCards stats={structureStatsQuery.data} isLoading={structureStatsQuery.isLoading} />
          <StructureTable
            data={structureQuery.data?.data || []}
            isLoading={structureQuery.isLoading}
            error={structureQuery.error}
            page={structureFilters.page || 1}
            totalPages={structureQuery.data?.total_pages || 1}
            totalCount={structureQuery.data?.total_count || 0}
            onPageChange={(p) => setStructureFilters((prev) => ({ ...prev, page: p }))}
          />
        </TabsContent>
      </Tabs>

      {!hasAnyFilter && (
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p>Select at least one filter to generate a report</p>
        </div>
      )}
    </div>
  );
}

// --- Stats Tables ---

function StatsTable({ rows, isLoading }: { rows: { icon: React.ReactNode; label: string; value: string }[]; isLoading: boolean }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="h-10">
              <TableHead className="w-8 pl-4"></TableHead>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right pr-4">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? [1, 2, 3, 4].map((i) => (
                  <TableRow key={i} className="h-10">
                    <TableCell className="pl-4"><div className="h-4 w-4 bg-muted rounded animate-pulse" /></TableCell>
                    <TableCell><div className="h-4 bg-muted rounded w-32 animate-pulse" /></TableCell>
                    <TableCell className="text-right pr-4"><div className="h-4 bg-muted rounded w-24 ml-auto animate-pulse" /></TableCell>
                  </TableRow>
                ))
              : rows.map((row, i) => (
                  <TableRow key={i} className="h-10">
                    <TableCell className="pl-4 text-muted-foreground">{row.icon}</TableCell>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right pr-4 font-semibold">{row.value}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CollectionStatsCards({ stats, isLoading }: { stats?: FeeCollectionStats; isLoading: boolean }) {
  const rows = stats ? [
    { icon: <DollarSign className="h-4 w-4" />, label: 'Total Collected', value: formatCurrency(stats.total_collected) },
    { icon: <DollarSign className="h-4 w-4" />, label: 'Total Due', value: formatCurrency(stats.total_due) },
    { icon: <BarChart3 className="h-4 w-4" />, label: 'Collection %', value: `${stats.collection_percentage.toFixed(1)}%` },
    { icon: <Layers className="h-4 w-4" />, label: 'Payment Methods', value: Object.keys(stats.payment_methods).length.toString() },
  ] : [];
  if (!isLoading && !stats) return null;
  return <StatsTable rows={rows} isLoading={isLoading} />;
}

function PendingStatsCards({ stats, isLoading }: { stats?: PendingFeesStats; isLoading: boolean }) {
  const rows = stats ? [
    { icon: <DollarSign className="h-4 w-4" />, label: 'Total Pending', value: formatCurrency(stats.total_pending_amount) },
    { icon: <DollarSign className="h-4 w-4" />, label: 'Total Overdue', value: formatCurrency(stats.total_overdue_amount) },
    { icon: <Users className="h-4 w-4" />, label: 'Students Pending', value: stats.total_students_with_pending.toString() },
    { icon: <Clock className="h-4 w-4" />, label: 'Avg Overdue Days', value: stats.average_overdue_days.toFixed(0) },
  ] : [];
  if (!isLoading && !stats) return null;
  return <StatsTable rows={rows} isLoading={isLoading} />;
}

function StructureStatsCards({ stats, isLoading }: { stats?: FeeStructureStats; isLoading: boolean }) {
  const rows = stats ? [
    { icon: <Layers className="h-4 w-4" />, label: 'Fee Types', value: stats.total_fee_types.toString() },
    { icon: <Layers className="h-4 w-4" />, label: 'Categories', value: stats.total_categories.toString() },
    { icon: <Layers className="h-4 w-4" />, label: 'Terms', value: stats.total_terms.toString() },
    { icon: <DollarSign className="h-4 w-4" />, label: 'Avg Fee', value: formatCurrency(stats.average_fee_amount) },
  ] : [];
  if (!isLoading && !stats) return null;
  return <StatsTable rows={rows} isLoading={isLoading} />;
}

// --- Tables ---

interface TableProps<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

function TableLoading() {
  return (
    <div className="flex justify-center items-center py-12">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Loading report data...</span>
    </div>
  );
}

function TableError({ message }: { message: string }) {
  return (
    <div className="flex justify-center items-center py-12 text-destructive">
      <AlertCircle className="h-5 w-5 mr-2" />
      <span>{message}</span>
    </div>
  );
}

function TablePagination({ page, totalPages, totalCount, onPageChange }: { page: number; totalPages: number; totalCount: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4">
      <span className="text-sm text-muted-foreground">{totalCount} total records</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">Page {page} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CollectionTable({ data, isLoading, error, page, totalPages, totalCount, onPageChange }: TableProps<FeeCollectionSummaryItem>) {
  if (isLoading) return <TableLoading />;
  if (error) return <TableError message={error.message} />;
  if (!data.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead className="w-[60px]">S.No.</TableHead>
                <TableHead>Transaction #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class/Section</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Term</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Collected By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, idx) => (
                <TableRow key={idx} className="h-12">
                  <TableCell>{(page - 1) * 50 + idx + 1}</TableCell>
                  <TableCell className="font-mono text-sm">{item.transaction_number as string}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.student_name as string}</p>
                      <p className="text-xs text-muted-foreground">{item.student_admission_no as string}</p>
                    </div>
                  </TableCell>
                  <TableCell>{item.class_section as string}</TableCell>
                  <TableCell>{item.fee_category as string}</TableCell>
                  <TableCell>{item.fee_type as string}</TableCell>
                  <TableCell>{item.fee_term as string}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.amount_due))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(item.amount_paid))}</TableCell>
                  <TableCell className="capitalize">{(item.payment_method as string || '').replace('_', ' ')}</TableCell>
                  <TableCell><StatusBadge status={item.payment_status as string} /></TableCell>
                  <TableCell>{item.transaction_date ? new Date(item.transaction_date as string).toLocaleDateString('en-IN') : '-'}</TableCell>
                  <TableCell>{item.collected_by as string}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  );
}

function PendingTable({ data, isLoading, error, page, totalPages, totalCount, onPageChange }: TableProps<PendingFeesItem>) {
  if (isLoading) return <TableLoading />;
  if (error) return <TableError message={error.message} />;
  if (!data.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Fees</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead className="w-[60px]">S.No.</TableHead>
                <TableHead>Admission No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class/Section</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Term</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Days Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, idx) => {
                const daysOverdue = Number(item.days_overdue ?? 0);
                return (
                  <TableRow key={idx} className="h-12">
                    <TableCell>{(page - 1) * 50 + idx + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{item.student_admission_no as string}</TableCell>
                    <TableCell className="font-medium">{item.student_name as string}</TableCell>
                    <TableCell>{item.class_section as string}</TableCell>
                    <TableCell>{item.fee_category as string}</TableCell>
                    <TableCell>{item.fee_type as string}</TableCell>
                    <TableCell>{item.fee_term as string}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.amount_due))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.amount_paid))}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">{formatCurrency(Number(item.balance_amount))}</TableCell>
                    <TableCell>{item.due_date ? new Date(item.due_date as string).toLocaleDateString('en-IN') : '-'}</TableCell>
                    <TableCell className={`text-right ${daysOverdue > 0 ? 'text-red-600 font-semibold' : ''}`}>
                      {daysOverdue > 0 ? daysOverdue : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  );
}

function StructureTable({ data, isLoading, error, page, totalPages, totalCount, onPageChange }: TableProps<FeeStructureItem>) {
  if (isLoading) return <TableLoading />;
  if (error) return <TableError message={error.message} />;
  if (!data.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Structure</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="h-12">
                <TableHead className="w-[60px]">S.No.</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, idx) => (
                <TableRow key={idx} className="h-12">
                  <TableCell>{(page - 1) * 50 + idx + 1}</TableCell>
                  <TableCell className="font-medium">{item.fee_category as string}</TableCell>
                  <TableCell>{item.fee_type as string}</TableCell>
                  <TableCell>{item.fee_term as string}</TableCell>
                  <TableCell>{item.class_name as string}</TableCell>
                  <TableCell>{(item.section_name as string) || '-'}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(Number(item.fee_amount))}</TableCell>
                  <TableCell>{item.academic_year as string}</TableCell>
                  <TableCell><StatusBadge status={item.status as string} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination page={page} totalPages={totalPages} totalCount={totalCount} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  );
}
