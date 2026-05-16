import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { feeReceiptsApi } from '@/api/fee/receipts';

export const feeReceiptKeys = {
  all: ['fee-receipts'] as const,
};

export function useGenerateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => feeReceiptsApi.generateReceipt(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeReceiptKeys.all });
      queryClient.invalidateQueries({ queryKey: ['fee-transactions'] });
      toast.success('Receipt generated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate receipt');
    },
  });
}
