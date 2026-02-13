import { useState } from "react";

import { MasterPage } from "../masters/common/MasterPage";
import type { MasterPageConfig, FormField } from "../masters/common/MasterPage";
import type { StudentTransportOut, StudentTransportCreate } from "@/types/masters/studentTransport";
import { useStudentTransports, useCreateStudentTransport, useUpdateStudentTransport, useDeleteStudentTransport } from '@/api/hooks/masters/studentTransport';
import { Badge } from '@/components/ui/badge';

// Updated to match backend schema (2026-02-09)
const formFields: FormField[] = [
    { name: "trip_id", label: "Trip ID", required: true },
    { name: "student_id", label: "Student ID", required: true },
    { name: "stop_id", label: "Stop ID", required: true },
    { name: "fee_term_id", label: "Fee Term ID", required: true },
    { name: "fee_per_term", label: "Fee Per Term", type: "number", required: true },
];

const defaultValues: StudentTransportCreate = {
    trip_id: "",
    student_id: "",
    stop_id: "",
    fee_term_id: "",
    fee_per_term: 0,
};

const PAGE_SIZE_DEFAULT = 5;

export default function StudentTransportPage() {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

    const { data: studentTransports = [], isLoading } = useStudentTransports();

    const createStudentTransport = useCreateStudentTransport();
    const updateStudentTransport = useUpdateStudentTransport();
    const deleteStudentTransport = useDeleteStudentTransport();

    // Updated columns to match new backend schema
    const columns = [
        {
            key: "trip_id",
            label: "Trip ID",
            editable: true,
        },
        {
            key: "student_id",
            label: "Student ID",
            editable: true,
        },
        {
            key: "stop_id",
            label: "Stop ID",
            editable: true,
        },
        {
            key: "fee_term_id",
            label: "Fee Term",
            editable: true,
        },
        {
            key: "fee_per_term",
            label: "Fee Per Term",
            editable: true,
            render: (v: number) => `$${v}`,
        },
        {
            key: "is_active",
            label: "Active",
            editable: true,
            render: (v: boolean) => (
                <Badge variant={v ? "default" : "secondary"}>
                    {v ? 'Active' : 'Inactive'}
                </Badge>
            ),
        },
    ];

    const total = studentTransports.length;
    const paginatedData = studentTransports.slice(page * pageSize, (page + 1) * pageSize);
    const hasMore = (page + 1) * pageSize < total;

    const handlePageChange = (newPage: number) => {
        if (newPage > page && hasMore) setPage(newPage);
        if (newPage < page && page > 0) setPage(newPage);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(0);
    };

    const config: MasterPageConfig<StudentTransportOut, StudentTransportCreate> = {
        title: "Student Transport",
        columns,
        defaultValues,
        formFields,
        isLoading,
        data: paginatedData,
        onCreate: (input) => createStudentTransport.mutate(input),
        onUpdate: (id, updated) => updateStudentTransport.mutate({ id: id.toString(), transport: updated }),
        onDelete: (id) => deleteStudentTransport.mutate(id.toString()),
        isCreatePending: createStudentTransport.status === 'pending',
        resetForm: () => { },
        pagination: {
            page,
            pageSize,
            total,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
        },
        permissions: {
            resource: 'STUDENT_TRANSPORT',
            create: true,
            read: true,
            update: true,
            delete: true,
            list: true,
        },
    };

    return <MasterPage config={config} />;
}