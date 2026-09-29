import React, { useState, useEffect, useMemo } from "react";

import { MasterPage } from "../masters/common/MasterPage";
import type { MasterPageConfig, FormField } from "../masters/common/MasterPage";
import type { Route, RouteInput } from "@/types/masters/route";
import { useRoutes, useCreateRoute, useUpdateRoute, useDeleteRoute } from '@/api/hooks/masters/routes';
import { useRouteStops, useCreateRouteStop, useUpdateRouteStopPartial, useDeleteRouteStop } from '@/api/hooks/masters/routeStops';
import type { RouteStop } from '@/types/masters/routeStop';
import { PermissionGuard } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ShieldX, Loader2, Plus, Trash2, Eye, Edit, Check, X } from 'lucide-react';
import { TimePicker } from '@/components/ui/TimePicker';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { InfiniteScrollDropdown } from '@/components/dropdown/InfiniteScrollDropdown';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

const createColumns = (onView: (routeId: string) => void) => [
    { key: "route_name", label: "Route Name", editable: true },
    { key: "starting_stop", label: "Starting Point", editable: true },
    { key: "ending_stop", label: "Ending Point", editable: true },
    { key: "number_of_stops", label: "Number of Stops", editable: true },
    {
        key: "start_time",
        label: "Up Journey Time",
        editable: true,
        render: (value: string) => value ? value.substring(0, 5) : 'N/A',
        renderEdit: (value: any, _row: Route, onChange: (val: any) => void) => (
            <TimePicker value={value ? value.substring(0, 5) : ''} onChange={onChange} />
        )
    },
    {
        key: "end_time",
        label: "Down Journey Time",
        editable: true,
        render: (value: string) => value ? value.substring(0, 5) : 'N/A',
        renderEdit: (value: any, _row: Route, onChange: (val: any) => void) => (
            <TimePicker value={value ? value.substring(0, 5) : ''} onChange={onChange} />
        )
    },
    {
        key: "is_active",
        label: "Active",
        editable: true,
        render: (v: boolean) => <StatusBadge status={v} />,
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
    {
        key: "id",
        label: "Stops",
        editable: false,
        render: (_value: string, row: Route) => (
            <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => onView(row.id)}
            >
                <Eye className="h-3.5 w-3.5" /> View
            </Button>
        ),
    },
];

const formFields: FormField[] = [];

const defaultValues: RouteInput = {
    route_name: "",
    starting_stop: "",
    ending_stop: "",
    number_of_stops: 0,
    route_type: '',
    trip_type: '',
    start_time: "07:00:00",
    end_time: "08:30:00",
    is_active: true,
};

const PAGE_SIZE_DEFAULT = 5;

// ── Pending stop row type ─────────────────────────────────────────────────────
interface PendingRow {
    _key: number;
    name: string;
    fees: string;
    pickup_time: string;
    drop_time: string;
}

