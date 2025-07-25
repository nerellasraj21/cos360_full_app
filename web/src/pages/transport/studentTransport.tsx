import React, { useState } from "react";

import { MasterPage } from "../masters/common/MasterPage";
import type { MasterPageConfig, FormField } from "../masters/common/MasterPage";
import type { StudentTransport, StudentTransportInput } from "@/types/masters/studentTransport";
import { dummyStudentTransports } from '@/api/masters/studentTransport';

const columns = [
    { key: "student_id", label: "Student ID", editable: true },
    { key: "trip_id", label: "Trip ID", editable: true },
    { key: "stop_id", label: "Stop ID", editable: true },
    { key: "fee_term_id", label: "Fee Term ID", editable: true },
    { key: "fee_per_term", label: "Fee Per Term", editable: true, render: (v: number) => `$${v}` },
    { key: "created_at", label: "Created At", editable: false, render: (v: string) => new Date(v).toLocaleDateString() },
    { key: "updated_at", label: "Updated At", editable: false, render: (v: string) => new Date(v).toLocaleDateString() },
];

const formFields: FormField[] = [
    { name: "student_id", label: "Student ID", type: "number", required: true },
    { name: "trip_id", label: "Trip ID", type: "number", required: true },
    { name: "stop_id", label: "Stop ID", type: "number", required: true },
    { name: "fee_term_id", label: "Fee Term ID", type: "number", required: true },
    { name: "fee_per_term", label: "Fee Per Term", type: "number", required: true },
];

const defaultValues: StudentTransportInput = {
    student_id: 0,
    trip_id: 0,
    stop_id: 0,
    fee_term_id: 0,
    fee_per_term: 0,
};

const PAGE_SIZE_DEFAULT = 5;

export default function StudentTransportPage() {

    const [isCreatePending, setIsCreatePending] = useState(false);
    const [data, setData] = useState<StudentTransport[]>(dummyStudentTransports);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);


    const total = data.length;
    const paginatedData = data.slice(page * pageSize, (page + 1) * pageSize);
    const hasMore = (page + 1) * pageSize < total;

    const handlePageChange = (newPage: number) => {
        if (newPage > page && hasMore) setPage(newPage);
        if (newPage < page && page > 0) setPage(newPage);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(0);
    };

    const config: MasterPageConfig<StudentTransport, StudentTransportInput> = {
        title: "Student Transport Assignments",
        columns,
        defaultValues,
        formFields,
        isLoading,
        data: paginatedData,
        onCreate: (input) => {
            setIsCreatePending(true);
            setTimeout(() => {
                const now = new Date().toISOString();
                setData((prev) => [
                    ...prev,
                    { 
                        ...input, 
                        id: prev.length ? Math.max(...prev.map(t => t.id)) + 1 : 1,
                        created_at: now,
                        updated_at: now
                    },
                ]);
                setIsCreatePending(false);
            }, 500);
        },
        onUpdate: (id, updated) => {
            setData((prev) => prev.map(t => t.id === id ? { 
                ...t, 
                ...updated, 
                updated_at: new Date().toISOString() 
            } : t));
        },
        onDelete: (id) => {
            setData((prev) => prev.filter(t => t.id !== id));
        },
        isCreatePending,
        resetForm: () => { },
        isEditing: true,
        pagination: {
            page,
            pageSize,
            total,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
        },
    };

    return <MasterPage config={config} />;
}