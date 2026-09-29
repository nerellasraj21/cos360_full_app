import React, { useState, useEffect, useMemo } from "react";

import { MasterPage } from "../masters/common/MasterPage";
import type { MasterPageConfig, FormField } from "../masters/common/MasterPage";
import type { StudentTripBase, StudentTrip as StudentTripOut } from "@/types/masters/studentTrips";
import { useStudentTrips, useCreateStudentTrip, useUpdateStudentTrip, useDeleteStudentTrip } from '@/api/hooks/masters/studentTrips';
import { PermissionGuard } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldX, Bus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import Select, { type SingleValue } from 'react-select';
import { useStudentsDropdown } from '@/api/hooks/students/admissions';
import { useRouteStops } from '@/api/hooks/masters/routeStops';
import { useTrips } from '@/api/hooks/masters/trips';
import { useFeeTermsDropdown } from '@/hooks/fee/useFeeTerms';

const formFields: FormField[] = [
    { name: "trip_id", label: "Trip", required: true },
    { name: "student_id", label: "Student", required: true },
    { name: "stop_id", label: "Stop", required: true },
    { name: "fee_term_id", label: "Fee Term", required: false },
    { name: "fee_per_term", label: "Fee Per Term", type: "number", required: true },
];

const defaultValues: StudentTripBase = {
    trip_id: "",
    student_id: "",
    stop_id: "",
    fee_term_id: "",
    fee_per_term: 0,
};

const PAGE_SIZE_DEFAULT = 10;

