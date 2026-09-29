import { useNavigate } from '@tanstack/react-router';
import {
  DollarSign,
  Tag,
  Tags,
  ArrowLeftRight,
  LayoutList,
  ChevronRight,
  ShieldX,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/PageHeader';
import { PermissionGuard } from '@/components/PermissionGuard';
import {
  useExpenseCategories,
  useExpenseTypes,
  useExpenseTransactions,
} from '@/hooks/expense';

interface NavItem {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  color: string;
}

const navItems: NavItem[] = [
  {
    title: 'Categories',
    description: 'Manage top-level expense categories such as Infrastructure, Utilities, and Operations',
    path: '/expense/categories',
    icon: <Tag className="h-5 w-5" />,
    color: 'bg-chart-1/10 border-chart-1/20 hover:bg-chart-1/20',
  },
  {
    title: 'Types',
    description: 'Define specific expense types within each category with budget limits and controls',
    path: '/expense/types',
    icon: <Tags className="h-5 w-5" />,
    color: 'bg-chart-2/10 border-chart-2/20 hover:bg-chart-2/20',
  },
  {
    title: 'Transactions',
    description: 'Create, view, and track all expense transactions with full approval workflow',
    path: '/expense/transactions',
    icon: <ArrowLeftRight className="h-5 w-5" />,
    color: 'bg-chart-3/10 border-chart-3/20 hover:bg-chart-3/20',
  },
  {
    title: 'Summary',
    description: 'Category-wise breakdown with type totals and grand total — filterable by academic year',
    path: '/expense/summary',
    icon: <LayoutList className="h-5 w-5" />,
    color: 'bg-chart-5/10 border-chart-5/20 hover:bg-chart-5/20',
  },
];

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="text-2xl font-bold">{loading ? '—' : value}</div>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function ExpenseDashboardContent() {
  const navigate = useNavigate();

  const { data: categories, isLoading: loadingCategories } = useExpenseCategories();
  const { data: types, isLoading: loadingTypes } = useExpenseTypes();
  const { data: transactions, isLoading: loadingTransactions } = useExpenseTransactions();

  const categoryCount = categories?.length ?? 0;
  const typeCount = types?.length ?? 0;
  const transactionCount = transactions?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Management"
        subtitle="Track, approve, and analyse all school expenses in one place"
        icon={<DollarSign className="h-5 w-5" />}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Expense Categories" value={categoryCount} loading={loadingCategories} />
        <StatCard label="Expense Types" value={typeCount} loading={loadingTypes} />
        <StatCard label="Total Transactions" value={transactionCount} loading={loadingTransactions} />
      </div>

      {/* Navigation Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Expense Sections</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {navItems.map((item) => (
            <Card
              key={item.path}
              className={`cursor-pointer transition-all hover:shadow-md ${item.color}`}
              onClick={() => navigate({ to: item.path })}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="text-foreground">{item.icon}</div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm mb-3">{item.description}</CardDescription>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({ to: item.path });
                  }}
                >
                  Open <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ExpensePage() {
  return (
    <PermissionGuard
      permissions={[
        ['expense_categories', 'list'],
        ['expense_transactions', 'list'],
      ]}
      requireAll={false}
      fallback={
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <ShieldX className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">
                      You don't have permission to view the expense dashboard.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <ExpenseDashboardContent />
    </PermissionGuard>
  );
}

export default ExpensePage;
