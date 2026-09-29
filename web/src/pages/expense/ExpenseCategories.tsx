import { ExpenseCategories as ExpenseCategoriesComponent } from '@/components/expense';
import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ExpenseCategories() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader title="Expense Categories" icon={<Receipt className="h-5 w-5" />} subtitle="Manage expense categories and their configurations" />

            {/* Categories List */}
            <ExpenseCategoriesComponent />
        </div>
    );
}