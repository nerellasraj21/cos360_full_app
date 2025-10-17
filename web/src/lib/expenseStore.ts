import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  ExpenseTransactionRead,
  ExpenseCategoryRead,
  ExpenseTypeRead,
  ExpenseTransactionFilters,
  ExpenseTransactionListResponse,
  ExpenseCategoryListResponse,
  ExpenseTypeListResponse
} from '@/types/expense';

interface ExpenseState {
  // Transaction state
  transactions: {
    items: ExpenseTransactionRead[];
    loading: boolean;
    error: string | null;
    filters: ExpenseTransactionFilters;
    pagination: {
      skip: number;
      limit: number;
      total: number;
      hasNext: boolean;
    };
  };

  // Categories state
  categories: {
    items: ExpenseCategoryRead[];
    dropdown: ExpenseCategoryRead[];
    loading: boolean;
  };

  // Types state
  types: {
    items: ExpenseTypeRead[];
    dropdown: ExpenseTypeRead[];
    loading: boolean;
  };

  // Form state
  form: {
    creating: boolean;
    updating: boolean;
    approving: boolean;
    error: string | null;
  };

  // Pending approvals
  pendingApprovals: {
    items: ExpenseTransactionRead[];
    loading: boolean;
    error: string | null;
  };
}

interface ExpenseActions {
  // Transaction actions
  setTransactions: (response: ExpenseTransactionListResponse) => void;
  setTransactionLoading: (loading: boolean) => void;
  setTransactionError: (error: string | null) => void;
  updateTransactionFilters: (filters: Partial<ExpenseTransactionFilters>) => void;
  addTransaction: (transaction: ExpenseTransactionRead) => void;
  updateTransaction: (transaction: ExpenseTransactionRead) => void;
  removeTransaction: (id: string) => void;

  // Category actions
  setCategories: (response: ExpenseCategoryListResponse) => void;
  setCategoriesDropdown: (categories: ExpenseCategoryRead[]) => void;
  setCategoriesLoading: (loading: boolean) => void;
  addCategory: (category: ExpenseCategoryRead) => void;
  updateCategory: (category: ExpenseCategoryRead) => void;
  removeCategory: (id: string) => void;

  // Type actions
  setTypes: (response: ExpenseTypeListResponse) => void;
  setTypesDropdown: (types: ExpenseTypeRead[]) => void;
  setTypesLoading: (loading: boolean) => void;
  addType: (type: ExpenseTypeRead) => void;
  updateType: (type: ExpenseTypeRead) => void;
  removeType: (id: string) => void;

  // Form actions
  setFormCreating: (creating: boolean) => void;
  setFormUpdating: (updating: boolean) => void;
  setFormApproving: (approving: boolean) => void;
  setFormError: (error: string | null) => void;

  // Pending approvals actions
  setPendingApprovals: (transactions: ExpenseTransactionRead[]) => void;
  setPendingApprovalsLoading: (loading: boolean) => void;
  setPendingApprovalsError: (error: string | null) => void;
  updatePendingApproval: (transaction: ExpenseTransactionRead) => void;
  removePendingApproval: (id: string) => void;

  // Reset actions
  resetTransactionState: () => void;
  resetCategoryState: () => void;
  resetTypeState: () => void;
  resetFormState: () => void;
  reset: () => void;
}

const initialState: ExpenseState = {
  transactions: {
    items: [],
    loading: false,
    error: null,
    filters: {
      skip: 0,
      limit: 100
    },
    pagination: {
      skip: 0,
      limit: 100,
      total: 0,
      hasNext: false
    }
  },
  categories: {
    items: [],
    dropdown: [],
    loading: false
  },
  types: {
    items: [],
    dropdown: [],
    loading: false
  },
  form: {
    creating: false,
    updating: false,
    approving: false,
    error: null
  },
  pendingApprovals: {
    items: [],
    loading: false,
    error: null
  }
};

