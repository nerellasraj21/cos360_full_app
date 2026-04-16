
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExpenseTransactions } from './ExpenseTransactions';
import { ExpenseCategories } from './ExpenseCategories';
import { ExpenseTypes } from './ExpenseTypes';
import { ExpenseReports } from './ExpenseReports';
import { ExpenseSettings } from './ExpenseSettings';
import { useExpenseSummary } from '@/hooks/expense';
import { formatCurrency } from '@/lib/expenseValidation';

export function ExpenseModule() {
  const [activeTab, setActiveTab] = useState('transactions');
  const { data: summary, isLoading: summaryLoading } = useExpenseSummary();

  return (
    <div className="expense-module p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expense Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage expense transactions, categories, types, and generate reports
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            Multi-tenant Support
          </Badge>
          <Badge variant="outline" className="text-sm">
            Role-based Access
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : formatCurrency(summary?.total_amount || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : summary?.total_transactions || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : summary?.categories_count || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="types">Types</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="p-6">
              <ExpenseTransactions />
            </TabsContent>

            <TabsContent value="categories" className="p-6">
              <ExpenseCategories />
            </TabsContent>

            <TabsContent value="types" className="p-6">
              <ExpenseTypes />
            </TabsContent>

            <TabsContent value="reports" className="p-6">
              <ExpenseReports />
            </TabsContent>

            <TabsContent value="settings" className="p-6">
              <ExpenseSettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default ExpenseModule;