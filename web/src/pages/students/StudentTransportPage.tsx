import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InfiniteScrollDropdown } from '@/components/dropdown/InfiniteScrollDropdown';
import ReactSelect from 'react-select';
import { useSelectStyles } from '@/lib/useSelectStyles';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Loader2, Bus, MapPin, Clock, IndianRupee, Navigation2, Truck,
  Plus, Filter, Search, X, Edit, Trash2, Tag,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';
import { useParentChildren } from '@/api/auth';
import type { TripOut, TripListResponse } from '@/types/masters/trip';
import {
  useStudentTransports,
  useStudentTransportsByStudent,
  useCreateStudentTransport,
  useUpdateStudentTransport,
  useDeleteStudentTransport,
} from '@/api/hooks/masters/studentTransport';
import { useStudentsDropdownSimple } from '@/api/hooks/students/admissions';
import { useTrips } from '@/api/hooks/masters/trips';
import { useRouteStops } from '@/api/hooks/masters/routeStops';
import { useTransportPricingDropdown } from '@/api/hooks/masters/transportPricing';
import { useQuery } from '@tanstack/react-query';
import { feeStudentMappingsApi } from '@/api/fee/studentMappings';
import { useFeeTypes } from '@/hooks/fee/useFeeTypes';
import type { StudentTransportOut, StudentTransportCreate, StudentTransportUpdate } from '@/types/masters/studentTransport';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

// ─── Role router ─────────────────────────────────────────────────────────────

const StudentTransportPage: React.FC = () => {
  const role = useAuthStore((s) => s.role);
  const studentId = useAuthStore((s) => s.studentId);
  const entityId = useAuthStore((s) => s.entityId);

  const roleName = role?.name.toLowerCase() ?? '';

  if (roleName === 'student') {
    return <StudentOwnView studentId={studentId ?? ''} />;
  }

  if (roleName === 'parent') {
    return <ParentView parentEntityId={entityId} />;
  }

  // Staff / Admin / Teacher — show management table
  return <AdminView />;
};

export default StudentTransportPage;

// ─── Admin management view ────────────────────────────────────────────────────

