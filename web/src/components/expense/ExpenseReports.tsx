
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, BarChart3, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { useExpenseCategoryReport, useExpenseTypeReport, useExpenseTrendReport, useExpenseExportStatus } from '@/hooks/expense';
import { formatCurrency } from '@/lib/expenseValidation';
import { expenseNotifications } from '@/lib/expenseNotifications';
import type { ExpenseReportFilter } from '@/types/expense';

type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export function ExpenseReports() {
  const [reportType, setReportType] = useState<'category' | 'type' | 'trend'>('category');
  const [filters, setFilters] = useState<ExpenseReportFilter>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exportId, setExportId] = useState<string | null>(null);

  const { data: categoryReport, refetch: refetchCategory } = useExpenseCategoryReport(filters);
  const { data: typeReport, refetch: refetchType } = useExpenseTypeReport(filters);
  const { data: trendReport, refetch: refetchTrend } = useExpenseTrendReport(filters);
  const { data: exportStatus } = useExpenseExportStatus(exportId || '');

  const currentReport = reportType === 'category' ? categoryReport :
                       reportType === 'type' ? typeReport : trendReport;

  const handleGenerateReport = () => {
    switch (reportType) {
      case 'category':
        refetchCategory();
        break;
      case 'type':
        refetchType();
        break;
      case 'trend':
        refetchTrend();
        break;
    }
  };

  const handleExport = async () => {
    try {
      // This would call the export API
      expenseNotifications.exportStarted();
      // setExportId(exportResponse.export_id);
    } catch (error) {
      expenseNotifications.genericError('Failed to start export');
    }
  };

  const renderCategoryReport = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(categoryReport?.summary.total_amount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Transactions</p>
                <p className="text-2xl font-bold">{categoryReport?.summary.total_transactions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Categories</p>
                <p className="text-2xl font-bold">{categoryReport?.summary.categories_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryReport?.categories.map((category) => (
                <TableRow key={category.category_id}>
                  <TableCell className="font-medium">{category.category_name}</TableCell>
                  <TableCell>{formatCurrency(category.total_amount)}</TableCell>
                  <TableCell>{category.transaction_count}</TableCell>
                  <TableCell>{formatCurrency(category.average_amount)}</TableCell>
                  <TableCell>{Number(category.percentage_of_total || 0).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderTypeReport = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(typeReport?.summary.total_amount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Transactions</p>
                <p className="text-2xl font-bold">{typeReport?.summary.total_transactions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Expense Types</p>
                <p className="text-2xl font-bold">{typeReport?.types.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Average</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {typeReport?.types.map((type) => (
                <TableRow key={type.type_id}>
                  <TableCell className="font-medium">{type.type_name}</TableCell>
                  <TableCell>{type.category_name}</TableCell>
                  <TableCell>{formatCurrency(type.total_amount)}</TableCell>
                  <TableCell>{type.transaction_count}</TableCell>
                  <TableCell>{formatCurrency(type.average_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderTrendReport = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(trendReport?.summary.total_amount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Period</p>
                <p className="text-sm font-bold">
                  {filters.start_date} to {filters.end_date}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Data Points</p>
                <p className="text-2xl font-bold">{trendReport?.monthly_trends.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Average per Transaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trendReport?.monthly_trends.map((trend) => (
                <TableRow key={trend.month}>
                  <TableCell className="font-medium">{trend.month}</TableCell>
                  <TableCell>{formatCurrency(trend.total_amount)}</TableCell>
                  <TableCell>{trend.transaction_count}</TableCell>
                  <TableCell>{formatCurrency(trend.average_per_transaction)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Expense Reports</h2>
          <p className="text-muted-foreground">Generate and analyze expense reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="report_type">Report Type</Label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">By Category</SelectItem>
                  <SelectItem value="type">By Type</SelectItem>
                  <SelectItem value="trend">Trend Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="export_format">Export Format</Label>
              <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handleGenerateReport} className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {currentReport && (
        <div>
          {reportType === 'category' && renderCategoryReport()}
          {reportType === 'type' && renderTypeReport()}
          {reportType === 'trend' && renderTrendReport()}
        </div>
      )}

      {/* Export Status */}
      {exportStatus && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Badge variant={
                exportStatus.status === 'completed' ? 'default' :
                exportStatus.status === 'failed' ? 'destructive' : 'secondary'
              }>
                {exportStatus.status}
              </Badge>
              <span className="text-sm">
                {exportStatus.status === 'completed' && exportStatus.file_url && (
                  <a href={exportStatus.file_url} className="text-blue-600 hover:underline">
                    Download Report
                  </a>
                )}
                {exportStatus.status === 'processing' && 'Processing export...'}
                {exportStatus.status === 'failed' && 'Export failed'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}