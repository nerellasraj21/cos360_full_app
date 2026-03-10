import React from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Receipt,
  FolderOpen,
  Tag,
  Settings,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  ArrowRight
} from 'lucide-react';
import { useExpenseSummaryReport, usePendingExpenseApprovals } from '@/hooks/expense';
import { PermissionGuard } from '@/components/PermissionGuard';

export function ExpensePage() {
  const { data: summaryReport } = useExpenseSummaryReport();
  const { data: pendingApprovals } = usePendingExpenseApprovals();

  const summary = summaryReport || {
    total_transactions: 0,
    total_amount: 0,
    approved_amount: 0,
    pending_amount: 0,
    paid_amount: 0,
    cancelled_amount: 0
  };

  const pendingCount = pendingApprovals?.items?.length || 0;

  return (
    <PermissionGuard
      permissions={[["expense_transactions", "list"]]}
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view the expense dashboard.</p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
      <PageHeader
        title="Expense Management"
        subtitle="Comprehensive expense tracking, approval workflows, and financial compliance"
        icon={<DollarSign className="h-5 w-5" />}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_transactions}</div>
            <p className="text-xs text-muted-foreground">
              All time transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(summary.total_amount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Amount</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(summary.approved_amount || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Approved for payment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Transactions
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create, view, and manage expense transactions with approval workflows
            </p>
          </CardHeader>
          <CardContent>
            <Link to="/expense/transactions">
              <Button className="w-full flex items-center gap-2">
                Manage Transactions
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Categories & Types
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Organize expenses with hierarchical categories and specific expense types
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/expense/categories">
              <Button variant="outline" className="w-full flex items-center gap-2">
                Manage Categories
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/expense/types">
              <Button variant="outline" className="w-full flex items-center gap-2">
                Manage Types
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings & Configuration
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure approval workflows, limits, and system settings
            </p>
          </CardHeader>
          <CardContent>
            <Link to="/expense/settings">
              <Button className="w-full flex items-center gap-2">
                System Settings
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit & Compliance
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Complete audit trail and compliance reporting for all expense activities
            </p>
          </CardHeader>
          <CardContent>
            <Link to="/expense/audit">
              <Button className="w-full flex items-center gap-2">
                View Audit Logs
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Reports & Analytics
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Generate comprehensive reports and analyze expense patterns
            </p>
          </CardHeader>
          <CardContent>
            <Link to="/expense/reports">
              <Button className="w-full flex items-center gap-2">
                Generate Reports
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Approvals
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Review and approve pending expense transactions
            </p>
          </CardHeader>
          <CardContent>
            <Link to="/expense/approvals">
              <Button className="w-full flex items-center gap-2">
                Review Approvals
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">₹{(summary.paid_amount || 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Paid</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">₹{(summary.pending_amount || 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">₹{(summary.approved_amount || 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">₹{(summary.cancelled_amount || 0).toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Cancelled</div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </PermissionGuard>
  );
}

export default ExpensePage;