function AdminView() {
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTransport, setEditingTransport] = useState<StudentTransportOut | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [transportToDelete, setTransportToDelete] = useState<StudentTransportOut | null>(null);

  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canCreate = hasPermission('student_transport', 'create');
  const canUpdate = hasPermission('student_transport', 'update');
  const canDelete = hasPermission('student_transport', 'delete');

  const { data: transports = [], isLoading, isError, error } = useStudentTransports();
  const deleteMutation = useDeleteStudentTransport();

  const filtered = transports.filter((t) => {
    const studentName = t.student
      ? `${t.student.first_name} ${t.student.last_name}`.toLowerCase()
      : '';
    const route = (t.trip?.route?.route_name ?? '').toLowerCase();
    const stop = (t.stop?.name ?? '').toLowerCase();
    const q = search.toLowerCase();
    return !q || studentName.includes(q) || route.includes(q) || stop.includes(q);
  });

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'student') {
        const aName = a.student ? `${a.student.first_name} ${a.student.last_name}` : '';
        const bName = b.student ? `${b.student.first_name} ${b.student.last_name}` : '';
        cmp = aName.localeCompare(bName);
      } else if (sortKey === 'trip') {
        cmp = (a.trip?.trip_number ?? 0) - (b.trip?.trip_number ?? 0);
      } else if (sortKey === 'route') {
        cmp = (a.trip?.route?.route_name ?? '').localeCompare(b.trip?.route?.route_name ?? '');
      } else if (sortKey === 'stop') {
        cmp = (a.stop?.name ?? '').localeCompare(b.stop?.name ?? '');
      } else if (sortKey === 'fee') {
        cmp = Number(a.fee_per_term) - Number(b.fee_per_term);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') { setSortDir('desc'); }
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-75" />;
    if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 ml-1 inline" />;
    return <ChevronDown className="h-3 w-3 ml-1 inline" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading assignments...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <PageHeader title="Student Transport" icon={<Bus className="h-5 w-5" />} />
        <Card>
          <CardContent className="py-8 text-center text-destructive">
            Failed to load transport assignments: {(error as Error)?.message}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <PageHeader title="Student Transport" icon={<Bus className="h-5 w-5" />} />
      <Card>
        <CardContent className="pt-6">
          {/* Filter + action row */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-muted-foreground">Filters</span>
              {search && (
                <span className="text-xs text-muted-foreground">
                  {sortedData.length} of {transports.length}
                </span>
              )}
              {canCreate && (
                <Button size="sm" onClick={() => setIsAddOpen(true)} className="ml-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Transport
                </Button>
              )}
            </div>
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search student, route, stop..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-8 h-9"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No.</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('student')}>
                  Student<SortIcon col="student" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('trip')}>
                  Trip<SortIcon col="trip" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('route')}>
                  Route<SortIcon col="route" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('stop')}>
                  Stop<SortIcon col="stop" />
                </TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('fee')}>
                  Fee / Term<SortIcon col="fee" />
                </TableHead>
                {(canUpdate || canDelete) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={(canUpdate || canDelete) ? 8 : 7} className="text-center text-muted-foreground py-8">
                    No transport assignments found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((t, idx) => (
                  <TableRow key={t.id} style={{ height: '48px' }}>
                    <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                    <TableCell className="font-medium">
                      {t.student
                        ? `${t.student.first_name} ${t.student.last_name}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {t.trip ? `Trip #${t.trip.trip_number}` : '—'}
                    </TableCell>
                    <TableCell>
                      {t.trip?.route ? (
                        <div>
                          <p>{t.trip.route.route_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.trip.route.starting_stop} → {t.trip.route.ending_stop}
                          </p>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {t.stop ? `${t.stop.name} (#${t.stop.number})` : '—'}
                    </TableCell>
                    <TableCell>
                      {t.pricing ? (
                        <div>
                          <p className="text-sm">{t.pricing.cycle_name}</p>
                          <p className="text-xs text-muted-foreground">₹{Number(t.pricing.amount).toLocaleString()}</p>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>₹{Number(t.fee_per_term).toLocaleString()}</TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="text-right">
                        {canUpdate && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit" onClick={() => setEditingTransport(t)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                            title="Delete"
                            onClick={() => setTransportToDelete(t)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AssignTransportDialog open={isAddOpen} onOpenChange={setIsAddOpen} />

      <ConfirmDialog
        open={!!transportToDelete}
        onOpenChange={(open) => { if (!open) setTransportToDelete(null); }}
        title="Delete Transport Assignment"
        description="Are you sure you want to delete this transport assignment? This action cannot be undone."
        confirmLabel="Delete"
        pendingLabel="Deleting..."
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (transportToDelete) {
            deleteMutation.mutate(transportToDelete.id, { onSuccess: () => setTransportToDelete(null) });
          }
        }}
      />

      {editingTransport && (
        <AssignTransportDialog
          open={!!editingTransport}
          onOpenChange={(open) => { if (!open) setEditingTransport(null); }}
          transport={editingTransport}
        />
      )}
    </div>
  );
}

// ─── Assign / Edit transport dialog ──────────────────────────────────────────

interface AssignTransportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transport?: StudentTransportOut;
}

function AssignTransportDialog({ open, onOpenChange, transport }: AssignTransportDialogProps) {
  const isEdit = !!transport;
  const selectStyles = useSelectStyles();
  const createMutation = useCreateStudentTransport();
  const updateMutation = useUpdateStudentTransport();

  const { data: students = [] } = useStudentsDropdownSimple();
  const tripsQuery = useTrips();
  const trips: TripOut[] = Array.isArray(tripsQuery.data)
    ? (tripsQuery.data as TripOut[])
    : ((tripsQuery.data as TripListResponse)?.items ?? []);
  const { data: stops = [] } = useRouteStops(false);

  const [studentId, setStudentId] = useState('');
  const [tripId, setTripId] = useState('');
  const [stopId, setStopId] = useState('');
  const [feePerTerm, setFeePerTerm] = useState('');
  const [pricingId, setPricingId] = useState('');
  const [feeSource, setFeeSource] = useState<'stop' | 'student' | 'pricing' | ''>('');

  // Derive vehicleId from selected trip for pricing dropdown
  const selectedTrip = trips.find(t => t.id === tripId);
  const vehicleId = selectedTrip?.vehicle_id;
  const { data: pricingOptions = [] } = useTransportPricingDropdown(vehicleId);

  // ── Auto-fill Fee per Term from the student's assigned transport fee ─────────
  // Identify which fee types count as "transport" (by category or name).
  const { data: feeTypes = [] } = useFeeTypes();
  const transportFeeTypeIds = useMemo(
    () => new Set(
      feeTypes
        .filter(ft => /transport|bus/i.test(`${ft.fee_category_name ?? ''} ${ft.type_name ?? ''}`))
        .map(ft => ft.id)
    ),
    [feeTypes]
  );

  // Fetch the selected student's fee mappings (create mode only).
  const { data: studentMappingsRaw } = useQuery({
    queryKey: ['fee-student-mappings', 'for-transport', studentId],
    queryFn: () => feeStudentMappingsApi.getAllMappings({ student_id: studentId }),
    enabled: !!studentId && !isEdit,
    staleTime: 5 * 60 * 1000,
  });

  const transportFee = useMemo(() => {
    const list = Array.isArray(studentMappingsRaw) ? studentMappingsRaw : (studentMappingsRaw?.items ?? []);
    const match = list.find((m: any) => transportFeeTypeIds.has(m.fee_type_id))
      ?? list.find((m: any) => /transport|bus/i.test(m.fee_type_name ?? ''));
    return match ? Number(match.total_fee) : null;
  }, [studentMappingsRaw, transportFeeTypeIds]);

  // Prefill Fee per Term when a transport fee is found for the selected student.
  useEffect(() => {
    if (isEdit || transportFee == null) return;
    setFeePerTerm(String(transportFee));
    setFeeSource('student');
  }, [studentId, transportFee, isEdit]);

  useEffect(() => {
    if (open) {
      setStudentId(transport?.student_id ?? '');
      setTripId(transport?.trip_id ?? '');
      setStopId(transport?.stop_id ?? '');
      setFeePerTerm(transport?.fee_per_term?.toString() ?? '');
      setPricingId(transport?.pricing_id ?? '');
      setFeeSource('');
    }
  }, [open, transport]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSubmit = tripId && stopId && feePerTerm && (isEdit || studentId);

  const handleSubmit = () => {
    const fee = parseFloat(feePerTerm);
    if (!canSubmit || isNaN(fee) || fee <= 0) return;

    if (isEdit && transport) {
      const updateData: StudentTransportUpdate = {};
      if (tripId !== transport.trip_id) updateData.trip_id = tripId;
      if (stopId !== transport.stop_id) updateData.stop_id = stopId;
      if (fee !== Number(transport.fee_per_term)) updateData.fee_per_term = fee;
      if ((pricingId || null) !== (transport.pricing_id || null)) updateData.pricing_id = pricingId || null;
      updateMutation.mutate(
        { id: transport.id, transport: updateData },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      const createData: StudentTransportCreate = {
        student_id: studentId,
        trip_id: tripId,
        stop_id: stopId,
        fee_per_term: fee,
        pricing_id: pricingId || null,
      };
      createMutation.mutate(createData, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Assignment' : 'Assign Transport'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!isEdit && (
            <div className="space-y-2">
              <Label>Student</Label>
              <ReactSelect
                options={students.map(s => ({ value: s.id, label: s.name }))}
                value={studentId ? { value: studentId, label: students.find(s => s.id === studentId)?.name ?? '' } : null}
                onChange={opt => setStudentId(opt?.value ?? '')}
                placeholder="Select student..."
                isClearable
                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                styles={selectStyles}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Trip</Label>
            <ReactSelect
              options={trips.map(t => ({ value: t.id, label: `Trip #${t.trip_number}` }))}
              value={tripId ? { value: tripId, label: `Trip #${trips.find(t => t.id === tripId)?.trip_number ?? ''}` } : null}
              onChange={opt => setTripId(opt?.value ?? '')}
              placeholder="Select trip..."
              isClearable
              menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
              styles={selectStyles}
            />
          </div>

          <div className="space-y-2">
            <Label>Stop</Label>
            <ReactSelect
              options={stops.map(s => ({ value: s.id, label: `#${s.number} – ${s.name}` }))}
              value={stopId ? { value: stopId, label: (() => { const s = stops.find(s => s.id === stopId); return s ? `#${s.number} – ${s.name}` : ''; })() } : null}
              onChange={opt => {
                const newStopId = opt?.value ?? '';
                setStopId(newStopId);
                if (newStopId && !pricingId) {
                  const selectedStop = stops.find(s => s.id === newStopId);
                  if (selectedStop?.fees != null && selectedStop.fees > 0) {
                    setFeePerTerm(String(selectedStop.fees));
                    setFeeSource('stop');
                  }
                }
              }}
              placeholder="Select stop..."
              isClearable
              menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
              styles={selectStyles}
            />
          </div>

          {pricingOptions.length > 0 && (
            <div className="space-y-2">
              <Label>Pricing Plan (optional)</Label>
              <InfiniteScrollDropdown
                data={[{id:'',value:'',label:'None'}, ...pricingOptions.map(p => ({ id: p.id, value: p.id, label: `${p.cycle_name} — ₹${Number(p.amount).toLocaleString()}` }))]}
                value={pricingId}
                onChange={(val) => {
                  setPricingId(val as string);
                  const selected = pricingOptions.find(p => p.id === val);
                  if (selected) {
                    setFeePerTerm(String(selected.amount));
                    setFeeSource('pricing');
                  }
                }}
                placeholder="Select pricing..."
                clearable={false}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Fee per Term (₹)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={feePerTerm}
              onChange={(e) => setFeePerTerm(e.target.value)}
              placeholder="e.g. 1500"
            />
            {!isEdit && feeSource === 'stop' && (
              <p className="text-xs text-green-600">
                Auto-filled from stop fee. You can edit it if needed.
              </p>
            )}
            {!isEdit && feeSource === 'student' && transportFee != null && (
              <p className="text-xs text-green-600">
                Auto-loaded from the student's assigned transport fee (₹{transportFee.toLocaleString()}). You can edit it if needed.
              </p>
            )}
            {!isEdit && feeSource === 'pricing' && (
              <p className="text-xs text-green-600">
                Auto-filled from selected pricing plan. You can edit it if needed.
              </p>
            )}
            {!isEdit && studentId && !feePerTerm && feeSource === '' && (
              <p className="text-xs text-muted-foreground">
                No transport fee assigned to this stop or student — enter the amount manually.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending || !canSubmit}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? 'Save Changes' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Student own transport view ───────────────────────────────────────────────

function StudentOwnView({ studentId }: { studentId: string }) {
  const { data: transports = [], isLoading } = useStudentTransportsByStudent(studentId);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <PageHeader title="My Transport" icon={<Bus className="h-5 w-5" />} />
      <TransportList transports={transports} isLoading={isLoading} />
    </div>
  );
}

// ─── Parent child transport view ──────────────────────────────────────────────

function ParentView({ parentEntityId }: { parentEntityId: string | null }) {
  const { data: children = [], isLoading: childrenLoading, error: childrenError } = useParentChildren(parentEntityId);
  const [selectedChildId, setSelectedChildId] = useState('');

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const { data: transports = [], isLoading: transportLoading } = useStudentTransportsByStudent(selectedChildId);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <PageHeader title="Children's Transport" icon={<Bus className="h-5 w-5" />} />

      <Card>
        <CardHeader><CardTitle>Select Child</CardTitle></CardHeader>
        <CardContent>
          {!parentEntityId ? (
            <div className="text-center py-4 text-muted-foreground">
              Session outdated. Please log out and log back in.
            </div>
          ) : childrenLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading children...</span>
            </div>
          ) : childrenError ? (
            <div className="text-center py-4 text-destructive">
              Failed to load children: {(childrenError as Error).message}
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No children found for this account.
            </div>
          ) : (
            <div className="space-y-2 max-w-xs">
              <Label>Child</Label>
              <InfiniteScrollDropdown
                data={children.map(c => ({ id: c.id, value: c.id, label: c.name || `${c.first_name} ${c.last_name}`.trim() }))}
                value={selectedChildId}
                onChange={(v) => setSelectedChildId(v as string)}
                placeholder="Select child"
                clearable={false}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {selectedChild && (
        <TransportList
          transports={transports}
          isLoading={transportLoading}
          title={`${selectedChild.name || `${selectedChild.first_name} ${selectedChild.last_name}`.trim()}'s Transport`}
        />
      )}
    </div>
  );
}

// ─── Shared transport record list (student / parent view) ─────────────────────

function TransportList({
  transports,
  isLoading,
  title = 'Transport Assignment',
}: {
  transports: StudentTransportOut[];
  isLoading: boolean;
  title?: string;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading transport...</span>
        </CardContent>
      </Card>
    );
  }

  if (transports.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No transport assignment found.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {transports.map((t) => (
          <div key={t.id} className="border rounded-lg p-4 space-y-3">
            {/* Header: Trip # */}
            <div className="flex items-center gap-2 font-medium">
              <Bus className="h-4 w-4 text-muted-foreground" />
              {t.trip ? `Trip #${t.trip.trip_number}` : 'Transport Assignment'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {t.trip?.route && (
                <div className="flex items-start gap-2">
                  <Navigation2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Route</p>
                    <p className="font-medium">{t.trip.route.route_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.trip.route.starting_stop} → {t.trip.route.ending_stop}
                    </p>
                  </div>
                </div>
              )}

              {t.trip?.route && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Timings</p>
                    <p className="font-medium">
                      {t.trip.route.start_time.substring(0, 5)} – {t.trip.route.end_time.substring(0, 5)}
                    </p>
                    <p className="text-xs text-muted-foreground">Departure – Arrival</p>
                  </div>
                </div>
              )}

              {t.trip?.vehicle && (
                <div className="flex items-start gap-2">
                  <Truck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Vehicle</p>
                    <p className="font-medium">{t.trip.vehicle.registration_number}</p>
                    <p className="text-xs text-muted-foreground">{t.trip.vehicle.vehicle_type}</p>
                  </div>
                </div>
              )}

              {t.stop && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Pickup Stop</p>
                    <p className="font-medium">{t.stop.name}</p>
                    <p className="text-xs text-muted-foreground">Stop #{t.stop.number}</p>
                  </div>
                </div>
              )}

              {(t.stop?.pickup_time || t.stop?.reaching_time) && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Pickup Time</p>
                    <p className="font-medium">
                      {(t.stop.pickup_time || t.stop.reaching_time)!.substring(0, 5)}
                    </p>
                  </div>
                </div>
              )}

              {t.stop?.drop_time && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Drop Time</p>
                    <p className="font-medium">{t.stop.drop_time.substring(0, 5)}</p>
                  </div>
                </div>
              )}

              {t.pricing && (
                <div className="flex items-start gap-2">
                  <Tag className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-muted-foreground text-xs">Pricing Plan</p>
                    <p className="font-medium">{t.pricing.cycle_name}</p>
                    <p className="text-xs text-muted-foreground">₹{Number(t.pricing.amount).toLocaleString()}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <IndianRupee className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Fee per Term</p>
                  <p className="font-medium">₹{Number(t.fee_per_term).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