// ── Add Route Dialog (route fields + inline stops) ────────────────────────────
function RouteAddDialog() {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState<RouteInput>(defaultValues);
    const [pendingStops, setPendingStops] = useState<PendingRow[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const createRoute = useCreateRoute();
    const createStop = useCreateRouteStop();

    // Auto-sync stop rows with number_of_stops field
    useEffect(() => {
        const count = Math.max(0, Number(formData.number_of_stops) || 0);
        setPendingStops(prev => {
            if (prev.length === count) return prev;
            if (prev.length < count) {
                const toAdd = count - prev.length;
                const newRows: PendingRow[] = Array.from({ length: toAdd }, (_, i) => ({
                    _key: Date.now() + i,
                    name: '',
                    fees: '',
                    pickup_time: '07:00',
                    drop_time: '08:30',
                }));
                return [...prev, ...newRows];
            }
            return prev.slice(0, count);
        });
    }, [formData.number_of_stops]);

    function updateStop(key: number, field: keyof Omit<PendingRow, '_key'>, value: string) {
        setPendingStops(prev => prev.map(s => s._key === key ? { ...s, [field]: value } : s));
    }

    function removeStop(key: number) {
        const newStops = pendingStops.filter(s => s._key !== key);
        setPendingStops(newStops);
        setFormData(prev => ({ ...prev, number_of_stops: newStops.length }));
    }

    function handleClose() {
        setOpen(false);
        setFormData(defaultValues);
        setPendingStops([]);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                route_type: formData.route_type || null,
                trip_type: formData.trip_type || null,
            };
            const newRoute = await createRoute.mutateAsync(payload as any);
            const validStops = pendingStops.filter(s => s.name.trim());
            for (let i = 0; i < validStops.length; i++) {
                const stop = validStops[i];
                await createStop.mutateAsync({
                    route_id: newRoute.id,
                    name: stop.name.trim(),
                    number: i + 1,
                    reaching_time: stop.pickup_time.length === 5 ? stop.pickup_time + ':00' : stop.pickup_time,
                    pickup_time: stop.pickup_time.length === 5 ? stop.pickup_time + ':00' : stop.pickup_time,
                    drop_time: stop.drop_time.length === 5 ? stop.drop_time + ':00' : stop.drop_time,
                    fees: parseFloat(stop.fees) || 0,
                    is_active: true,
                });
            }
            handleClose();
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />}
            <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); else setOpen(true); }} modal={false}>
                <DialogTrigger asChild>
                    <Button>Add Route</Button>
                </DialogTrigger>
                <DialogContent className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Add New Route</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                        <div className="flex-1 overflow-y-auto pr-1 space-y-5">

                            {/* Route details grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label htmlFor="route_name">Route Name <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="route_name"
                                        placeholder="Enter route name"
                                        value={formData.route_name}
                                        onChange={e => setFormData(p => ({ ...p, route_name: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="starting_stop">Starting Point <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="starting_stop"
                                        placeholder="Starting point"
                                        value={formData.starting_stop}
                                        onChange={e => setFormData(p => ({ ...p, starting_stop: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="ending_stop">Ending Point <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="ending_stop"
                                        placeholder="Ending point"
                                        value={formData.ending_stop}
                                        onChange={e => setFormData(p => ({ ...p, ending_stop: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="number_of_stops">Number of Stops</Label>
                                    <Input
                                        id="number_of_stops"
                                        type="number"
                                        min={0}
                                        value={formData.number_of_stops}
                                        onChange={e => setFormData(p => ({ ...p, number_of_stops: Number(e.target.value) }))}
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    id="is_active"
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                                    className="w-4 h-4"
                                />
                                <Label htmlFor="is_active">Active</Label>
                            </div>

                            {/* Stops section */}
                            <div className="border rounded-md">
                                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                                    <span className="text-sm font-medium">
                                        Route Stops
                                        <span className="ml-1 text-muted-foreground font-normal text-xs">
                                            (auto-filled from "Number of Stops")
                                        </span>
                                    </span>
                                    <Badge variant="secondary" className="text-xs">{pendingStops.length} stop{pendingStops.length !== 1 ? 's' : ''}</Badge>
                                </div>

                                {pendingStops.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">
                                        Enter a number in "Number of Stops" to add stop rows.
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Stop Name</TableHead>
                                                <TableHead className="w-32">Amount (₹/yr)</TableHead>
                                                <TableHead className="w-36">Up Journey Time</TableHead>
                                                <TableHead className="w-36">Down Journey Time</TableHead>
                                                <TableHead className="w-24 text-center">Remove</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingStops.map(stop => (
                                                <TableRow key={stop._key}>
                                                    <TableCell className="py-2">
                                                        <Input
                                                            className="h-8 text-sm"
                                                            placeholder="Stop name"
                                                            value={stop.name}
                                                            onChange={e => updateStop(stop._key, 'name', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            className="h-8 text-sm"
                                                            placeholder="0"
                                                            value={stop.fees}
                                                            onChange={e => updateStop(stop._key, 'fees', e.target.value)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <TimePicker
                                                            value={stop.pickup_time}
                                                            onChange={v => updateStop(stop._key, 'pickup_time', v)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <TimePicker
                                                            value={stop.drop_time}
                                                            onChange={v => updateStop(stop._key, 'drop_time', v)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="py-2 text-center">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="destructive"
                                                            className="h-7 text-xs px-3"
                                                            onClick={() => removeStop(stop._key)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="shrink-0 pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Add Route
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

// ── Route Stops Manager (view/manage stops for existing routes) ───────────────
function RouteStopsManager({
    routes,
    selectedRouteId,
    onSelectRoute,
}: {
    routes: Route[];
    selectedRouteId: string;
    onSelectRoute: (id: string) => void;
}) {

    const { data: allStops = [], isLoading } = useRouteStops(false);
    const deleteMutation = useDeleteRouteStop();
    const updateStopMutation = useUpdateRouteStopPartial();
    const createStopMutation = useCreateRouteStop();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<{ name: string; fees: string; pickup_time: string; drop_time: string }>({
        name: '', fees: '', pickup_time: '', drop_time: '',
    });

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addDraft, setAddDraft] = useState({
        name: '', number: '', fees: '', pickup_time: '', drop_time: '', is_active: true,
    });

    const sortedStops = allStops
        .filter(s => s.route_id === selectedRouteId)
        .sort((a, b) => a.number - b.number);

    function openAddDialog() {
        setAddDraft({
            name: '',
            number: String(sortedStops.length + 1),
            fees: '',
            pickup_time: '',
            drop_time: '',
            is_active: true,
        });
        setIsAddOpen(true);
    }

    function submitAddStop() {
        if (!selectedRouteId || !addDraft.name.trim() || !addDraft.number) return;
        const pickupTime = addDraft.pickup_time.length === 5 ? addDraft.pickup_time + ':00' : addDraft.pickup_time;
        const dropTime = addDraft.drop_time.length === 5 ? addDraft.drop_time + ':00' : addDraft.drop_time;
        createStopMutation.mutate(
            {
                route_id: selectedRouteId,
                name: addDraft.name.trim(),
                number: parseInt(addDraft.number, 10),
                reaching_time: pickupTime || '00:00:00',
                pickup_time: pickupTime || undefined,
                drop_time: dropTime || undefined,
                fees: parseFloat(addDraft.fees) || 0,
                is_active: addDraft.is_active,
            },
            { onSuccess: () => setIsAddOpen(false) }
        );
    }

    function startEdit(stop: RouteStop) {
        setEditingId(stop.id);
        setEditDraft({
            name: stop.name,
            fees: String(stop.fees ?? 0),
            pickup_time: stop.pickup_time ? stop.pickup_time.substring(0, 5) : '',
            drop_time: stop.drop_time ? stop.drop_time.substring(0, 5) : '',
        });
    }

    function cancelEdit() {
        setEditingId(null);
    }

    function saveEdit(stop: RouteStop) {
        updateStopMutation.mutate(
            {
                id: stop.id,
                routeStop: {
                    name: editDraft.name.trim(),
                    fees: parseFloat(editDraft.fees) || 0,
                    pickup_time: editDraft.pickup_time.length === 5 ? editDraft.pickup_time + ':00' : editDraft.pickup_time,
                    drop_time: editDraft.drop_time.length === 5 ? editDraft.drop_time + ':00' : editDraft.drop_time,
                },
            },
            { onSuccess: () => setEditingId(null) }
        );
    }

    return (
        <Card>
            <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-medium shrink-0">Route Name:</span>
                    <InfiniteScrollDropdown
                        className="flex-1 max-w-sm"
                        data={routes.map(r => ({ id: r.id, label: r.route_name, value: r.id }))}
                        value={selectedRouteId}
                        onChange={(val) => onSelectRoute(String(val))}
                        placeholder="Select a route to view stops..."
                        clearable={false}
                    />
                    <PermissionGuard resource="route_stops" action="create">
                        <Button size="sm" className="h-9" disabled={!selectedRouteId} onClick={openAddDialog}>
                            <Plus className="h-4 w-4 mr-1" /> Add Stop
                        </Button>
                    </PermissionGuard>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen} modal={false}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Stop</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="add-stop-name">Stop Name <span className="text-destructive">*</span></Label>
                                <Input
                                    id="add-stop-name"
                                    value={addDraft.name}
                                    onChange={e => setAddDraft(d => ({ ...d, name: e.target.value }))}
                                    placeholder="Stop name"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="add-stop-number">Stop Number <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="add-stop-number"
                                        type="number"
                                        min={1}
                                        value={addDraft.number}
                                        onChange={e => setAddDraft(d => ({ ...d, number: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="add-stop-fees">Amount (₹/yr)</Label>
                                    <Input
                                        id="add-stop-fees"
                                        type="number"
                                        min={0}
                                        value={addDraft.fees}
                                        onChange={e => setAddDraft(d => ({ ...d, fees: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Up Journey Time <span className="text-destructive">*</span></Label>
                                    <TimePicker
                                        value={addDraft.pickup_time}
                                        onChange={v => setAddDraft(d => ({ ...d, pickup_time: v }))}
                                    />
                                </div>
                                <div>
                                    <Label>Down Journey Time</Label>
                                    <TimePicker
                                        value={addDraft.drop_time}
                                        onChange={v => setAddDraft(d => ({ ...d, drop_time: v }))}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    id="add-stop-active"
                                    type="checkbox"
                                    className="w-4 h-4"
                                    checked={addDraft.is_active}
                                    onChange={e => setAddDraft(d => ({ ...d, is_active: e.target.checked }))}
                                />
                                <Label htmlFor="add-stop-active" className="cursor-pointer">Active</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                onClick={submitAddStop}
                                disabled={createStopMutation.isPending || !addDraft.name.trim() || !addDraft.number}
                            >
                                {createStopMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : null}
                                Add Stop
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {!selectedRouteId && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Select a route to view its stops.
                    </p>
                )}

                {selectedRouteId && isLoading && (
                    <div className="flex justify-center items-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Loading stops...</span>
                    </div>
                )}

                {selectedRouteId && !isLoading && sortedStops.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No stops for this route.
                    </p>
                )}

                {selectedRouteId && !isLoading && sortedStops.length > 0 && (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">S.No.</TableHead>
                                <TableHead>Stop Name</TableHead>
                                <TableHead className="w-36">Amount (₹/yr)</TableHead>
                                <TableHead className="w-36">Up Journey Time</TableHead>
                                <TableHead className="w-36">Down Journey Time</TableHead>
                                <TableHead className="w-32 text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedStops.map((stop, idx) => {
                                const isEditing = editingId === stop.id;
                                return (
                                    <TableRow key={stop.id}>
                                        <TableCell className="text-sm">{idx + 1}</TableCell>
                                        <TableCell className="py-2">
                                            {isEditing ? (
                                                <Input
                                                    className="h-8 text-sm"
                                                    value={editDraft.name}
                                                    onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))}
                                                />
                                            ) : (
                                                <span className="text-sm font-medium">{stop.name}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="h-8 text-sm"
                                                    value={editDraft.fees}
                                                    onChange={e => setEditDraft(d => ({ ...d, fees: e.target.value }))}
                                                />
                                            ) : (
                                                <span className="text-sm">₹{stop.fees?.toLocaleString('en-IN') ?? 0}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {isEditing ? (
                                                <TimePicker
                                                    value={editDraft.pickup_time}
                                                    onChange={v => setEditDraft(d => ({ ...d, pickup_time: v }))}
                                                />
                                            ) : (
                                                <span className="text-sm">{stop.pickup_time?.substring(0, 5) ?? '—'}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {isEditing ? (
                                                <TimePicker
                                                    value={editDraft.drop_time}
                                                    onChange={v => setEditDraft(d => ({ ...d, drop_time: v }))}
                                                />
                                            ) : (
                                                <span className="text-sm">{stop.drop_time?.substring(0, 5) ?? '—'}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {isEditing ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-primary"
                                                        disabled={updateStopMutation.isPending}
                                                        onClick={() => saveEdit(stop)}
                                                    >
                                                        {updateStopMutation.isPending ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Check className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0"
                                                        disabled={updateStopMutation.isPending}
                                                        onClick={cancelEdit}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => startEdit(stop)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                        disabled={deleteMutation.isPending}
                                                        onClick={() => deleteMutation.mutate(stop.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

// ── Routes Page ───────────────────────────────────────────────────────────────
export default function RoutesPage() {
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewRouteId, setViewRouteId] = useState('');
    const stopsRef = React.useRef<HTMLDivElement>(null);

    const { data: routes = [], isLoading } = useRoutes();
    const updateRoute = useUpdateRoute();
    const deleteRoute = useDeleteRoute();

    const handleViewStops = (routeId: string) => {
        setViewRouteId(routeId);
        setTimeout(() => stopsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    };

    const columns = createColumns(handleViewStops);

    // Filter the full route list first, then paginate the filtered result —
    // searching must scan all routes, not just the ones on the current page.
    const filteredRoutes = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return routes;
        return routes.filter((route) =>
            columns.some((col) => {
                const val = (route as any)[col.key as string];
                if (val !== null && val !== undefined && String(val).toLowerCase().includes(q)) return true;
                if (col.render) {
                    const rendered = col.render(val, route);
                    if ((typeof rendered === 'string' || typeof rendered === 'number') && String(rendered).toLowerCase().includes(q)) return true;
                }
                return false;
            })
        );
    }, [routes, searchQuery, columns]);

    const total = filteredRoutes.length;
    const paginatedData = filteredRoutes.slice(page * pageSize, (page + 1) * pageSize);
    const hasMore = (page + 1) * pageSize < total;

    const handlePageChange = (newPage: number) => {
        if (newPage > page && hasMore) setPage(newPage);
        if (newPage < page && page > 0) setPage(newPage);
    };

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(0);
    };

    const handleSearchChange = (q: string) => {
        setSearchQuery(q);
        setPage(0);
    };

    const config: MasterPageConfig<Route, RouteInput> = {
        title: "Routes",
        columns,
        defaultValues,
        formFields,
        isLoading,
        data: paginatedData,
        addModal: <RouteAddDialog />,
        onCreate: () => {},
        onUpdate: (id, route) => updateRoute.mutate({ id: (id as any).toString(), route }),
        onDelete: (id) => deleteRoute.mutate((id as any).toString()),
        isCreatePending: false,
        resetForm: () => {},
        onSearchChange: handleSearchChange,
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
            <div className="space-y-6">
                <MasterPage config={config as any} />
                <div ref={stopsRef}>
                    <RouteStopsManager
                        routes={routes}
                        selectedRouteId={viewRouteId}
                        onSelectRoute={setViewRouteId}
                    />
                </div>
            </div>
        </PermissionGuard>
    );
}
