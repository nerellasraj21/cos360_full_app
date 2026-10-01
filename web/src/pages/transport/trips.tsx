import React, { useState, useMemo } from "react";
import { MasterPage } from "../masters/common/MasterPage";
import type { MasterPageConfig, FormField } from "../masters/common/MasterPage";
import type { TripOut, TripCreate } from "@/types/masters/trip";
import { VehiclesDropdown, TransportRoutesDropdown, DriversDropdown } from '@/components/dropdown-system/components';
import { useVehicles } from '@/api/hooks/masters/vehicles';
import { useRoutes } from '@/api/hooks/masters/routes';
import { useTrips, useCreateTrip, useUpdateTrip, useDeleteTrip } from '@/api/hooks/masters/trips';
import { useDrivers } from '@/hooks/staff/useStaff';

const PAGE_SIZE_DEFAULT = 5;

export default function TripsPage() {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

    const { data: tripsResponse, isLoading } = useTrips();
    const { data: vehicles } = useVehicles();
    const { data: routes } = useRoutes();
    const { data: drivers } = useDrivers();

    const createTrip = useCreateTrip();
    const updateTrip = useUpdateTrip();
    const deleteTrip = useDeleteTrip();

    // Support both array response and { items, total } response
    const trips = Array.isArray(tripsResponse) ? tripsResponse : (tripsResponse?.items || []);
    const vehicleMap = useMemo(() => new Map(vehicles?.map(v => [v.id, v.name]) || []), [vehicles]);
    const routeMap = useMemo(() => new Map(routes?.map(r => [r.id, r.route_name]) || []), [routes]);
    const driverMap = useMemo(() => new Map((drivers || []).map(d => [d.user_id, `${d.first_name}${d.last_name ? ' ' + d.last_name : ''}`])), [drivers]);

    const total = Array.isArray(tripsResponse) ? trips.length : (tripsResponse?.total || trips.length || 0);
    const paginatedData = trips.slice(page * pageSize, (page + 1) * pageSize);
    const hasMore = (page + 1) * pageSize < total;

    const columns = [
        {
            key: "vehicle_id",
            label: "Vehicle",
            editable: true,
            render: (value: any) => vehicleMap.get(value) || '—',
            renderEdit: (value: any, _row: any, onChange: (val: any) => void) => {
                const vehicleOptions = vehicles?.map(v => ({
                    id: v.id,
                    value: v.id,
                    label: `${v.name} - ${v.registration_number}`
                })) || [];
                return (
                    <VehiclesDropdown
                        value={value}
                        onChange={(newValue) => onChange(newValue)}
                        placeholder="Select Vehicle"
                        data={vehicleOptions}
                    />
                );
            },
        },
        {
            key: "route_id",
            label: "Route",
            editable: true,
            render: (value: any) => routeMap.get(value) || '—',
            renderEdit: (value: any, _row: any, onChange: (val: any) => void) => (
                <TransportRoutesDropdown
                    value={value}
                    onChange={(newValue) => onChange(newValue)}
                    placeholder="Select Route"
                />
            ),
        },
        {
            key: "driver_id",
            label: "Driver",
            editable: true,
            render: (value: any) => driverMap.get(value) || '—',
            renderEdit: (value: any, _row: any, onChange: (val: any) => void) => (
                <DriversDropdown
                    value={value}
                    onChange={(newValue) => onChange(newValue)}
                    placeholder="Select Driver"
                    data={(drivers || []).map(d => ({ id: d.user_id, value: d.user_id, label: `${d.first_name}${d.last_name ? ' ' + d.last_name : ''}` }))}
                />
            ),
        },
        {
            key: "trip_number",
            label: "Trip Number",
            editable: true,
        },
    ];

    const formFields: FormField[] = [
        { name: "vehicle_id", label: "Vehicle", required: true },
        { name: "route_id", label: "Route", required: true },
        { name: "driver_id", label: "Driver", required: true },
        { name: "trip_number", label: "Trip Number", type: "number", required: true },
    ];

    const defaultValues: TripCreate = {
        vehicle_id: "",
        route_id: "",
        driver_id: "",
        trip_number: 1,
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > page && hasMore) setPage(newPage);
        if (newPage < page && page > 0) setPage(newPage);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(0);
    };

    const renderCustomField = (field: FormField, value: any, onChange: (val: any) => void) => {
        if (field.name === 'vehicle_id') {
            const vehicleOptions = vehicles?.map(v => ({
                id: v.id,
                value: v.id,
                label: `${v.name} - ${v.registration_number}`
            })) || [];
            return (
                <VehiclesDropdown
                    value={value}
                    onChange={(newValue) => onChange(newValue)}
                    placeholder="Select Vehicle"
                    data={vehicleOptions}
                />
            );
        }
        if (field.name === 'route_id') {
            return (
                <TransportRoutesDropdown
                    value={value}
                    onChange={(newValue) => onChange(newValue)}
                    placeholder="Select Route"
                />
            );
        }
        if (field.name === 'driver_id') {
            return (
                <DriversDropdown
                    value={value}
                    onChange={(newValue) => onChange(newValue)}
                    placeholder="Select Driver"
                    data={(drivers || []).map(d => ({ id: d.user_id, value: d.user_id, label: `${d.first_name}${d.last_name ? ' ' + d.last_name : ''}` }))}
                />
            );
        }
        return null;
    };

    const config: MasterPageConfig<TripOut, TripCreate> = {
        title: "Trips",
        columns,
        defaultValues,
        formFields,
        isLoading,
        data: paginatedData,
        onCreate: (input) => createTrip.mutate(input),
        onUpdate: (id, updated) => updateTrip.mutate({ id: id.toString(), trip: updated }),
        onDelete: (id) => deleteTrip.mutate(id.toString()),
        isCreatePending: createTrip.status === 'pending',
        resetForm: () => { },
        renderCustomField,
        pagination: {
            page,
            pageSize,
            total,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
        },
        permissions: {
            resource: 'TRANSPORT_TRIPS',
            create: true,
            read: true,
            update: true,
            delete: true,
            list: true,
            export: true,
        },
    };

    return <MasterPage config={config} />;
}