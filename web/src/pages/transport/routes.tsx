import React, { useState } from "react";

import { MasterPage } from "../masters/common/MasterPage";
import type { MasterPageConfig, FormField } from "../masters/common/MasterPage";
import type { Route, RouteInput } from "@/types/masters/route";
import { dummyRoutes } from '@/api/masters/routes';

const columns = [
    { key: "route_name", label: "Route Name", editable: true },
    { key: "starting_stop", label: "Starting Stop", editable: true },
    { key: "ending_stop", label: "Ending Stop", editable: true },
    { key: "number_of_stops", label: "Stops", editable: true },
    { key: "route_type", label: "Route Type", editable: true },
    { key: "trip_type", label: "Trip Type", editable: true },
    { key: "start_time", label: "Start Time", editable: true },
    { key: "end_time", label: "End Time", editable: true },
    { key: "is_active", label: "Active", editable: true, render: (v: boolean) => v ? "Yes" : "No" },
];

const formFields: FormField[] = [
    { name: "route_name", label: "Route Name", required: true },
    { name: "starting_stop", label: "Starting Stop", required: true },
    { name: "ending_stop", label: "Ending Stop", required: true },
    { name: "number_of_stops", label: "Number of Stops", type: "number", required: true },
    { name: "route_type", label: "Route Type", required: true },
    { name: "trip_type", label: "Trip Type", required: true },
    { name: "start_time", label: "Start Time", type: "text", required: true },
    { name: "end_time", label: "End Time", type: "text", required: true },
    { name: "is_active", label: "Active", type: "checkbox" },
];

const defaultValues: RouteInput = {
    route_name: "",
    starting_stop: "",
    ending_stop: "",
    number_of_stops: 0,
    route_type: "",
    trip_type: "",
    start_time: "",
    end_time: "",
    is_active: true,
};


const PAGE_SIZE_DEFAULT = 5;

export default function RoutesPage() {

    const [isCreatePending, setIsCreatePending] = useState(false);
    const [data, setData] = useState<Route[]>(dummyRoutes);
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

    const config: MasterPageConfig<Route, RouteInput> = {
        title: "Routes",
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
                    { ...input, id: prev.length ? Math.max(...prev.map(r => r.id)) + 1 : 1, is_active: input.is_active ?? true },
                ]);
                setIsCreatePending(false);
            }, 500);
        },
        onUpdate: (id, updated) => {
            setData((prev) => prev.map(r => r.id === id ? { ...r, ...updated } : r));
        },
        onDelete: (id) => {
            setData((prev) => prev.filter(r => r.id !== id));
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