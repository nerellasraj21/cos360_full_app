import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, IndianRupee, FolderOpen, Tag, TrendingUp, Loader2, Info, Search, Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PermissionGuard } from '@/components/PermissionGuard';
import { useExpenseHierarchicalSummary } from '@/hooks/expense';
import { useAcademicYearsDropdown } from '@/api/hooks/masters/academicyears';
import type { ExpenseCategorySummaryItem, ExpenseTypeSummaryItem } from '@/types/expense';

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number | string) =>
  Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusColor = (s: string) => {
  if (s === 'approved') return 'bg-green-100 text-green-800';
  if (s === 'paid') return 'bg-blue-100 text-blue-800';
  if (s === 'pending') return 'bg-yellow-100 text-yellow-800';
  return 'bg-muted text-muted-foreground';
};

// ─── Type row (collapsible) ──────────────────────────────────────────────────
function TypeRow({ type }: { type: ExpenseTypeSummaryItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-md bg-muted/30 mb-2">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">{type.type_name}</span>
          {type.type_description && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              — {type.type_description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-xs text-muted-foreground">{type.entry_count} entries</span>
          <span className="font-semibold text-sm">₹{fmt(type.type_total)}</span>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3 pt-1 border-t">
          {type.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No expense entries yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left py-1.5 pr-3 font-medium">Description</th>
                  <th className="text-left py-1.5 pr-3 font-medium hidden md:table-cell">Date</th>
                  <th className="text-left py-1.5 pr-3 font-medium hidden sm:table-cell">Vendor</th>
                  <th className="text-left py-1.5 pr-3 font-medium hidden sm:table-cell">Method</th>
                  <th className="text-center py-1.5 pr-3 font-medium hidden sm:table-cell">Status</th>
                  <th className="text-right py-1.5 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {type.entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-2 pr-3 font-medium">{entry.description}</td>
                    <td className="py-2 pr-3 text-muted-foreground hidden md:table-cell">
                      {new Date(entry.transaction_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground hidden sm:table-cell">
                      {entry.vendor_name || '—'}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground capitalize hidden sm:table-cell">
                      {entry.payment_method.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2 pr-3 hidden sm:table-cell text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold">₹{fmt(entry.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={5} className="pt-2 text-sm font-semibold text-right pr-3">
                    Type Total:
                  </td>
                  <td className="pt-2 text-right font-bold text-sm">₹{fmt(type.type_total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Category card (collapsible) ─────────────────────────────────────────────
function CategoryCard({ category, index }: { category: ExpenseCategorySummaryItem; index: number }) {
  const [open, setOpen] = useState(true);
  const colors = [
    'border-l-blue-500',
    'border-l-emerald-500',
    'border-l-violet-500',
    'border-l-orange-500',
    'border-l-rose-500',
    'border-l-cyan-500',
  ];
  const borderColor = colors[index % colors.length];

  return (
    <Card className={`border-l-4 ${borderColor} mb-4`}>
      <CardHeader
        className="cursor-pointer select-none pb-2"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <FolderOpen className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate">{category.category_name}</CardTitle>
              {category.category_description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{category.category_description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0 ml-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">{category.entry_count} entries · {category.types.length} types</div>
              <div className="text-lg font-bold">₹{fmt(category.category_total)}</div>
            </div>
            {open ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0">
          {category.types.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Info className="h-4 w-4" />
              No expense types under this category.
            </div>
          ) : (
            <>
              {category.types.map((type) => (
                <TypeRow key={type.type_id} type={type} />
              ))}
              <div className="flex justify-end mt-3 pt-3 border-t">
                <div className="text-right">
                  <span className="text-sm text-muted-foreground mr-3">Category Total:</span>
                  <span className="text-xl font-bold">₹{fmt(category.category_total)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function ExpenseSummaryPage() {
  const [selectedYearId, setSelectedYearId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: academicYears, isLoading: yearsLoading } = useAcademicYearsDropdown();

  const summaryParams = selectedYearId && selectedYearId !== 'all'
    ? { academic_year_id: selectedYearId }
    : {};

  const { data: summary, isLoading, isError } = useExpenseHierarchicalSummary(summaryParams);

  const filteredCategories = useMemo(() => {
    if (!summary?.categories) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return summary.categories;
    return summary.categories
      .map((cat) => {
        if (cat.category_name.toLowerCase().includes(q) || (cat.category_description ?? '').toLowerCase().includes(q)) {
          return cat;
        }
        const matchedTypes = cat.types
          .map((type) => {
            if (type.type_name.toLowerCase().includes(q) || (type.type_description ?? '').toLowerCase().includes(q)) {
              return type;
            }
            const matchedEntries = type.entries.filter(
              (e) =>
                e.description.toLowerCase().includes(q) ||
                (e.vendor_name ?? '').toLowerCase().includes(q)
            );
            return matchedEntries.length > 0 ? { ...type, entries: matchedEntries } : null;
          })
          .filter(Boolean) as ExpenseTypeSummaryItem[];
        return matchedTypes.length > 0 ? { ...cat, types: matchedTypes } : null;
      })
      .filter(Boolean) as ExpenseCategorySummaryItem[];
  }, [summary, searchQuery]);

  return (
    <PermissionGuard
      permissions={[['expense_transactions', 'list']]}
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to view expense summaries.</p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            title="Expense Summary"
            subtitle="Category-wise breakdown of all expenses with type-level details and totals"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-muted-foreground">Academic Year:</span>
            <Select
              value={selectedYearId}
              onValueChange={setSelectedYearId}
              disabled={yearsLoading}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {academicYears?.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search filter */}
        {summary && summary.categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by category, type, description or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        )}

        {/* Grand total banner */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="flex items-center gap-4 p-5">
                <IndianRupee className="h-8 w-8 text-primary shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Grand Total</p>
                  <p className="text-2xl font-bold">₹{fmt(summary.grand_total)}</p>
                  {summary.academic_year_title && (
                    <p className="text-xs text-muted-foreground mt-0.5">{summary.academic_year_title}</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <FolderOpen className="h-7 w-7 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">{summary.categories.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <Tag className="h-7 w-7 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="text-2xl font-bold">{summary.total_entries}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin mr-3" />
            <span className="text-muted-foreground">Loading expense summary...</span>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-destructive">
              Failed to load expense summary. Please try again.
            </CardContent>
          </Card>
        )}

        {/* Categories */}
        {!isLoading && !isError && summary && (
          <>
            {filteredCategories.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchQuery ? 'No Results Found' : 'No Expense Data'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? `No categories, types, or entries match "${searchQuery}".`
                      : <>No categories or expenses found{selectedYearId !== 'all' ? ' for the selected academic year' : ''}.<br />Start by creating categories and adding expense entries.</>
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {filteredCategories.map((cat, idx) => (
                  <CategoryCard key={cat.category_id} category={cat} index={idx} />
                ))}

                {/* Grand Total footer */}
                <Card className="bg-muted/50 border-2">
                  <CardContent className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-3">
                      <IndianRupee className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-semibold text-lg">Grand Total</p>
                        {summary.academic_year_title && (
                          <p className="text-sm text-muted-foreground">{summary.academic_year_title}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary">₹{fmt(summary.grand_total)}</p>
                      <p className="text-sm text-muted-foreground">{summary.total_entries} total entries across {summary.categories.length} categories</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </PermissionGuard>
  );
}

export default ExpenseSummaryPage;