export const useExpenseStore = create<ExpenseState & ExpenseActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Transaction actions
      setTransactions: (response) =>
        set((state) => ({
          transactions: {
            ...state.transactions,
            items: response.items,
            pagination: {
              skip: response.skip,
              limit: response.limit,
              total: response.total,
              hasNext: response.skip + response.limit < response.total
            },
            loading: false,
            error: null
          }
        })),

      setTransactionLoading: (loading) =>
        set((state) => ({
          transactions: { ...state.transactions, loading }
        })),

      setTransactionError: (error) =>
        set((state) => ({
          transactions: { ...state.transactions, error, loading: false }
        })),

      updateTransactionFilters: (filters) =>
        set((state) => ({
          transactions: {
            ...state.transactions,
            filters: { ...state.transactions.filters, ...filters }
          }
        })),

      addTransaction: (transaction) =>
        set((state) => ({
          transactions: {
            ...state.transactions,
            items: [transaction, ...state.transactions.items]
          }
        })),

      updateTransaction: (transaction) =>
        set((state) => ({
          transactions: {
            ...state.transactions,
            items: state.transactions.items.map((t) =>
              t.id === transaction.id ? transaction : t
            )
          }
        })),

      removeTransaction: (id) =>
        set((state) => ({
          transactions: {
            ...state.transactions,
            items: state.transactions.items.filter((t) => t.id !== id)
          }
        })),

      // Category actions
      setCategories: (response) =>
        set((state) => ({
          categories: {
            ...state.categories,
            items: response.items,
            loading: false
          }
        })),

      setCategoriesDropdown: (categories) =>
        set((state) => ({
          categories: {
            ...state.categories,
            dropdown: categories
          }
        })),

      setCategoriesLoading: (loading) =>
        set((state) => ({
          categories: { ...state.categories, loading }
        })),

      addCategory: (category) =>
        set((state) => ({
          categories: {
            ...state.categories,
            items: [...state.categories.items, category],
            dropdown: [...state.categories.dropdown, category]
          }
        })),

      updateCategory: (category) =>
        set((state) => ({
          categories: {
            ...state.categories,
            items: state.categories.items.map((c) =>
              c.id === category.id ? category : c
            ),
            dropdown: state.categories.dropdown.map((c) =>
              c.id === category.id ? category : c
            )
          }
        })),

      removeCategory: (id) =>
        set((state) => ({
          categories: {
            ...state.categories,
            items: state.categories.items.filter((c) => c.id !== id),
            dropdown: state.categories.dropdown.filter((c) => c.id !== id)
          }
        })),

      // Type actions
      setTypes: (response) =>
        set((state) => ({
          types: {
            ...state.types,
            items: response.items,
            loading: false
          }
        })),

      setTypesDropdown: (types) =>
        set((state) => ({
          types: {
            ...state.types,
            dropdown: types
          }
        })),

      setTypesLoading: (loading) =>
        set((state) => ({
          types: { ...state.types, loading }
        })),

      addType: (type) =>
        set((state) => ({
          types: {
            ...state.types,
            items: [...state.types.items, type],
            dropdown: [...state.types.dropdown, type]
          }
        })),

      updateType: (type) =>
        set((state) => ({
          types: {
            ...state.types,
            items: state.types.items.map((t) =>
              t.id === type.id ? type : t
            ),
            dropdown: state.types.dropdown.map((t) =>
              t.id === type.id ? type : t
            )
          }
        })),

      removeType: (id) =>
        set((state) => ({
          types: {
            ...state.types,
            items: state.types.items.filter((t) => t.id !== id),
            dropdown: state.types.dropdown.filter((t) => t.id !== id)
          }
        })),

      // Form actions
      setFormCreating: (creating) =>
        set((state) => ({
          form: { ...state.form, creating }
        })),

      setFormUpdating: (updating) =>
        set((state) => ({
          form: { ...state.form, updating }
        })),

      setFormApproving: (approving) =>
        set((state) => ({
          form: { ...state.form, approving }
        })),

      setFormError: (error) =>
        set((state) => ({
          form: { ...state.form, error }
        })),

      // Pending approvals actions
      setPendingApprovals: (transactions) =>
        set((state) => ({
          pendingApprovals: {
            ...state.pendingApprovals,
            items: transactions,
            loading: false,
            error: null
          }
        })),

      setPendingApprovalsLoading: (loading) =>
        set((state) => ({
          pendingApprovals: { ...state.pendingApprovals, loading }
        })),

      setPendingApprovalsError: (error) =>
        set((state) => ({
          pendingApprovals: { ...state.pendingApprovals, error, loading: false }
        })),

      updatePendingApproval: (transaction) =>
        set((state) => ({
          pendingApprovals: {
            ...state.pendingApprovals,
            items: state.pendingApprovals.items.map((t) =>
              t.id === transaction.id ? transaction : t
            )
          }
        })),

      removePendingApproval: (id) =>
        set((state) => ({
          pendingApprovals: {
            ...state.pendingApprovals,
            items: state.pendingApprovals.items.filter((t) => t.id !== id)
          }
        })),

      // Reset actions
      resetTransactionState: () =>
        set((state) => ({
          transactions: initialState.transactions
        })),

      resetCategoryState: () =>
        set((state) => ({
          categories: initialState.categories
        })),

      resetTypeState: () =>
        set((state) => ({
          types: initialState.types
        })),

      resetFormState: () =>
        set((state) => ({
          form: initialState.form
        })),

      reset: () => set(initialState)
    }),
    {
      name: 'expense-store'
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const useExpenseTransactions = () => useExpenseStore((state) => state.transactions);
export const useExpenseCategories = () => useExpenseStore((state) => state.categories);
export const useExpenseTypes = () => useExpenseStore((state) => state.types);
export const useExpenseForm = () => useExpenseStore((state) => state.form);
export const usePendingApprovals = () => useExpenseStore((state) => state.pendingApprovals);

// ============================================================================
// ACTION SELECTORS
// ============================================================================

export const useExpenseActions = () => useExpenseStore((state) => ({
  // Transaction actions
  setTransactions: state.setTransactions,
  setTransactionLoading: state.setTransactionLoading,
  setTransactionError: state.setTransactionError,
  updateTransactionFilters: state.updateTransactionFilters,
  addTransaction: state.addTransaction,
  updateTransaction: state.updateTransaction,
  removeTransaction: state.removeTransaction,

  // Category actions
  setCategories: state.setCategories,
  setCategoriesDropdown: state.setCategoriesDropdown,
  setCategoriesLoading: state.setCategoriesLoading,
  addCategory: state.addCategory,
  updateCategory: state.updateCategory,
  removeCategory: state.removeCategory,

  // Type actions
  setTypes: state.setTypes,
  setTypesDropdown: state.setTypesDropdown,
  setTypesLoading: state.setTypesLoading,
  addType: state.addType,
  updateType: state.updateType,
  removeType: state.removeType,

  // Form actions
  setFormCreating: state.setFormCreating,
  setFormUpdating: state.setFormUpdating,
  setFormApproving: state.setFormApproving,
  setFormError: state.setFormError,

  // Pending approvals actions
  setPendingApprovals: state.setPendingApprovals,
  setPendingApprovalsLoading: state.setPendingApprovalsLoading,
  setPendingApprovalsError: state.setPendingApprovalsError,
  updatePendingApproval: state.updatePendingApproval,
  removePendingApproval: state.removePendingApproval,

  // Reset actions
  resetTransactionState: state.resetTransactionState,
  resetCategoryState: state.resetCategoryState,
  resetTypeState: state.resetTypeState,
  resetFormState: state.resetFormState,
  reset: state.reset
}));