export default function StudentTripsPage() {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedActive, setSelectedActive] = useState<string>('');

    const { data: studentTrips = [], isLoading } = useStudentTrips();
    const createStudentTrip = useCreateStudentTrip();
    const updateStudentTrip = useUpdateStudentTrip();
    const deleteStudentTrip = useDeleteStudentTrip();

    // Fetch dropdown data
    const { data: students = [] } = useStudentsDropdown();
    const { data: routeStops = [] } = useRouteStops();
    const { data: trips = [] } = useTrips();
    const { data: feeTerms = [] } = useFeeTermsDropdown();

    // Transform data for react-select
    const studentOptions = useMemo(() => {
        return students.map(student => ({
            value: student.id,
            label: student.admission_number ? `${student?.display_name} (${student.admission_number})` : student.name
        }));
    }, [students]);

    const stopOptions = useMemo(() => {
        return routeStops.map(stop => ({
            value: stop.id,
            label: stop.name
        }));
    }, [routeStops]);

    const tripOptions = useMemo(() => {
        console.log('[DEBUG] tripOptions - trips data:', trips);
        if (!trips || !Array.isArray(trips)) {
            console.log('[DEBUG] tripOptions - returning empty array, trips:', trips);
            return [];
        }
        const options = trips.map((trip: any) => ({
            value: trip.id,
            label: `Trip ${trip.trip_number}`
        }));
        console.log('[DEBUG] tripOptions - generated options:', options);
        return options;
    }, [trips]);

    const feeTermOptions = useMemo(() => {
        return feeTerms.map(term => ({
            value: term.id,
            label: term.term_name
        }));
    }, [feeTerms]);



    // Filter data based on search and filters
    const filteredData = useMemo(() => {
        return studentTrips.filter(assignment => {
            const student = students.find(s => s.id === assignment.student_id);
            const studentName = student ? (student.admission_number ? `${student.display_name} (${student.admission_number})` : student.name) : '';
            const matchesSearch = !searchTerm ||
                studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (student?.admission_number || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesActive = selectedActive === '' || assignment.is_active === (selectedActive === 'true');

            return matchesSearch && matchesActive;
        });
    }, [studentTrips, students, searchTerm, selectedActive]);

    const total = filteredData.length;
    const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);
    const hasMore = (page + 1) * pageSize < total;

    const handlePageChange = (newPage: number) => {
        if (newPage > page && hasMore) setPage(newPage);
        if (newPage < page && page > 0) setPage(newPage);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(0);
    };

    // Helper functions to get display names
    const getStudentName = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        return student ? (student.admission_number ? `${student.display_name} (${student.admission_number})` : student.name) : `Student ${studentId}`;
    };


    const getStopName = (stopId: string) => {
        const stop = routeStops.find(s => s.id === stopId);
        return stop ? stop.name : `Stop ${stopId}`;
    };

    const getTripName = (tripId: string) => {
        if (!trips || !Array.isArray(trips)) return `Trip ${tripId}`;
        const trip = trips.find((t: any) => t.id === tripId);
        return trip ? `Trip ${trip.trip_number}` : `Trip ${tripId}`;
    };

    const getFeeTermName = (feeTermId: string) => {
        const term = feeTerms.find(t => t.id === feeTermId);
        return term ? term.term_name : `Term ${feeTermId}`;
    };


    const columns = [
        {
            key: "trip_id",
            label: "Trip",
            render: (value: string) => getTripName(value),
        },
        {
            key: "student_id",
            label: "Student",
            render: (value: string) => getStudentName(value),
        },
        {
            key: "stop_id",
            label: "Stop",
            render: (value: string) => getStopName(value),
        },
        {
            key: "fee_term_id",
            label: "Fee Term",
            render: (value: string) => getFeeTermName(value),
        },
        {
            key: "fee_per_term",
            label: "Fee Per Term",
            render: (value: number) => `₹${value.toLocaleString()}`,
        },
        {
            key: "is_active",
            label: "Active",
            render: (value: boolean) => value ? "Yes" : "No",
        },
    ];

    const renderCustomField = (field: FormField, value: any, onChange: (val: any) => void) => {
        if (field.name === 'student_id') {
            return (
                <Select
                    options={studentOptions}
                    value={studentOptions.find(option => option.value === value) || null}
                    onChange={(option: SingleValue<{ value: string; label: string }>) => onChange(option?.value || '')}
                    placeholder="Select Student"
                    className="w-full"
                    classNamePrefix="react-select"
                    menuPlacement="auto"
                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                    styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 }),
                        menu: (provided) => ({ ...provided, zIndex: 9999 }),
                        option: (provided, state) => ({
                            ...provided,
                            cursor: 'pointer',
                            backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                            color: state.isSelected ? 'white' : 'black',
                            '&:hover': {
                                backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
                            },
                        }),
                    }}
                />
            );
        }
        if (field.name === 'stop_id') {
            return (
                <Select
                    options={stopOptions}
                    value={stopOptions.find(option => option.value === value) || null}
                    onChange={(option: SingleValue<{ value: string; label: string }>) => onChange(option?.value || '')}
                    placeholder="Select Stop"
                    className="w-full"
                    classNamePrefix="react-select"
                    menuPlacement="auto"
                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                    styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 }),
                        menu: (provided) => ({ ...provided, zIndex: 9999 }),
                        option: (provided, state) => ({
                            ...provided,
                            cursor: 'pointer',
                            backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                            color: state.isSelected ? 'white' : 'black',
                            '&:hover': {
                                backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
                            },
                        }),
                    }}
                />
            );
        }
        if (field.name === 'trip_id') {
            return (
                <Select
                    options={tripOptions}
                    value={tripOptions.find(option => option.value === value) || null}
                    onChange={(option: SingleValue<{ value: string; label: string }>) => onChange(option?.value || '')}
                    placeholder="Select Trip"
                    className="w-full"
                    classNamePrefix="react-select"
                    menuPlacement="auto"
                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                    styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 }),
                        menu: (provided) => ({ ...provided, zIndex: 9999 }),
                        option: (provided, state) => ({
                            ...provided,
                            cursor: 'pointer',
                            backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                            color: state.isSelected ? 'white' : 'black',
                            '&:hover': {
                                backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
                            },
                        }),
                    }}
                />
            );
        }
        if (field.name === 'fee_term_id') {
            return (
                <Select
                    options={feeTermOptions}
                    value={feeTermOptions.find(option => option.value === value) || null}
                    onChange={(option: SingleValue<{ value: string; label: string }>) => onChange(option?.value || '')}
                    placeholder="Select Fee Term"
                    className="w-full"
                    classNamePrefix="react-select"
                    menuPlacement="auto"
                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                    styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 }),
                        menu: (provided) => ({ ...provided, zIndex: 9999 }),
                        option: (provided, state) => ({
                            ...provided,
                            cursor: 'pointer',
                            backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                            color: state.isSelected ? 'white' : 'black',
                            '&:hover': {
                                backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
                            },
                        }),
                    }}
                />
            );
        }
        return null;
    };

    const config: MasterPageConfig<StudentTripOut, StudentTripBase> = {
        title: "Student Transport Assignments",
        columns,
        defaultValues,
        formFields,
        isLoading,
        data: paginatedData,
        onCreate: (input) => createStudentTrip.mutate(input),
        onUpdate: (id, updated) => updateStudentTrip.mutate({ id: String(id), trip: updated }),
        onDelete: (id) => deleteStudentTrip.mutate(String(id)),
        isCreatePending: createStudentTrip.status === 'pending',
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
            resource: 'STUDENT_TRANSPORT',
            create: true,
            read: true,
            update: true,
            delete: true,
            list: true,
            export: true,
        },
    };

    return (
        <PermissionGuard
            resource="student_transport"
            action="list"
            fallback={
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Card className="w-full max-w-md">
                            <CardContent className="pt-6 text-center space-y-4">
                                <ShieldX className="h-16 w-16 text-muted-foreground mx-auto" />
                                <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                                <p className="text-muted-foreground mt-2">
                                    You don't have permission to view student transport assignments.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            }
        >
            <div className="p-6 space-y-6">
                <PageHeader title="Student Transport Assignments" icon={<Bus className="h-5 w-5" />} />

                {/* Filters */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium">Search by Student</label>
                                <input
                                    type="text"
                                    placeholder="Search by name or admission number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Filter by Status</label>
                                <Select
                                    options={[
                                        { value: '', label: 'All Status' },
                                        { value: 'true', label: 'Active' },
                                        { value: 'false', label: 'Inactive' },
                                    ]}
                                    value={[
                                        { value: '', label: 'All Status' },
                                        { value: 'true', label: 'Active' },
                                        { value: 'false', label: 'Inactive' },
                                    ].find(option => option.value === selectedActive)}
                                    onChange={(option: SingleValue<{ value: string; label: string }>) => setSelectedActive(option?.value || '')}
                                    placeholder="Select Status"
                                    className="mt-1"
                                    classNamePrefix="react-select"
                                    menuPlacement="auto"
                                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                                    styles={{
                                        menuPortal: base => ({ ...base, zIndex: 9999 }),
                                        menu: (provided) => ({ ...provided, zIndex: 9999 }),
                                    }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <MasterPage config={config} />
            </div>
        </PermissionGuard>
    );
}