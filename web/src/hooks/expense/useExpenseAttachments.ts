import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { expenseApi } from '@/api/expense';
import type {
    ExpenseAttachment,
    ExpenseAttachmentUploadRequest,
} from '@/types/expense';

// Query keys for expense attachments
export const expenseAttachmentKeys = {
    all: ['expense-attachments'] as const,
    byTransaction: (transactionId: string) => [...expenseAttachmentKeys.all, 'transaction', transactionId] as const,
    details: () => [...expenseAttachmentKeys.all, 'detail'] as const,
    detail: (id: string) => [...expenseAttachmentKeys.details(), id] as const,
};

// Get attachments for a transaction
export function useExpenseAttachmentsByTransaction(transactionId: string) {
    return useQuery<ExpenseAttachment[]>({
        queryKey: expenseAttachmentKeys.byTransaction(transactionId),
        queryFn: () => expenseApi.getTransactionAttachments(transactionId),
        enabled: !!transactionId,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

// Upload attachment mutation
export function useUploadExpenseAttachment() {
    const queryClient = useQueryClient();

    return useMutation<ExpenseAttachment, Error, ExpenseAttachmentUploadRequest>({
        mutationFn: (req) => expenseApi.uploadAttachment(req.transaction_id, req.file, req.document_type, req.department_id),
        onSuccess: (data) => {
            // Invalidate transaction attachments list
            queryClient.invalidateQueries({ queryKey: expenseAttachmentKeys.byTransaction(data.transaction_id) });

            toast.success('Attachment uploaded successfully');
        },
        onError: (error) => {
            toast.error(`Failed to upload attachment: ${error.message}`);
        },
    });
}

// Delete attachment mutation
export function useDeleteExpenseAttachment() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { transactionId: string; attachmentId: string }>({
        mutationFn: ({ attachmentId }) =>
            expenseApi.deleteAttachment(attachmentId),
        onSuccess: (_, { transactionId }) => {
            // Invalidate transaction attachments list
            queryClient.invalidateQueries({ queryKey: expenseAttachmentKeys.byTransaction(transactionId) });

            toast.success('Attachment deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete attachment: ${error.message}`);
        },
    });
}

// Download attachment
export function useDownloadExpenseAttachment() {
    return useMutation<Blob, Error, { transactionId: string; attachmentId: string }>({
        mutationFn: ({ attachmentId }) =>
            expenseApi.downloadAttachment(attachmentId),
        onError: (error) => {
            toast.error(`Failed to download attachment: ${error.message}`);
        },
    });
}
