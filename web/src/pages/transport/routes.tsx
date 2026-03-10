import React, { useState } from "react";

import { MasterPage } from "../masters/common/MasterPage";
import type { MasterPageConfig, FormField } from "../masters/common/MasterPage";
import type { Route, RouteInput } from "@/types/masters/route";
import { useRoutes, useCreateRoute, useUpdateRoute, useDeleteRoute } from '@/api/hooks/masters/routes';
import {
    useRouteTypesDropdown,
    useTripTypesDropdown,
    useCreateRouteType,
    useCreateTripType
} from '@/api/hooks/masters/transportOptions';
import { PermissionGuard } from '@/components/common';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ShieldX, Loader2 } from 'lucide-react';
import type { RouteTypeDropdown, TripTypeDropdown } from '@/types/masters/transportTypes';
import { toast } from 'sonner';

// Helper function to create columns with dynamic options
const createColumns = (routeTypeOptions: RouteTypeDropdown[], tripTypeOptions: TripTypeDropdown[]) => [
    { key: "route_name", label: "Route Name", editable: true },
    { key: "starting_stop", label: "Starting Stop", editable: true },
    { key: "ending_stop", label: "Ending Stop", editable: true },
    { key: "number_of_stops", label: "Number of Stops", editable: true },
    {
        key: "route_type",
        label: "Route Type",
        editable: true,
        render: (value: string | null) => {
            // Backend returns route_type as a STRING directly
            return value || <span className="text-muted-foreground">-</span>;
        },
        renderEdit: (value: any, _row: Route, onChange: (val: any) => void) => (
            <Select
                options={routeTypeOptions.map(rt => ({ value: rt.type_name, label: rt.type_name }))}
                value={routeTypeOptions.map(rt => ({ value: rt.type_name, label: rt.type_name })).find((opt) => opt.value === value) || null}
                onChange={(option: any) => onChange(option?.value || '')}
                placeholder="Select Route Type"
                classNamePrefix="react-select"
                menuPlacement="auto"
                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                    control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px' }),
                    menu: (base) => ({ ...base, pointerEvents: 'auto' })
                }}
                isClearable={false}
                menuShouldBlockScroll={false}
                closeMenuOnScroll={false}
                tabSelectsValue={false}
                openMenuOnFocus={true}
                blurInputOnSelect={true}
            />
        )
    },
    {
        key: "trip_type",
        label: "Trip Type",
        editable: true,
        render: (value: string | null) => {
            // Backend returns trip_type as a STRING directly
            return value || <span className="text-muted-foreground">-</span>;
        },
        renderEdit: (value: any, _row: Route, onChange: (val: any) => void) => (
            <Select
                options={tripTypeOptions.map(tt => ({ value: tt.type_name, label: tt.type_name }))}
                value={tripTypeOptions.map(tt => ({ value: tt.type_name, label: tt.type_name })).find((opt) => opt.value === value) || null}
                onChange={(option: any) => onChange(option?.value || '')}
                placeholder="Select Trip Type"
                classNamePrefix="react-select"
                menuPlacement="auto"
                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                    control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px' }),
                    menu: (base) => ({ ...base, pointerEvents: 'auto' })
                }}
                isClearable={false}
                menuShouldBlockScroll={false}
                closeMenuOnScroll={false}
                tabSelectsValue={false}
                openMenuOnFocus={true}
                blurInputOnSelect={true}
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
        render: (v: boolean) => (
            <StatusBadge status={v} />
        ),
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
    route_type: '', // Type name string (e.g., "Upward")
    trip_type: '', // Type name string (e.g., "First Trip")
    start_time: "07:00:00",
    end_time: "08:30:00",
    is_active: true,
};


const PAGE_SIZE_DEFAULT = 5;

