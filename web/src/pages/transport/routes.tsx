import React, { useState } from "react";

import { MasterPage } from "../masters/common/MasterPage";
import type { MasterPageConfig, FormField } from "../masters/common/MasterPage";
import type { Route, RouteInput } from "@/types/masters/route";
import { useRoutes, useCreateRoute, useUpdateRoute, useDeleteRoute } from '@/api/hooks/masters/routes';
import { PermissionGuard } from '@/components/common';
import Select from 'react-select';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldX } from 'lucide-react';

const columns = [
    { key: "route_name", label: "Route Name", editable: true },
    { key: "starting_stop", label: "Starting Stop", editable: true },
    { key: "ending_stop", label: "Ending Stop", editable: true },
    { key: "number_of_stops", label: "Number of Stops", editable: true },
    {
        key: "route_type",
        label: "Route Type",
        editable: true,
        renderEdit: (value: any, _row: Route, onChange: (val: any) => void) => (
            <Select
                options={routeTypeOptions}
                value={routeTypeOptions.find((opt) => opt.value === value) || null}
                onChange={(option: any) => onChange(option?.value || '')}
                placeholder="Select Route Type"
                classNamePrefix="react-select"
                menuPlacement="auto"
                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px' })
                }}
                isClearable={false}
            />
        )
    },
    {
        key: "trip_type",
        label: "Trip Type",
        editable: true,
        renderEdit: (value: any, _row: Route, onChange: (val: any) => void) => (
            <Select
                options={tripTypeOptions}
                value={tripTypeOptions.find((opt) => opt.value === value) || null}
                onChange={(option: any) => onChange(option?.value || '')}
                placeholder="Select Trip Type"
                classNamePrefix="react-select"
                menuPlacement="auto"
                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                    control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px' })
                }}
                isClearable={false}
            />
        )
    },
    {
        key: "start_time",
        label: "Start Time",
        editable: true,
        render: (value: string) => value ? value.substring(0, 5) : 'N/A',
        renderEdit: (value: any, _row: Route, onChange: (val: any) => void) => (
            <input
                type="time"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-2 py-1 border border-input rounded text-sm"
                style={{ minHeight: '32px' }}
            />
        )
    },
    {
        key: "end_time",
        label: "End Time",
        editable: true,
        render: (value: string) => value ? value.substring(0, 5) : 'N/A',
        renderEdit: (value: any, _row: Route, onChange: (val: any) => void) => (
            <input
                type="time"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-2 py-1 border border-input rounded text-sm"
                style={{ minHeight: '32px' }}
            />
        )
    },
    {
        key: "is_active",
        label: "Active",
        editable: true,
        render: (v: boolean) => v ? "Yes" : "No",
        renderEdit: (value: any, _row: Route, onChange: (val: any) => void) => (
            <div className="flex items-center justify-center">
                <input
                    type="checkbox"
                    checked={!!value}
                    onChange={e => onChange(e.target.checked)}
                    className="w-4 h-4"
                />
            </div>
        )
    },
];

const routeTypeOptions = [
    { value: 'upward', label: 'Upward' },
    { value: 'downward', label: 'Downward' }
];

const tripTypeOptions = [
    { value: 'first trip', label: 'First Trip' },
    { value: 'second trip', label: 'Second Trip' }
];

const formFields: FormField[] = [
    { name: "route_name", label: "Route Name", required: true },
    { name: "starting_stop", label: "Starting Stop", required: true },
    { name: "ending_stop", label: "Ending Stop", required: true },
    { name: "number_of_stops", label: "Number of Stops", type: "number", required: true },
    { name: "route_type", label: "Route Type", required: true },
    { name: "trip_type", label: "Trip Type", required: true },
    { name: "start_time", label: "Start Time", required: true },
    { name: "end_time", label: "End Time", required: true },
    { name: "is_active", label: "Active", type: "checkbox" },
];

const defaultValues: RouteInput = {
    route_name: "",
    starting_stop: "",
    ending_stop: "",
    number_of_stops: 8,
    route_type: 'upward',
    trip_type: 'first trip',
    start_time: "07:00:00",
    end_time: "08:30:00",
    is_active: true,
};


const PAGE_SIZE_DEFAULT = 5;

export default function RoutesPage() {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

    const { data: routes = [], isLoading } = useRoutes();
    const createRoute = useCreateRoute();
    const updateRoute = useUpdateRoute();
    const deleteRoute = useDeleteRoute();

    const total = routes.length;
    const paginatedData = routes.slice(page * pageSize, (page + 1) * pageSize);
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
        title: "Route Management",
        columns,
        defaultValues,
        formFields,
        isLoading,
        data: paginatedData,
        onCreate: (input) => createRoute.mutate(input),
        onUpdate: (id, route) => updateRoute.mutate({ id: (id as any).toString(), route }),
        onDelete: (id) => deleteRoute.mutate((id as any).toString()),
        isCreatePending: createRoute.status === 'pending',
        resetForm: () => { },
        pagination: {
            page,
            pageSize,
            total,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
        },
        permissions: {
            resource: 'ROUTES',
            create: true,
            read: true,
            update: true,
            delete: true,
            list: true,
            export: true,
        },
        renderCustomField: (field, value, onChange) => {
            if (field.name === 'route_type') {
                return (
                    <Select
                        options={routeTypeOptions}
                        value={routeTypeOptions.find((opt) => opt.value === value) || null}
                        onChange={(option: any) => onChange(option?.value || '')}
                        placeholder="Select Route Type"
                        classNamePrefix="react-select"
                        menuPlacement="auto"
                        menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                    />
                );
            }
            if (field.name === 'trip_type') {
                return (
                    <Select
                        options={tripTypeOptions}
                        value={tripTypeOptions.find((opt) => opt.value === value) || null}
                        onChange={(option: any) => onChange(option?.value || '')}
                        placeholder="Select Trip Type"
                        classNamePrefix="react-select"
                        menuPlacement="auto"
                        menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                    />
                );
            }
            if (field.name === 'start_time' || field.name === 'end_time') {
                return (
                    <input
                        type="time"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                        required={field.required}
                    />
                );
            }
            return null;
        },
    };

    return (
        <PermissionGuard
            resource="routes"
            action="list"
            fallback={
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Card className="w-full max-w-md">
                            <CardContent className="pt-6">
                                <div className="text-center space-y-4">
                                    <ShieldX className="h-16 w-16 text-muted-foreground mx-auto" />
                                    <div>
                                        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                                        <p className="text-muted-foreground mt-2">
                                            You don't have permission to view routes.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            }
        >
            <MasterPage config={config as any} />
        </PermissionGuard>
    );
}