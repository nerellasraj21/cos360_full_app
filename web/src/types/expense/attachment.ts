export type AttachmentType = 'invoice' | 'receipt' | 'quotation' | 'approval_document' | 'other';

export interface ExpenseAttachment {
    id: string;
    transaction_id: string;
    attachment_type: AttachmentType;
    file_name: string;
    original_name: string;
    file_size: number;
    file_type: string;
    description?: string;
    upload_date: string;
    uploaded_by: {
        id: string;
        name: string;
    };
    file_url: string;
    thumbnail_url?: string;
}

export interface ExpenseAttachmentUploadRequest {
    transaction_id: string;
    attachment_type: AttachmentType;
    description?: string;
    file: File;
}

export interface ExpenseAttachmentUpdateRequest {
    attachment_type?: AttachmentType;
    description?: string;
}