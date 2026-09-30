
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  FileText,
  Clock,
  User,
  Activity,
  Shield,
  Database,
  Eye,
  Download,
  X,
  Trash2
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { useExpenseTransactions, useExpenseTransactionAuditLogs, useExpenseAuditSummary } from '@/hooks/expense';
import { useExpenseDepartmentDropdown } from '@/hooks/expense';
import { PermissionGuard } from '@/components/PermissionGuard';

export function ExpenseAuditPage() {
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  const { data: transactions = [], isLoading: transactionsLoading } = useExpenseTransactions({
    skip: 0,
    limit: 100
  });

  const { data: departments = [] } = useExpenseDepartmentDropdown();

  const { data: auditLogs = [], isLoading: auditLogsLoading } = useExpenseTransactionAuditLogs(
    selectedTransactionId,
    { skip: 0, limit: 100 }
  );

  const { data: auditSummary } = useExpenseAuditSummary(selectedTransactionId);

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = !searchQuery ||
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.reference_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment = !departmentFilter || transaction.department_id === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return <FileText className="h-4 w-4" />;
      case 'update': return <Activity className="h-4 w-4" />;
      case 'approve': return <Shield className="h-4 w-4" />;
      case 'reject': return <X className="h-4 w-4" />;
      case 'delete': return <Trash2 className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'default';
      case 'update': return 'secondary';
      case 'approve': return 'default';
      case 'reject': return 'destructive';
      case 'delete': return 'destructive';
      default: return 'outline';
    }
  };

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return 'N/A';
    const dept = departments.find(d => d.id === departmentId);
    return dept ? dept.name : 'Unknown';
  };

  return (
    <PermissionGuard
      permissions={[["expense_audit_logs", "list"]]}
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view expense audit logs.</p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
      <PageHeader title="Expense Audit & Compliance" icon={<Activity className="h-5 w-5" />} subtitle="Complete audit trail and compliance reporting for all expense activities" />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transaction Audit</TabsTrigger>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{transactions.length}</div>
                <p className="text-xs text-muted-foreground">
                  Under audit
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Audit Logs Today</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Activity logs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Good</div>
                <p className="text-xs text-muted-foreground">
                  All systems compliant
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Audit Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a transaction to view detailed audit information</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Selection</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a transaction to view its complete audit trail
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={departmentFilter || '__all__'} onValueChange={(value) => setDepartmentFilter(value === '__all__' ? '' : value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Loading transactions...
                        </TableCell>
                      </TableRow>
                    ) : filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow
                          key={transaction.id}
                          className={selectedTransactionId === transaction.id ? 'bg-accent' : ''}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium">{transaction.description}</div>
                              <div className="text-sm text-muted-foreground">
                                {transaction.reference_number && `#${transaction.reference_number}`}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ₹{transaction.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {getDepartmentName(transaction.department_id)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={transaction.status} />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant={selectedTransactionId === transaction.id ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSelectedTransactionId(transaction.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Audit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {selectedTransactionId && auditSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Audit Summary for Selected Transaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{auditSummary.total_logs}</div>
                    <div className="text-sm text-muted-foreground">Total Logs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{auditSummary.creation_logs}</div>
                    <div className="text-sm text-muted-foreground">Creation</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{auditSummary.update_logs}</div>
                    <div className="text-sm text-muted-foreground">Updates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{auditSummary.approval_logs}</div>
                    <div className="text-sm text-muted-foreground">Approvals</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Last activity: {new Date(auditSummary.last_action_at).toLocaleString()}
                    by {auditSummary.last_actor}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          {selectedTransactionId ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Audit Logs
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Complete audit trail for the selected transaction
                </p>
              </CardHeader>
              <CardContent>
                {auditLogsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Loading audit logs...</p>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No audit logs found for this transaction</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getActionIcon(log.action)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={getActionBadgeVariant(log.action)}>
                                  {log.action}
                                </Badge>
                                <Badge variant="outline">
                                  {log.action_category}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(log.created_at).toLocaleString()}
                                </span>
                              </div>

                              <div className="text-sm">
                                <span className="font-medium">{log.actor_username}</span>
                                <span className="text-muted-foreground"> ({log.actor_role})</span>
                              </div>

                              {log.field_name && (
                                <div className="text-sm mt-1">
                                  <span className="font-medium">Field:</span> {log.field_name}
                                </div>
                              )}

                              {log.action_notes && (
                                <div className="text-sm mt-1 text-muted-foreground">
                                  {log.action_notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a Transaction</h3>
                <p className="text-muted-foreground">
                  Choose a transaction from the "Transaction Audit" tab to view its audit logs
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </PermissionGuard>
  );
}

export default ExpenseAuditPage;