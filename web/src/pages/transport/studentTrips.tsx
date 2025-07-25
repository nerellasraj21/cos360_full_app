import React, { useState } from "react";

import { MasterPage } from "../masters/common/MasterPage";
import type { MasterPageConfig, FormField } from "../masters/common/MasterPage";
import type { StudentTrip, StudentTripInput } from "@/types/masters/studentTrips";
import { dummyStudentTrips } from '@/api/masters/studentTrips';

const columns = [
    { key: "trip_id", label: "Trip ID", editable: true },
    { key: "student_id", label: "Student ID", editable: true },
    { key: "stop_id", label: "Stop ID", editable: true },
    { key: "fee_term_id", label: "Fee Term ID", editable: true },
    { key: "fee_per_term", label: "Fee Per Term", editable: true, render: (v: number) => `$${v}` },
    { key: "is_active", label: "Active", editable: true, render: (v: boolean) => v ? "Yes" : "No" },
];

const formFields: FormField[] = [
    { name: "trip_id", label: "Trip ID", type: "number", required: true },
    { name: "student_id", label: "Student ID", type: "number", required: true },
    { name: "stop_id", label: "Stop ID", type: "number", required: true },
    { name: "fee_term_id", label: "Fee Term ID", type: "number", required: true },
    { name: "fee_per_term", label: "Fee Per Term", type: "number", required: true },
    { name: "is_active", label: "Active", type: "checkbox" },
];

const defaultValues: StudentTripInput = {
    trip_id: 0,
    student_id: 0,
    stop_id: 0,
    fee_term_id: 0,
    fee_per_term: 0,
    is_active: true,
};

const PAGE_SIZE_DEFAULT = 5;

export default function StudentTripsPage() {

    const [isCreatePending, setIsCreatePending] = useState(false);
    const [data, setData] = useState<StudentTrip[]>(dummyStudentTrips);
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

    const config: MasterPageConfig<StudentTrip, StudentTripInput> = {
        title: "Student Trips",
        columns,
        defaultValues,
        formFields,
        isLoading,
        data: paginatedData,
        onCreate: (input) => {
            setIsCreatePending(true);
            setTimeout(() => {
                setData((prev) => [
                    ...prev,
                    { 
                        ...input, 
                        id: prev.length ? Math.max(...prev.map(t => t.id)) + 1 : 1,
                        is_active: input.is_active ?? true
                    },
                ]);
                setIsCreatePending(false);
            }, 500);
        },
        onUpdate: (id, updated) => {
            setData((prev) => prev.map(t => t.id === id ? { 
                ...t, 
                ...updated
            } : t));
        },
        onDelete: (id) => {

            setData((prev) => prev.map(t => t.id === id ? { 
                ...t, 
                is_active: false 
            } : t));
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