export default function RoutesPage() {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

    // Fetch routes data
    const { data: routes = [], isLoading } = useRoutes();
    const createRoute = useCreateRoute();
    const updateRoute = useUpdateRoute();
    const deleteRoute = useDeleteRoute();

    // Fetch dynamic options from backend
    const { data: routeTypeOptions = [], isLoading: isLoadingRouteTypes } = useRouteTypesDropdown();
    const { data: tripTypeOptions = [], isLoading: isLoadingTripTypes } = useTripTypesDropdown();

    // Mutations for creating new types on the fly
    const createRouteTypeMutation = useCreateRouteType();
    const createTripTypeMutation = useCreateTripType();

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

    // Show loading state while fetching options
    if (isLoadingRouteTypes || isLoadingTripTypes) {
        return (
            <Card>
                <CardContent className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading options...</span>
                </CardContent>
            </Card>
        );
    }

    // Create columns with dynamic options
    const columns = createColumns(routeTypeOptions, tripTypeOptions);

    const config: MasterPageConfig<Route, RouteInput> = {
        title: "Routes",
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
                const selectOptions = routeTypeOptions.map(rt => ({ value: rt.type_name, label: rt.type_name }));

                const handleCreateRouteType = async (inputValue: string) => {
                    const trimmedValue = inputValue.trim();
                    if (!trimmedValue) return;

                    // Check for duplicates
                    if (routeTypeOptions.some(rt => rt.type_name.toLowerCase() === trimmedValue.toLowerCase())) {
                        toast.error(`Route type "${trimmedValue}" already exists`);
                        return;
                    }

                    try {
                        const newType = await createRouteTypeMutation.mutateAsync({
                            type_name: trimmedValue,
                            is_active: true
                        });
                        onChange(newType.type_name); // Store the type_name STRING
                        toast.success(`Route type "${trimmedValue}" created successfully`);
                    } catch (error: any) {
                        toast.error(error.message || 'Failed to create route type');
                    }
                };

                return (
                    <div>
                        <CreatableSelect
                            options={selectOptions}
                            value={selectOptions.find((opt) => opt.value === value) || null}
                            onChange={(option: any) => onChange(option?.value || '')}
                            onCreateOption={handleCreateRouteType}
                            placeholder="Select or type to create..."
                            formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
                            classNamePrefix="react-select"
                            menuPlacement="auto"
                            menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                            styles={{
                                menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                                menu: (base) => ({ ...base, pointerEvents: 'auto' })
                            }}
                            menuShouldBlockScroll={false}
                            closeMenuOnScroll={false}
                            tabSelectsValue={false}
                            openMenuOnFocus={true}
                            blurInputOnSelect={true}
                            isDisabled={createRouteTypeMutation.isPending}
                            isLoading={createRouteTypeMutation.isPending}
                            onKeyDown={(e) => {
                                // Prevent form submission on Enter
                                if (e.key === 'Enter') {
                                    e.stopPropagation();
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Type a new route type and press Enter to create it
                        </p>
                    </div>
                );
            }
            if (field.name === 'trip_type') {
                const selectOptions = tripTypeOptions.map(tt => ({ value: tt.type_name, label: tt.type_name }));

                const handleCreateTripType = async (inputValue: string) => {
                    const trimmedValue = inputValue.trim();
                    if (!trimmedValue) return;

                    // Check for duplicates
                    if (tripTypeOptions.some(tt => tt.type_name.toLowerCase() === trimmedValue.toLowerCase())) {
                        toast.error(`Trip type "${trimmedValue}" already exists`);
                        return;
                    }

                    try {
                        const newType = await createTripTypeMutation.mutateAsync({
                            type_name: trimmedValue,
                            is_active: true
                        });
                        onChange(newType.type_name); // Store the type_name STRING
                        toast.success(`Trip type "${trimmedValue}" created successfully`);
                    } catch (error: any) {
                        toast.error(error.message || 'Failed to create trip type');
                    }
                };

                return (
                    <div>
                        <CreatableSelect
                            options={selectOptions}
                            value={selectOptions.find((opt) => opt.value === value) || null}
                            onChange={(option: any) => onChange(option?.value || '')}
                            onCreateOption={handleCreateTripType}
                            placeholder="Select or type to create..."
                            formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
                            classNamePrefix="react-select"
                            menuPlacement="auto"
                            menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                            styles={{
                                menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                                menu: (base) => ({ ...base, pointerEvents: 'auto' })
                            }}
                            menuShouldBlockScroll={false}
                            closeMenuOnScroll={false}
                            tabSelectsValue={false}
                            openMenuOnFocus={true}
                            blurInputOnSelect={true}
                            isDisabled={createTripTypeMutation.isPending}
                            isLoading={createTripTypeMutation.isPending}
                            onKeyDown={(e) => {
                                // Prevent form submission on Enter
                                if (e.key === 'Enter') {
                                    e.stopPropagation();
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Type a new trip type and press Enter to create it
                        </p>
                    </div>
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