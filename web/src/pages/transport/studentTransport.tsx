import React, { useState, useMemo } from "react";

import { MasterPage } from "../masters/common/MasterPage";
import type { MasterPageConfig, FormField } from "../masters/common/MasterPage";
import type { StudentTransport, StudentTransportInput } from "@/types/masters/studentTransport";
import { useStudentTransports, useCreateStudentTransport, useUpdateStudentTransport, useDeleteStudentTransport } from '@/api/hooks/masters/studentTransport';
import { useAdmissions } from '@/api/hooks/students/admissions';
import { useRoutes } from '@/api/hooks/masters/routes';

const formFields: FormField[] = [
    { name: "student_id", label: "Student ID", required: true },
    { name: "route_id", label: "Route ID", required: true },
    { name: "stop_id", label: "Stop ID", required: true },
    { name: "trip_type", label: "Trip Type", required: true },
    { name: "academic_year_id", label: "Academic Year ID", required: true },
    { name: "fare_amount", label: "Fare Amount", type: "number", required: true },
];

const defaultValues: StudentTransportInput = {
    student_id: "",
    route_id: "",
    stop_id: "",
    trip_type: "pickup",
    academic_year_id: "",
    fare_amount: 0,
};

const PAGE_SIZE_DEFAULT = 5;

export default function StudentTransportPage() {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

    const { data: studentTransports = [], isLoading } = useStudentTransports();
    const { data: routes } = useRoutes();

    const createStudentTransport = useCreateStudentTransport();
    const updateStudentTransport = useUpdateStudentTransport();
    const deleteStudentTransport = useDeleteStudentTransport();

    const routeMap = useMemo(() => new Map(routes?.map(r => [r.id, r.route_name]) || []), [routes]);

    const columns = [
        {
            key: "student_id",
            label: "Student ID",
            editable: true,
        },
        {
            key: "route_id",
            label: "Route",
            editable: true,
            render: (value: any) => routeMap.get(value) || value,
        },
        {
            key: "stop_id",
            label: "Stop ID",
            editable: true,
        },
        {
            key: "trip_type",
            label: "Trip Type",
            editable: true,
        },
        {
            key: "academic_year_id",
            label: "Academic Year",
            editable: true,
        },
        {
            key: "fare_amount",
            label: "Fare Amount",
            editable: true,
            render: (v: number) => `$${v}`,
        },
        {
            key: "is_active",
            label: "Active",
            editable: true,
            render: (v: boolean) => v ? "Yes" : "No",
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

    const config: MasterPageConfig<StudentTransport, StudentTransportInput> = {
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
    };

    return <MasterPage config={config} />;
}