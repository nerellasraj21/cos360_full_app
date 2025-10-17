import { ExpenseCategoriesList } from '@/components/expense';

export default function ExpenseCategories() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Expense Categories</h1>
                    <p className="text-muted-foreground">
                        Manage expense categories and their configurations
                    </p>
                </div>
            </div>

            {/* Categories List */}
            <ExpenseCategoriesList />
        </div>
    );
}