import { useState } from "react";

import { MasterPage } from "../masters/common/MasterPage";
import type { MasterPageConfig, FormField } from "../masters/common/MasterPage";
import type { StudentTransportOut, StudentTransportCreate } from "@/types/masters/studentTransport";
import { useStudentTransports, useCreateStudentTransport, useUpdateStudentTransport, useDeleteStudentTransport } from '@/api/hooks/masters/studentTransport';

// Updated to match backend schema (2026-02-09)
const formFields: FormField[] = [
    { name: "trip_id", label: "Trip ID", required: true },
    { name: "student_id", label: "Student ID", required: true },
    { name: "stop_id", label: "Stop ID", required: true },
    { name: "pricing_id", label: "Pricing ID" },
    { name: "fee_per_term", label: "Fee Per Term", type: "number", required: true },
];

const defaultValues: StudentTransportCreate = {
    trip_id: "",
    student_id: "",
    stop_id: "",
    pricing_id: null,
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
            key: "student_id",
            label: "Student",
            editable: true,
            render: (v: string, row: StudentTransportOut) =>
                row.student ? `${row.student.first_name} ${row.student.last_name}`.trim() : v,
        },
        {
            key: "trip_id",
            label: "Trip",
            editable: true,
            render: (v: string, row: StudentTransportOut) =>
                row.trip
                    ? `${row.trip.route?.route_name ?? 'Trip'} #${row.trip.trip_number}${row.trip.vehicle ? ` - ${row.trip.vehicle.name}` : ''}`
                    : v,
        },
        {
            key: "stop_id",
            label: "Stop",
            editable: true,
            render: (v: string, row: StudentTransportOut) => row.stop?.name ?? v,
        },
        {
            key: "pricing_id",
            label: "Pricing",
            editable: true,
            render: (_v: string | null, row: StudentTransportOut) =>
                row.pricing ? `${row.pricing.cycle_name} (₹${Number(row.pricing.amount).toLocaleString()})` : '—',
        },
        {
            key: "fee_per_term",
            label: "Fee Per Term",
            editable: true,
            render: (v: number | string) => `₹${Number(v).toLocaleString()}`,
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
        addButtonLabel: "Add Student Transport",
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