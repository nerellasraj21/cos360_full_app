import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { expenseAttachmentsApi } from '@/api/expense';
import type {
    ExpenseAttachment,
    ExpenseAttachmentUploadRequest,
    ExpenseAttachmentUpdateRequest
} from '@/types/expense';

// Query keys for expense attachments
export const expenseAttachmentKeys = {
    all: ['expense-attachments'] as const,
    details: () => [...expenseAttachmentKeys.all, 'detail'] as const,
    detail: (id: string) => [...expenseAttachmentKeys.details(), id] as const,
};

// Get attachment by ID
export function useExpenseAttachment(id: string) {
    return useQuery<ExpenseAttachment>({
        queryKey: expenseAttachmentKeys.detail(id),
        queryFn: () => expenseAttachmentsApi.getAttachment(id),
        enabled: !!id,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

// Upload attachment mutation
export function useUploadExpenseAttachment() {
    const queryClient = useQueryClient();

    return useMutation<ExpenseAttachment, Error, ExpenseAttachmentUploadRequest>({
        mutationFn: expenseAttachmentsApi.uploadAttachment,
        onSuccess: (data) => {
            // Add the new attachment to the cache
            queryClient.setQueryData(expenseAttachmentKeys.detail(data.id), data);

            toast.success('Attachment uploaded successfully');
        },
        onError: (error) => {
            toast.error(`Failed to upload attachment: ${error.message}`);
        },
    });
}

// Update attachment mutation
export function useUpdateExpenseAttachment() {
    const queryClient = useQueryClient();

    return useMutation<ExpenseAttachment, Error, { id: string; data: ExpenseAttachmentUpdateRequest }>({
        mutationFn: ({ id, data }) => expenseAttachmentsApi.updateAttachment(id, data),
        onSuccess: (data) => {
            // Update the attachment in cache
            queryClient.setQueryData(expenseAttachmentKeys.detail(data.id), data);

            toast.success('Attachment updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update attachment: ${error.message}`);
        },
    });
}

// Delete attachment mutation
export function useDeleteExpenseAttachment() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: expenseAttachmentsApi.deleteAttachment,
        onSuccess: (_, id) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: expenseAttachmentKeys.detail(id) });

            toast.success('Attachment deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete attachment: ${error.message}`);
        },
    });
}

// Download attachment
export function useDownloadExpenseAttachment() {
    return useMutation<Blob, Error, string>({
        mutationFn: expenseAttachmentsApi.downloadAttachment,
        onError: (error) => {
            toast.error(`Failed to download attachment: ${error.message}`);
        },
    });
}