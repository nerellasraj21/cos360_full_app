import React, { useState } from "react";
import { MasterPage } from "../masters/common/MasterPage";
import type { MasterPageConfig, FormField } from "../masters/common/MasterPage";
import type { Trip, TripInput } from "@/types/masters/trip";
import { dummyTrips } from '@/api/masters/trips';

const columns = [
    { key: "vehicle_id", label: "Vehicle ID", editable: true },
    { key: "route_id", label: "Route ID", editable: true },
    { key: "driver_id", label: "Driver ID", editable: true },
    { key: "trip_number", label: "Trip Number", editable: true },
];

const formFields: FormField[] = [
    { name: "vehicle_id", label: "Vehicle ID", type: "number", required: true },
    { name: "route_id", label: "Route ID", type: "number", required: true },
    { name: "driver_id", label: "Driver ID", type: "number", required: true },
    { name: "trip_number", label: "Trip Number", type: "number", required: true },
];

const defaultValues: TripInput = {
    vehicle_id: 0,
    route_id: 0,
    driver_id: 0,
    trip_number: 0,
};

const PAGE_SIZE_DEFAULT = 5;

export default function TripsPage() {
    const [isCreatePending, setIsCreatePending] = useState(false);
    const [data, setData] = useState<Trip[]>(dummyTrips);
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

    const config: MasterPageConfig<Trip, TripInput> = {
        title: "Trips",
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
                    { ...input, id: prev.length ? Math.max(...prev.map(t => t.id)) + 1 : 1 },
                ]);
                setIsCreatePending(false);
            }, 500);
        },
        onUpdate: (id, updated) => {
            setData((prev) => prev.map(t => t.id === id ? { ...t, ...updated } : t));
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